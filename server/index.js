import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import {
  clearSession,
  createPasswordResetToken,
  createSession,
  createUser,
  deleteExpiredPasswordResetTokens,
  deleteExpiredSessions,
  findUserByEmail,
  getAuthenticatedUser,
  resetPasswordWithToken,
  validatePassword,
  validateRegistration,
  verifyPassword,
} from './auth.js'
import { closeDatabase, database } from './database.js'

const port = Number(process.env.PORT) || 3000
const distDirectory = resolve('./dist')
const maxBodyBytes = 30 * 1024 * 1024
const loginFailures = new Map()
const loginWindowMs = 15 * 60 * 1000
const maxLoginFailures = 10
const dummyPasswordHash = `scrypt:${'00'.repeat(16)}:${'00'.repeat(64)}`
const allowedOrigins = new Set(
  String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
)

const getApplicationOrigin = (request) => {
  const configuredOrigin = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '')
  if (configuredOrigin) return configuredOrigin
  const forwardedProtocol = String(request.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const protocol = forwardedProtocol || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  return `${protocol}://${request.headers.host || `localhost:${port}`}`
}

const buildPasswordResetUrl = (request, token) => {
  const url = new URL('/reset-password', getApplicationOrigin(request))
  url.searchParams.set('token', token)
  return url.toString()
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

const sendJson = (response, status, payload, headers = {}) => {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers,
  })
  response.end(body)
}

const readJson = async (request) => {
  if (!String(request.headers['content-type'] || '').startsWith('application/json')) {
    const error = new Error('Le corps doit être envoyé en JSON.')
    error.status = 415
    throw error
  }

  const chunks = []
  let size = 0
  for await (const chunk of request) {
    size += chunk.length
    if (size > maxBodyBytes) {
      const error = new Error('La sauvegarde dépasse la taille maximale autorisée.')
      error.status = 413
      throw error
    }
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    const error = new Error('Le JSON envoyé est invalide.')
    error.status = 400
    throw error
  }
}

const requestOriginIsAllowed = (request) => {
  const origin = request.headers.origin
  if (!origin) return true
  if (allowedOrigins.has(origin)) return true
  try {
    return new URL(origin).host === request.headers.host
  } catch {
    return false
  }
}

const requireUser = (request, response) => {
  const user = getAuthenticatedUser(request)
  if (!user) sendJson(response, 401, { error: 'Authentification requise.' })
  return user
}

const requireAdmin = (request, response) => {
  const user = requireUser(request, response)
  if (!user) return null
  if (user.role !== 'admin') {
    sendJson(response, 403, { error: 'Accès administrateur requis.' })
    return null
  }
  return user
}

const getWorkspaceAccess = (userId, workspaceId) => {
  if (userId === workspaceId) return { role: 'owner' }
  return database.prepare(`
    SELECT role FROM workspace_members
    WHERE workspace_owner_id = ? AND member_user_id = ?
  `).get(workspaceId, userId) || null
}

const serializeWorkspace = (owner, role, workspace, memberCount = 0) => ({
  id: owner.id,
  role,
  owner: {
    id: owner.id,
    displayName: owner.display_name,
    email: owner.email,
  },
  revision: Number(workspace?.revision) || 0,
  updatedAt: workspace?.updated_at || null,
  memberCount: Number(memberCount) || 0,
})

const getLoginAttemptKey = (request, email) => {
  const address = request.socket.remoteAddress || 'unknown'
  return `${address}:${String(email || '').trim().toLowerCase()}`
}

const loginIsTemporarilyBlocked = (key) => {
  const attempt = loginFailures.get(key)
  if (!attempt) return false
  if (Date.now() - attempt.startedAt > loginWindowMs) {
    loginFailures.delete(key)
    return false
  }
  return attempt.count >= maxLoginFailures
}

const recordLoginFailure = (key) => {
  const current = loginFailures.get(key)
  if (!current || Date.now() - current.startedAt > loginWindowMs) {
    loginFailures.set(key, { count: 1, startedAt: Date.now() })
    return
  }
  current.count += 1
}

