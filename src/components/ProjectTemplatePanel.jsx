import { t, useLanguage } from '../i18n.js'
function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="16" cy="8" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="8" cy="16" r="1" />
      <circle cx="16" cy="16" r="1" />
    </svg>
  )
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 0-3.6h-.7a1.7 1.7 0 0 1 0-3.4H15a6 6 0 0 0 0-12h-3Z" />
      <circle cx="8" cy="10" r="1" /><circle cx="10" cy="7" r="1" /><circle cx="14" cy="6.5" r="1" />
    </svg>
  )
}

export default function ProjectTemplatePanel({ template, disabled, onRegenerate, onEditPalette }) {
  useLanguage()
  return (
    <section className="project-template-panel" aria-labelledby="project-template-title">
      <div>
        <p className="eyebrow">{t("Modèle")}</p>
        <h2 id="project-template-title">{t(template.name)}</h2>
        <p>
          {template.generated
            ? `${t(template.familyName)} · ${t(template.layoutName)}`
            : t("Modèle Zero original")}
        </p>
      </div>
      <div className="project-template-actions">
        <button type="button" disabled={disabled} onClick={onEditPalette}>
          <PaletteIcon />{t("Palette")}</button>
        {template.generated && (
          <button type="button" disabled={disabled} onClick={onRegenerate}>
            <DiceIcon />{t("Nouvelle variante")}</button>
        )}
      </div>
    </section>
  )
}
