import { msg, t, useLanguage } from '../i18n.js'
import { useEffect, useState } from 'react'
import {
  inviteWorkspaceMember,
  loadWorkspaceMembers,
  removeWorkspaceMember,
} from '../services/accountApi.js'

export default function CollaborationPanel({
  currentUser,
  workspaces,
  activeWorkspaceId,
  disabled,
  hasConflict,
  onSelectWorkspace,
  onReloadRemote,
  onRefreshWorkspaces,
}) {
  useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [members, setMembers] = useState([])
  const [isBusy, setIsBusy] = useState(false)
  const [message, setMessage] = useState('')
  const activeWorkspace = workspaces.find(({ id }) => id === activeWorkspaceId)
  const isOwner = activeWorkspace?.role === 'owner'

  useEffect(() => {
    if (!isOpen || !activeWorkspaceId) return undefined
    let active = true
    loadWorkspaceMembers(activeWorkspaceId)
      .then(({ members: nextMembers }) => {
        if (active) setMembers(nextMembers)
      })
      .catch((error) => {
        if (active) setMessage(error.message)
      })
    return () => { active = false }
  }, [activeWorkspaceId, isOpen])

  const invite = async (event) => {
    event.preventDefault()
    if (!email.trim() || isBusy) return
    setIsBusy(true)
    setMessage('')
    try {
      const { member } = await inviteWorkspaceMember(activeWorkspaceId, email)
      setMembers((current) => current.some(({ id }) => id === member.id)
        ? current
        : [...current, member])
      setEmail('')
      setMessage(msg("{0} peut maintenant collaborer.", { 0: member.displayName }))
      await onRefreshWorkspaces()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  const remove = async (member) => {
    if (!window.confirm(t("Retirer l’accès de {0} ?", { 0: member.displayName }))) return
    setIsBusy(true)
    setMessage('')
    try {
      await removeWorkspaceMember(activeWorkspaceId, member.id)
      setMembers((current) => current.filter(({ id }) => id !== member.id))
      await onRefreshWorkspaces()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <section className="collaboration-panel" aria-labelledby="collaboration-title">
      <div className="collaboration-summary">
        <div>
          <p className="eyebrow">{t("Espace partagé")}</p>
          <h2 id="collaboration-title">
            {activeWorkspace?.owner.displayName || currentUser.displayName}
          </h2>
        </div>
        <button type="button" disabled={disabled} onClick={() => setIsOpen(true)}>{t("Collaborer")}</button>
      </div>
      {workspaces.length > 1 && (
        <label className="workspace-select" htmlFor="workspace-select">
          <span>{t("Espace de travail actif")}</span>
          <select
            id="workspace-select"
            value={activeWorkspaceId}
            disabled={disabled}
            onChange={(event) => onSelectWorkspace(event.target.value)}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.role === 'owner' ? t("Mon espace de travail") : workspace.owner.displayName}
              </option>
            ))}
          </select>
        </label>
      )}
      {hasConflict && (
        <div className="collaboration-conflict" role="alert">
          <span>{t("Une version plus récente existe.")}</span>
          <button type="button" onClick={onReloadRemote}>{t("Charger la version distante")}</button>
        </div>
      )}

      {isOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsOpen(false)}>
          <section
            className="compact-modal collaboration-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="collaboration-dialog-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p className="eyebrow">{t("Collaboration")}</p>
                <h2 id="collaboration-dialog-title">{t("Partager l’espace de travail")}</h2>
              </div>
              <button className="modal-close" type="button" aria-label={t("Fermer")} onClick={() => setIsOpen(false)}>×</button>
            </header>
            <div className="compact-modal-body">
              <p className="collaboration-note">{t("Les collaborateurs accèdent à tous les projets de cet espace de travail. Les changements sont synchronisés automatiquement.")}</p>
              {isOwner ? (
                <form className="collaboration-invite" onSubmit={invite}>
                  <label htmlFor="collaborator-email">{t("E-mail d’un compte BracketCanvas")}</label>
                  <div>
                    <input
                      id="collaborator-email"
                      type="email"
                      value={email}
                      placeholder={t("joueur@exemple.fr")}
                      disabled={isBusy}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    <button type="submit" disabled={isBusy || !email.trim()}>{t("Inviter")}</button>
                  </div>
                </form>
              ) : (
                <p className="collaboration-note">{t("Partagé par ")}{activeWorkspace?.owner.email}.</p>
              )}
              <div className="collaborator-list">
                <h3>{t("Accès (")}{members.length + 1})</h3>
                <div className="collaborator-row is-owner">
                  <span><strong>{activeWorkspace?.owner.displayName}</strong><small>{activeWorkspace?.owner.email}</small></span>
                  <em>{t("Propriétaire")}</em>
                </div>
                {members.map((member) => (
                  <div className="collaborator-row" key={member.id}>
                    <span><strong>{member.displayName}</strong><small>{member.email}</small></span>
                    {isOwner ? (
                      <button type="button" disabled={isBusy} onClick={() => remove(member)}>{t("Retirer")}</button>
                    ) : <em>{t("Éditeur")}</em>}
                  </div>
                ))}
              </div>
              {message && <p className="collaboration-message" role="status">{t(message)}</p>}
            </div>
          </section>
        </div>
      )}
    </section>
  )
}
