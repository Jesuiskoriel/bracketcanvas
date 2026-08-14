const request = async (path, options = {}) => {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'Le serveur est indisponible.')
    error.status = response.status
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

export const loadCloudProjectCollection = () => request('/api/projects')

export const saveCloudProjectCollection = (collection) => request('/api/projects', {
  method: 'PUT',
  body: JSON.stringify({ collection }),
})

export const loadAdminUsers = () => request('/api/admin/users')

export const setAdminUserDisabled = (userId, disabled) => request(
  `/api/admin/users/${encodeURIComponent(userId)}/status`,
  {
    method: 'PATCH',
    body: JSON.stringify({ disabled }),
  },
)
