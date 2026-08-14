export default function ProductNotice({ compact = false }) {
  return (
    <aside className={`product-notice${compact ? ' product-notice-compact' : ''}`} aria-label="À propos de BracketCanvas">
      <p><strong>Développé par Koriel.</strong> BracketCanvas est actuellement en version bêta.</p>
      <p>
        Plus la communauté grandit et partage ses retours, plus l’application pourra
        s’améliorer. Pour tout feedback, ajoute <span className="discord-handle">Jesuiskoriel</span> sur Discord.
      </p>
    </aside>
  )
}
