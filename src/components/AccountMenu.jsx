import { t, useLanguage } from '../i18n.js'
export default function AccountMenu({ user, disabled, onLogout, onOpenAdmin }) {
  useLanguage()
  const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase()

  return (
    <section className="account-menu" aria-label={t("Compte utilisateur")}>
      <span className="account-avatar" aria-hidden="true">{initial}</span>
      <span className="account-identity">
        <strong>{user.displayName}</strong>
        <small>{user.email}</small>
      </span>
      <span className="account-actions">
        {user.role === 'admin' && (
          <button type="button" disabled={disabled} onClick={onOpenAdmin}>{t("Administration")}</button>
        )}
        <button type="button" disabled={disabled} onClick={onLogout}>{t("Déconnexion")}</button>
      </span>
    </section>
  )
}
