import { useEffect, useMemo, useRef, useState } from 'react'
import { loadAdminUsers, setAdminUserDisabled } from '../services/accountApi.js'

const formatDate = (value) => value
  ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : 'Aucune activité'

const getLatestActivity = ({ workspaceUpdatedAt, lastSessionAt }) => {
  const dates = [workspaceUpdatedAt, lastSessionAt].filter(Boolean)
  if (!dates.length) return null
  return dates.sort((first, second) => new Date(second) - new Date(first))[0]
}

export default function AdminPanel({ currentUserId, onClose }) {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [pendingUserId, setPendingUserId] = useState('')
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => {
    let isActive = true
    loadAdminUsers()
      .then(({ users: loadedUsers }) => {
        if (isActive) setUsers(loadedUsers)
      })
      .catch((loadError) => {
        if (isActive) setError(loadError.message)
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return users
    return users.filter((user) =>
      `${user.displayName} ${user.email}`.toLowerCase().includes(normalizedQuery),
    )
  }, [query, users])

  const activeCount = users.filter(({ disabledAt }) => !disabledAt).length
  const projectCount = users.reduce((total, user) => total + user.projectCount, 0)

  const toggleUser = async (user) => {
    const shouldDisable = !user.disabledAt
    const confirmed = window.confirm(
      shouldDisable
        ? `Suspendre le compte de ${user.displayName} ? Ses sessions seront immédiatement fermées.`
        : `Réactiver le compte de ${user.displayName} ?`,
    )
    if (!confirmed) return

    setPendingUserId(user.id)
    setError('')
    try {
      const { disabledAt } = await setAdminUserDisabled(user.id, shouldDisable)
      setUsers((currentUsers) => currentUsers.map((candidate) =>
        candidate.id === user.id ? { ...candidate, disabledAt } : candidate,
      ))
    } catch (actionError) {
      setError(actionError.message)
    } finally {
      setPendingUserId('')
    }
  }

  return (
    <div className="admin-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="admin-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="admin-header">
          <div>
            <p className="eyebrow">BracketCanvas</p>
            <h2 id="admin-title">Administration</h2>
            <p>Consulte les comptes et contrôle leur accès à l’application.</p>
          </div>
          <button ref={closeButtonRef} className="admin-close" type="button" onClick={onClose} aria-label="Fermer l’administration">×</button>
        </header>

        <div className="admin-stats" aria-label="Résumé des utilisateurs">
          <div><strong>{users.length}</strong><span>Comptes</span></div>
          <div><strong>{activeCount}</strong><span>Actifs</span></div>
          <div><strong>{projectCount}</strong><span>Canvas</span></div>
        </div>

        <label className="admin-search" htmlFor="admin-user-search">
          <span>Rechercher un utilisateur</span>
          <input
            id="admin-user-search"
            type="search"
            value={query}
            placeholder="Nom ou adresse email"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {error && <p className="admin-error" role="alert">{error}</p>}
        {isLoading ? (
          <p className="admin-loading" role="status">Chargement des utilisateurs…</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-user-table">
              <thead><tr><th>Utilisateur</th><th>Inscription</th><th>Dernière activité</th><th>Canvas</th><th>Statut</th><th><span className="visually-hidden">Action</span></th></tr></thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isProtected = user.id === currentUserId || user.role === 'admin'
                  return (
                    <tr key={user.id}>
                      <td data-label="Utilisateur"><strong>{user.displayName}</strong><small>{user.email}</small></td>
                      <td data-label="Inscription">{formatDate(user.createdAt)}</td>
                      <td data-label="Dernière activité">{formatDate(getLatestActivity(user))}</td>
                      <td data-label="Canvas">{user.projectCount}</td>
                      <td data-label="Statut"><span className={`admin-status ${user.disabledAt ? 'is-disabled' : 'is-active'}`}>{user.disabledAt ? 'Suspendu' : user.role === 'admin' ? 'Administrateur' : 'Actif'}</span></td>
                      <td className="admin-user-action">
                        {isProtected ? (
                          <span className="admin-protected">Protégé</span>
                        ) : (
                          <button type="button" disabled={pendingUserId === user.id} onClick={() => toggleUser(user)}>
                            {pendingUserId === user.id ? 'Mise à jour…' : user.disabledAt ? 'Réactiver' : 'Suspendre'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!filteredUsers.length && <p className="admin-empty">Aucun utilisateur ne correspond à cette recherche.</p>}
          </div>
        )}
      </section>
    </div>
  )
}
