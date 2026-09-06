import { t, useLanguage } from '../i18n.js'
import { createPortal } from 'react-dom'
const shortcuts = [
  ['Double-clic', "Sélectionner un visuel"],
  ['1 / 2', "Sélectionner le visuel 1 ou 2 de la case active"],
  ['↑ ↓ ← →', "Déplacer le visuel actif de 1 %"],
  ['Maj + flèches', 'Déplacer de 5 %'],
  ['+ / −', 'Zoomer / dézoomer'],
  ['F', 'Retourner horizontalement'],
  ['[ / ]', 'Réduire / augmenter l’opacité'],
  ['⌘/Ctrl + S', 'Sauvegarder immédiatement'],
  ['?', 'Afficher cette aide'],
  ['Échap', 'Fermer une fenêtre'],
]

export default function KeyboardShortcuts({ isOpen, onOpen, onClose }) {
  useLanguage()
  return (
    <>
      <button className="shortcuts-button" type="button" onClick={onOpen} aria-haspopup="dialog">
        <span aria-hidden="true">⌨</span>{t(" Raccourcis")}</button>
      {isOpen && createPortal(
        <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
          <section
            className="compact-modal shortcuts-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div><p className="eyebrow">{t("Aide rapide")}</p><h2 id="shortcuts-title">{t("Raccourcis clavier")}</h2></div>
              <button className="modal-close" type="button" aria-label={t("Fermer")} onClick={onClose}>×</button>
            </header>
            <dl className="shortcuts-list">
              {shortcuts.map(([keys, action]) => (
                <div key={keys}><dt>{t(keys)}</dt><dd>{t(action)}</dd></div>
              ))}
            </dl>
            <p className="shortcuts-note">{t("Les raccourcis sont désactivés quand tu écris dans un champ.")}</p>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
