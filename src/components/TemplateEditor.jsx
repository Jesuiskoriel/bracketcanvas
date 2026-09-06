import { t, useLanguage } from '../i18n.js'

function ImageControl({ id, label, value, fileName, fallback, onChange }) {
  return (
    <div className="logo-control tournament-logo-control">
      <span>{t(label)}</span>
      <div className="logo-input-row">
        <label className="file-button">
          {value ? t("Remplacer l’image") : t("Importer une image")}
          <input
            id={id}
            className="visually-hidden-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => {
              onChange(event.target.files?.[0] || null)
              event.target.value = ''
            }}
          />
        </label>
        {value && (
          <button
            className="remove-logo-button"
            type="button"
            onClick={() => onChange(null)}
          >{t("Retirer")}</button>
        )}
      </div>
      <small>{fileName || t(fallback)}</small>
    </div>
  )
}

function TemplateEditor({ details, onChange, onLogoChange, onBackgroundChange }) {
  useLanguage()
  return (
    <section className="template-editor" aria-labelledby="event-details-title">
      <div className="section-heading">
        <p className="eyebrow">{t("Informations")}</p>
        <h2 id="event-details-title">{t("Événement")}</h2>
      </div>

      <div className="template-fields">
        <label className="text-control" htmlFor="event-name">
          <span>{t("Nom de l’événement")}</span>
          <input
            id="event-name"
            type="text"
            value={details.eventName}
            maxLength={32}
            onChange={(event) => onChange({ eventName: event.target.value })}
          />
        </label>

        <label className="text-control" htmlFor="event-subtitle">
          <span>{t("Sous-titre / édition")}</span>
          <input
            id="event-subtitle"
            type="text"
            value={details.subtitle || ''}
            maxLength={40}
            placeholder={t("Weekly #34")}
            onChange={(event) => onChange({ subtitle: event.target.value })}
          />
        </label>

        <label className="text-control" htmlFor="event-date">
          <span>{t("Date")}</span>
          <input
            id="event-date"
            type="text"
            value={details.date}
            maxLength={16}
            placeholder={t("JJ/MM/AAAA")}
            onChange={(event) => onChange({ date: event.target.value })}
          />
        </label>

        <label className="text-control" htmlFor="participant-count">
          <span>{t("Nombre de participants")}</span>
          <input
            id="participant-count"
            type="text"
            inputMode="numeric"
            value={details.participantCount}
            maxLength={3}
            onChange={(event) => {
              const participantCount = event.target.value.replace(/\D/g, '')
              onChange({ participantCount })
            }}
          />
        </label>

        <ImageControl
          id="tournament-logo"
          label="Logo du tournoi"
          value={details.tournamentLogo}
          fileName={details.tournamentLogoName}
          fallback="Affiché dans le coin supérieur droit"
          onChange={onLogoChange}
        />

        <ImageControl
          id="custom-background"
          label="Fond global personnalisé"
          value={details.customBackground}
          fileName={details.customBackgroundName}
          fallback="Remplace le fond du canevas"
          onChange={onBackgroundChange}
        />
      </div>
    </section>
  )
}

export default TemplateEditor
