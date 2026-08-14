import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import {
  clearSession,
  createSession,
  createUser,
  deleteExpiredSessions,
  findUserByEmail,
  getAuthenticatedUser,
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
    if (!userRecord || !passwordIsValid) {
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
      },
    }, { 'Set-Cookie': session.cookie })
    return
  }

  if (request.method === 'POST' && pathname === '/api/auth/logout') {
    sendJson(response, 200, { ok: true }, { 'Set-Cookie': clearSession(request) })
    return
  }

  if (pathname === '/api/projects' && request.method === 'GET') {
    const user = requireUser(request, response)
    if (!user) return
    const workspace = database.prepare(`
      SELECT data, updated_at FROM workspaces WHERE user_id = ?
    `).get(user.id)
    sendJson(response, 200, workspace
      ? { collection: JSON.parse(workspace.data), updatedAt: workspace.updated_at }
      : { collection: null, updatedAt: null })
    return
  }

  if (pathname === '/api/projects' && request.method === 'PUT') {
    const user = requireUser(request, response)
    if (!user) return
    const { collection } = await readJson(request)
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
    database.prepare(`
      INSERT INTO workspaces (user_id, version, data, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        version = excluded.version,
        data = excluded.data,
        updated_at = excluded.updated_at
    `).run(user.id, Number(collection.version) || 1, serialized, updatedAt)
    sendJson(response, 200, { savedAt: updatedAt })
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

deleteExpiredSessions()
const sessionCleanup = setInterval(deleteExpiredSessions, 60 * 60 * 1000)
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
