import { t, useLanguage } from '../i18n.js'
import { useEffect, useRef } from 'react'

export default function BetaWelcomeModal({ onClose }) {
  useLanguage()
  const closeButtonRef = useRef(null)

  useEffect(() => {
    closeButtonRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div
      className="beta-welcome-backdrop"
      role="presentation"
      data-export-ignore="true"
      onMouseDown={onClose}
    >
      <section
        className="beta-welcome-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="beta-welcome-title"
        aria-describedby="beta-welcome-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="beta-welcome-badge">{t("Version bêta")}</span>
        <h2 id="beta-welcome-title">{t("Bienvenue sur BracketCanvas")}</h2>
        <div id="beta-welcome-description">
          <p><strong>{t("BracketCanvas est développé par Koriel.")}</strong></p>
          <p>{t("L’application évolue encore : plus elle accueille d’utilisateurs et de retours, plus elle pourra devenir complète et agréable à utiliser.")}</p>
          <p>{t("Pour donner ton avis ou signaler un problème, ajoute")}<span className="discord-handle"> Jesuiskoriel</span>{t(" sur Discord.")}</p>
        </div>
        <button ref={closeButtonRef} type="button" onClick={onClose}>{t("Découvrir l’application")}</button>
      </section>
    </div>
  )
}
