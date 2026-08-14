export default function AccountMenu({ user, disabled, onLogout }) {
  const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase()

  return (
    <section className="account-menu" aria-label="Compte utilisateur">
      <span className="account-avatar" aria-hidden="true">{initial}</span>
      <span className="account-identity">
        <strong>{user.displayName}</strong>
        <small>{user.email}</small>
      </span>
      <button type="button" disabled={disabled} onClick={onLogout}>
        Déconnexion
      </button>
    </section>
  )
}
