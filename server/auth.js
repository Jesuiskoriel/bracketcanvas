import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { promisify } from 'node:util'
import { database } from './database.js'

const scrypt = promisify(scryptCallback)
const SESSION_COOKIE = 'bracketcanvas_session'
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000
const PASSWORD_RESET_DURATION_MS = 60 * 60 * 1000

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const normalizeDisplayName = (name, email) => {
  const normalized = String(name || '').trim().slice(0, 48)
  return normalized || normalizeEmail(email).split('@')[0].slice(0, 48)
}

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

const parseCookies = (header = '') => Object.fromEntries(
  header.split(';').map((part) => {
    const separator = part.indexOf('=')
    if (separator < 0) return ['', '']
    return [
      decodeURIComponent(part.slice(0, separator).trim()),
      decodeURIComponent(part.slice(separator + 1).trim()),
    ]
  }).filter(([key]) => key),
)

const serializeSessionCookie = (token, maxAge) => {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  displayName: user.display_name,
  createdAt: user.created_at,
  role: user.role || 'user',
})

export const validatePassword = (password) => {
  const normalizedPassword = String(password || '')
  if (normalizedPassword.length < 10) {
    return { error: 'Le mot de passe doit contenir au moins 10 caracteres.' }
  }
  if (normalizedPassword.length > 256) {
    return { error: 'Le mot de passe ne peut pas depasser 256 caracteres.' }
  }
  return { password: normalizedPassword }
}

export const validateRegistration = ({ email, password, displayName }) => {
  const normalizedEmail = normalizeEmail(email)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { error: 'Entre une adresse email valide.' }
  }
  if (normalizedEmail.length > 254) {
    return { error: 'Cette adresse email est trop longue.' }
  }
  const passwordValidation = validatePassword(password)
  if (passwordValidation.error) return passwordValidation
  return {
    email: normalizedEmail,
    password: passwordValidation.password,
    displayName: normalizeDisplayName(displayName, normalizedEmail),
  }
}

export const hashPassword = async (password) => {
  const salt = randomBytes(16)
  const derivedKey = await scrypt(password, salt, 64)
  return `scrypt:${salt.toString('hex')}:${Buffer.from(derivedKey).toString('hex')}`
}

export const verifyPassword = async (password, storedHash) => {
  const [algorithm, saltHex, keyHex] = String(storedHash).split(':')
  if (algorithm !== 'scrypt' || !saltHex || !keyHex) return false
  const expected = Buffer.from(keyHex, 'hex')
  const actual = Buffer.from(await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export const findUserByEmail = (email) => database.prepare(`
  SELECT id, email, display_name, password_hash, created_at, role, disabled_at
  FROM users
  WHERE email = ?
`).get(normalizeEmail(email))

export const createUser = async ({ email, password, displayName }) => {
  const user = {
    id: `user-${randomUUID()}`,
    email: normalizeEmail(email),
    displayName: normalizeDisplayName(displayName, email),
    passwordHash: await hashPassword(password),
    createdAt: new Date().toISOString(),
  }
  database.prepare(`
    INSERT INTO users (id, email, display_name, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(user.id, user.email, user.displayName, user.passwordHash, user.createdAt)
  return publicUser({
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    created_at: user.createdAt,
  })
}

export const createSession = (userId) => {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)
  database.prepare(`
    INSERT INTO sessions (token_hash, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(hashToken(token), userId, now.toISOString(), expiresAt.toISOString())
  return {
    cookie: serializeSessionCookie(token, Math.floor(SESSION_DURATION_MS / 1000)),
    expiresAt: expiresAt.toISOString(),
  }
}

export const createPasswordResetToken = (userId) => {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_DURATION_MS)
  database.prepare(`
    INSERT INTO password_reset_tokens (token_hash, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(hashToken(token), userId, now.toISOString(), expiresAt.toISOString())
  return {
    token,
    expiresAt: expiresAt.toISOString(),
  }
}

export const resetPasswordWithToken = async (token, password) => {
  const resetRecord = database.prepare(`
    SELECT password_reset_tokens.token_hash, password_reset_tokens.user_id
    FROM password_reset_tokens
    JOIN users ON users.id = password_reset_tokens.user_id
    WHERE password_reset_tokens.token_hash = ?
      AND password_reset_tokens.expires_at > ?
      AND password_reset_tokens.used_at IS NULL
      AND users.disabled_at IS NULL
  `).get(hashToken(token), new Date().toISOString())

  if (!resetRecord) return false

  const passwordHash = await hashPassword(password)
  const usedAt = new Date().toISOString()
  database.exec('BEGIN IMMEDIATE')
  try {
    database.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(passwordHash, resetRecord.user_id)
    database.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE token_hash = ?')
      .run(usedAt, resetRecord.token_hash)
    database.prepare('DELETE FROM sessions WHERE user_id = ?').run(resetRecord.user_id)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
  return true
}

export const clearSession = (request) => {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE]
  if (token) {
    database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
  }
  return serializeSessionCookie('', 0)
}

export const getAuthenticatedUser = (request) => {
  const token = parseCookies(request.headers.cookie)[SESSION_COOKIE]
  if (!token) return null
  const now = new Date().toISOString()
  const user = database.prepare(`
    SELECT users.id, users.email, users.display_name, users.created_at, users.role
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
      AND sessions.expires_at > ?
      AND users.disabled_at IS NULL
  `).get(hashToken(token), now)
  return user ? publicUser(user) : null
}

export const deleteExpiredSessions = () => {
  database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(new Date().toISOString())
}

export const deleteExpiredPasswordResetTokens = () => {
  database.prepare(`
    DELETE FROM password_reset_tokens
    WHERE expires_at <= ? OR used_at IS NOT NULL
  `).run(new Date().toISOString())
}
