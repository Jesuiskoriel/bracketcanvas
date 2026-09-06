import { t, useLanguage } from '../i18n.js'
function TemplateEditor({ details, onChange, onLogoChange }) {
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

        <div className="logo-control tournament-logo-control">
          <span>{t("Logo du tournoi")}</span>
          <div className="logo-input-row">
            <label className="file-button">
              {details.tournamentLogo ? t("Remplacer le logo") : t("Importer un logo")}
              <input
                id="tournament-logo"
                className="visually-hidden-file"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => {
                  onLogoChange(event.target.files?.[0] || null)
                  event.target.value = ''
                }}
              />
            </label>
            {details.tournamentLogo && (
              <button
                className="remove-logo-button"
                type="button"
                onClick={() => onLogoChange(null)}
              >{t("Retirer")}</button>
            )}
          </div>
          <small>{details.tournamentLogoName || t("Affiché dans le coin supérieur droit")}</small>
        </div>
      </div>
    </section>
  )
}

export default TemplateEditor
