const shortcuts = [
  ['Double-clic', 'Sélectionner un render'],
  ['1 / 2', 'Sélectionner le render 1 ou 2 du slot actif'],
  ['↑ ↓ ← →', 'Déplacer le render actif de 1 %'],
  ['Maj + flèches', 'Déplacer de 5 %'],
  ['+ / −', 'Zoomer / dézoomer'],
  ['F', 'Retourner horizontalement'],
  ['[ / ]', 'Réduire / augmenter l’opacité'],
  ['⌘/Ctrl + S', 'Sauvegarder immédiatement'],
  ['?', 'Afficher cette aide'],
  ['Échap', 'Fermer une fenêtre'],
]

export default function KeyboardShortcuts({ isOpen, onOpen, onClose }) {
  return (
    <>
      <button className="shortcuts-button" type="button" onClick={onOpen} aria-haspopup="dialog">
        <span aria-hidden="true">⌨</span> Raccourcis
      </button>
      {isOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
          <section
            className="compact-modal shortcuts-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div><p className="eyebrow">Aide rapide</p><h2 id="shortcuts-title">Raccourcis clavier</h2></div>
              <button className="modal-close" type="button" aria-label="Fermer" onClick={onClose}>×</button>
            </header>
            <dl className="shortcuts-list">
              {shortcuts.map(([keys, action]) => (
                <div key={keys}><dt>{keys}</dt><dd>{action}</dd></div>
              ))}
            </dl>
            <p className="shortcuts-note">Les raccourcis sont désactivés quand tu écris dans un champ.</p>
          </section>
        </div>
      )}
    </>
  )
}
