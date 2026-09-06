import { getLanguage } from '../i18n.js'
const request = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      'Accept-Language': getLanguage(),
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.errorKey || payload.error || 'Le serveur est indisponible.')
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload
}

export const getSession = () => request('/api/auth/session')

export const registerAccount = (credentials) => request('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(credentials),
})

export const loginAccount = (credentials) => request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
})

export const logoutAccount = () => request('/api/auth/logout', { method: 'POST' })

export const requestPasswordReset = (email) => request('/api/auth/password-reset/request', {
  method: 'POST',
  body: JSON.stringify({ email }),
})

export const confirmPasswordReset = ({ token, password }) =>
  request('/api/auth/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })

const workspaceQuery = (workspaceId) => workspaceId
  ? `?workspaceId=${encodeURIComponent(workspaceId)}`
  : ''

export const loadCloudProjectCollection = (workspaceId) =>
  request(`/api/projects${workspaceQuery(workspaceId)}`)

export const saveCloudProjectCollection = (collection, options = {}) => request('/api/projects', {
  method: 'PUT',
  body: JSON.stringify({
    collection,
    workspaceId: options.workspaceId,
    baseRevision: options.baseRevision,
  }),
})

export const loadWorkspaces = () => request('/api/workspaces')

export const loadWorkspaceMembers = (workspaceId) => request(
  `/api/workspaces/${encodeURIComponent(workspaceId)}/members`,
)

export const inviteWorkspaceMember = (workspaceId, email) => request(
  `/api/workspaces/${encodeURIComponent(workspaceId)}/members`,
  { method: 'POST', body: JSON.stringify({ email }) },
)

export const removeWorkspaceMember = (workspaceId, userId) => request(
  `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}`,
  { method: 'DELETE' },
)

export const loadAdminUsers = () => request('/api/admin/users')

export const setAdminUserDisabled = (userId, disabled) => request(
  `/api/admin/users/${encodeURIComponent(userId)}/status`,
  {
    method: 'PATCH',
    body: JSON.stringify({ disabled }),
  },
)