const handleApi = async (request, response, pathname) => {
  if (!requestOriginIsAllowed(request)) {
    sendJson(response, 403, { error: 'Origine non autorisée.' })
    return
  }

  if (request.method === 'GET' && pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok' })
    return
  }

  if (request.method === 'GET' && pathname === '/api/auth/session') {
    sendJson(response, 200, { user: getAuthenticatedUser(request) })
    return
  }

  if (request.method === 'POST' && pathname === '/api/auth/register') {
    const input = validateRegistration(await readJson(request))
    if (input.error) {
      sendJson(response, 400, { error: input.error })
      return
    }
    if (findUserByEmail(input.email)) {
      sendJson(response, 409, { error: 'Un compte utilise déjà cette adresse email.' })
      return
    }
    const user = await createUser(input)
    const session = createSession(user.id)
    sendJson(response, 201, { user }, { 'Set-Cookie': session.cookie })
    return
  }

  if (request.method === 'POST' && pathname === '/api/auth/login') {
    const input = await readJson(request)
    const attemptKey = getLoginAttemptKey(request, input.email)
    if (loginIsTemporarilyBlocked(attemptKey)) {
      sendJson(response, 429, {
        error: 'Trop de tentatives. Attends 15 minutes avant de réessayer.',
      })
      return
    }
    const userRecord = findUserByEmail(input.email)
    const passwordIsValid = await verifyPassword(
      String(input.password || '').slice(0, 256),
      userRecord?.password_hash || dummyPasswordHash,
    )
    if (!userRecord || userRecord.disabled_at || !passwordIsValid) {
      recordLoginFailure(attemptKey)
      sendJson(response, 401, { error: 'Email ou mot de passe incorrect.' })
      return
    }
    loginFailures.delete(attemptKey)
    const session = createSession(userRecord.id)
    sendJson(response, 200, {
      user: {
        id: userRecord.id,
        email: userRecord.email,
        displayName: userRecord.display_name,
        createdAt: userRecord.created_at,
        role: userRecord.role || 'user',
      },
    }, { 'Set-Cookie': session.cookie })
    return
  }

  if (request.method === 'POST' && pathname === '/api/auth/password-reset/request') {
    const { email } = await readJson(request)
    const userRecord = findUserByEmail(email)
    let resetLink = null
    if (userRecord && !userRecord.disabled_at) {
      const reset = createPasswordResetToken(userRecord.id)
      resetLink = buildPasswordResetUrl(request, reset.token)
      console.info(`Password reset link for ${userRecord.email}: ${resetLink}`)
    }
    sendJson(response, 200, {
      ok: true,
      message: 'Si un compte actif existe avec cet email, un lien de reset a ete prepare.',
      ...(process.env.NODE_ENV === 'production' ? {} : { resetLink }),
    })
    return
  }

  if (request.method === 'POST' && pathname === '/api/auth/password-reset/confirm') {
    const { token, password } = await readJson(request)
    const passwordValidation = validatePassword(password)
    if (passwordValidation.error) {
      sendJson(response, 400, { error: passwordValidation.error })
      return
    }
    if (!String(token || '').trim()) {
      sendJson(response, 400, { error: 'Le lien de reset est invalide.' })
      return
    }
    const passwordWasReset = await resetPasswordWithToken(
      String(token).trim(),
      passwordValidation.password,
    )
    if (!passwordWasReset) {
      sendJson(response, 400, { error: 'Ce lien de reset est invalide ou expire.' })
      return
    }
    sendJson(response, 200, { ok: true })
    return
  }

  if (request.method === 'POST' && pathname === '/api/auth/logout') {
    sendJson(response, 200, { ok: true }, { 'Set-Cookie': clearSession(request) })
    return
  }

  if (pathname === '/api/workspaces' && request.method === 'GET') {
    const user = requireUser(request, response)
    if (!user) return
    const rows = database.prepare(`
      SELECT
        owners.id,
        owners.email,
        owners.display_name,
        workspaces.revision,
        workspaces.updated_at,
        CASE WHEN owners.id = ? THEN 'owner' ELSE workspace_members.role END AS access_role,
        (SELECT COUNT(*) FROM workspace_members members
          WHERE members.workspace_owner_id = owners.id) AS member_count
      FROM users owners
      LEFT JOIN workspaces ON workspaces.user_id = owners.id
      LEFT JOIN workspace_members
        ON workspace_members.workspace_owner_id = owners.id
        AND workspace_members.member_user_id = ?
      WHERE owners.id = ? OR workspace_members.member_user_id = ?
      ORDER BY CASE WHEN owners.id = ? THEN 0 ELSE 1 END, owners.display_name COLLATE NOCASE
    `).all(user.id, user.id, user.id, user.id, user.id)
    sendJson(response, 200, {
      workspaces: rows.map((row) => serializeWorkspace(
        row,
        row.access_role,
        row,
        row.member_count,
      )),
    })
    return
  }

  const workspaceMembersMatch = pathname.match(/^\/api\/workspaces\/([^/]+)\/members$/)
  if (workspaceMembersMatch && request.method === 'GET') {
    const user = requireUser(request, response)
    if (!user) return
    const workspaceId = decodeURIComponent(workspaceMembersMatch[1])
    if (!getWorkspaceAccess(user.id, workspaceId)) {
      sendJson(response, 403, { error: 'Tu n’as pas accès à ce workspace.' })
      return
    }
    const members = database.prepare(`
      SELECT users.id, users.email, users.display_name, workspace_members.role,
        workspace_members.created_at
      FROM workspace_members
      JOIN users ON users.id = workspace_members.member_user_id
      WHERE workspace_members.workspace_owner_id = ?
      ORDER BY workspace_members.created_at
    `).all(workspaceId).map((member) => ({
      id: member.id,
      email: member.email,
      displayName: member.display_name,
      role: member.role,
      createdAt: member.created_at,
    }))
    sendJson(response, 200, { members })
    return
  }

  if (workspaceMembersMatch && request.method === 'POST') {
    const user = requireUser(request, response)
    if (!user) return
    const workspaceId = decodeURIComponent(workspaceMembersMatch[1])
    if (workspaceId !== user.id) {
      sendJson(response, 403, { error: 'Seul le propriétaire peut inviter un collaborateur.' })
      return
    }
    const { email } = await readJson(request)
    const member = findUserByEmail(String(email || '').trim().toLowerCase())
    if (!member || member.disabled_at) {
      sendJson(response, 404, { error: 'Aucun compte actif ne correspond à cet e-mail.' })
      return
    }
    if (member.id === user.id) {
      sendJson(response, 400, { error: 'Tu es déjà propriétaire de ce workspace.' })
      return
    }
    database.prepare(`
      INSERT INTO workspace_members
        (workspace_owner_id, member_user_id, role, invited_by, created_at)
      VALUES (?, ?, 'editor', ?, ?)
      ON CONFLICT(workspace_owner_id, member_user_id) DO NOTHING
    `).run(workspaceId, member.id, user.id, new Date().toISOString())
    sendJson(response, 201, {
      member: {
        id: member.id,
        email: member.email,
        displayName: member.display_name,
        role: 'editor',
      },
    })
    return
  }

  const workspaceMemberMatch = pathname.match(
    /^\/api\/workspaces\/([^/]+)\/members\/([^/]+)$/,
  )
  if (workspaceMemberMatch && request.method === 'DELETE') {
    const user = requireUser(request, response)
    if (!user) return
    const workspaceId = decodeURIComponent(workspaceMemberMatch[1])
    const memberId = decodeURIComponent(workspaceMemberMatch[2])
    if (workspaceId !== user.id && memberId !== user.id) {
      sendJson(response, 403, { error: 'Tu ne peux pas modifier cet accès.' })
      return
    }
    database.prepare(`
      DELETE FROM workspace_members
      WHERE workspace_owner_id = ? AND member_user_id = ?
    `).run(workspaceId, memberId)
    sendJson(response, 200, { ok: true })
    return
  }

  if (pathname === '/api/projects' && request.method === 'GET') {
    const user = requireUser(request, response)
    if (!user) return
    const workspaceId = new URL(
      request.url,
      `http://${request.headers.host || 'localhost'}`,
    ).searchParams.get('workspaceId') || user.id
    const access = getWorkspaceAccess(user.id, workspaceId)
    if (!access) {
      sendJson(response, 403, { error: 'Tu n’as pas accès à ce workspace.' })
      return
    }
    const workspace = database.prepare(`
      SELECT data, updated_at, revision FROM workspaces WHERE user_id = ?
    `).get(workspaceId)
    const owner = database.prepare(`
      SELECT id, email, display_name FROM users WHERE id = ?
    `).get(workspaceId)
    sendJson(response, 200, workspace
      ? {
          collection: JSON.parse(workspace.data),
          updatedAt: workspace.updated_at,
          revision: Number(workspace.revision) || 1,
          workspace: serializeWorkspace(owner, access.role, workspace),
        }
      : {
          collection: null,
          updatedAt: null,
          revision: 0,
          workspace: serializeWorkspace(owner, access.role, null),
        })
    return
  }

  if (pathname === '/api/projects' && request.method === 'PUT') {
    const user = requireUser(request, response)
    if (!user) return
    const { collection, workspaceId: requestedWorkspaceId, baseRevision } = await readJson(request)
    const workspaceId = requestedWorkspaceId || user.id
    const access = getWorkspaceAccess(user.id, workspaceId)
    if (!access || !['owner', 'editor'].includes(access.role)) {
      sendJson(response, 403, { error: 'Tu ne peux pas modifier ce workspace.' })
      return
    }
    if (
      !collection ||
      typeof collection !== 'object' ||
      !collection.projects ||
      typeof collection.projects !== 'object' ||
      Array.isArray(collection.projects) ||
      typeof collection.activeProjectId !== 'string'
    ) {
      sendJson(response, 400, { error: 'La collection de projets est invalide.' })
      return
    }
    const serialized = JSON.stringify(collection)
    const updatedAt = new Date().toISOString()
    database.exec('BEGIN IMMEDIATE')
    try {
      const current = database.prepare(`
        SELECT revision FROM workspaces WHERE user_id = ?
      `).get(workspaceId)
      const currentRevision = Number(current?.revision) || 0
      if (Number.isInteger(baseRevision) && baseRevision !== currentRevision) {
        database.exec('ROLLBACK')
        sendJson(response, 409, {
          error: 'Le workspace a été modifié par un autre collaborateur.',
          currentRevision,
        })
        return
      }
      const nextRevision = currentRevision + 1
      database.prepare(`
        INSERT INTO workspaces (user_id, version, data, updated_at, revision)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          version = excluded.version,
          data = excluded.data,
          updated_at = excluded.updated_at,
          revision = excluded.revision
      `).run(
        workspaceId,
        Number(collection.version) || 1,
        serialized,
        updatedAt,
        nextRevision,
      )
      database.exec('COMMIT')
      sendJson(response, 200, { savedAt: updatedAt, revision: nextRevision })
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
    return
  }

  if (pathname === '/api/admin/users' && request.method === 'GET') {
    const admin = requireAdmin(request, response)
    if (!admin) return
    const users = database.prepare(`
      SELECT
        users.id,
        users.email,
        users.display_name,
        users.role,
        users.created_at,
        users.disabled_at,
        workspaces.updated_at AS workspace_updated_at,
        COALESCE((
          SELECT COUNT(*) FROM json_each(json_extract(workspaces.data, '$.projects'))
        ), 0) AS project_count,
        MAX(sessions.created_at) AS last_session_at
      FROM users
      LEFT JOIN workspaces ON workspaces.user_id = users.id
      LEFT JOIN sessions ON sessions.user_id = users.id
      GROUP BY users.id
      ORDER BY users.created_at DESC
    `).all().map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      createdAt: user.created_at,
      disabledAt: user.disabled_at,
      workspaceUpdatedAt: user.workspace_updated_at,
      projectCount: Number(user.project_count) || 0,
      lastSessionAt: user.last_session_at,
    }))
    sendJson(response, 200, { users })
    return
  }

  const adminStatusMatch = pathname.match(/^\/api\/admin\/users\/([^/]+)\/status$/)
  if (adminStatusMatch && request.method === 'PATCH') {
    const admin = requireAdmin(request, response)
    if (!admin) return
    const targetId = decodeURIComponent(adminStatusMatch[1])
    const target = database.prepare(`
      SELECT id, role, disabled_at FROM users WHERE id = ?
    `).get(targetId)
    if (!target) {
      sendJson(response, 404, { error: 'Utilisateur introuvable.' })
      return
    }
    if (target.id === admin.id || target.role === 'admin') {
      sendJson(response, 400, { error: 'Un compte administrateur ne peut pas être suspendu ici.' })
      return
    }
    const { disabled } = await readJson(request)
    if (typeof disabled !== 'boolean') {
      sendJson(response, 400, { error: 'Le statut demandé est invalide.' })
      return
    }
    const disabledAt = disabled ? new Date().toISOString() : null
    database.exec('BEGIN IMMEDIATE')
    try {
      database.prepare('UPDATE users SET disabled_at = ? WHERE id = ?').run(disabledAt, target.id)
      if (disabled) database.prepare('DELETE FROM sessions WHERE user_id = ?').run(target.id)
      database.prepare(`
        INSERT INTO admin_audit_log (admin_user_id, target_user_id, action, created_at)
        VALUES (?, ?, ?, ?)
      `).run(admin.id, target.id, disabled ? 'user_disabled' : 'user_enabled', new Date().toISOString())
      database.exec('COMMIT')
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
    sendJson(response, 200, { userId: target.id, disabledAt })
    return
  }

  sendJson(response, 404, { error: 'Route introuvable.' })
}

const serveStatic = (request, response, pathname) => {
  const requestedPath = pathname === '/' ? '/index.html' : pathname
  const safePath = normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, '')
  let filePath = join(distDirectory, safePath)
  if (!filePath.startsWith(distDirectory) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = join(distDirectory, 'index.html')
  }
  if (!existsSync(filePath)) {
    sendJson(response, 503, { error: "L'application n'a pas encore été compilée." })
    return
  }
  const extension = extname(filePath).toLowerCase()
  const cacheControl = filePath.includes(`${join('dist', 'assets')}`)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache'
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] || 'application/octet-stream',
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  })
  if (request.method === 'HEAD') response.end()
  else createReadStream(filePath).pipe(response)
}

const cleanupAuthRecords = () => {
  deleteExpiredSessions()
  deleteExpiredPasswordResetTokens()
}

cleanupAuthRecords()
const sessionCleanup = setInterval(cleanupAuthRecords, 60 * 60 * 1000)
sessionCleanup.unref()

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname
    if (pathname.startsWith('/api/')) await handleApi(request, response, pathname)
    else if (request.method === 'GET' || request.method === 'HEAD') serveStatic(request, response, pathname)
    else sendJson(response, 405, { error: 'Méthode non autorisée.' })
  } catch (error) {
    console.error(error)
    sendJson(response, error.status || 500, {
      error: error.status ? error.message : 'Une erreur interne est survenue.',
    })
  }
})

server.listen(port, '0.0.0.0', () => {
  console.log(`BracketCanvas écoute sur http://0.0.0.0:${port}`)
})

const shutdown = () => server.close(() => {
  closeDatabase()
  process.exit(0)
})

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
