function TemplateEditor({ details, onChange, onLogoChange }) {
  return (
    <section className="template-editor" aria-labelledby="event-details-title">
      <div className="section-heading">
        <p className="eyebrow">Informations</p>
        <h2 id="event-details-title">Événement</h2>
      </div>

      <div className="template-fields">
        <label className="text-control" htmlFor="event-name">
          <span>Nom de l’événement</span>
          <input
            id="event-name"
            type="text"
            value={details.eventName}
            maxLength={32}
            onChange={(event) => onChange({ eventName: event.target.value })}
          />
        </label>

        <label className="text-control" htmlFor="event-subtitle">
          <span>Sous-titre / édition</span>
          <input
            id="event-subtitle"
            type="text"
            value={details.subtitle || ''}
            maxLength={40}
            placeholder="Weekly #34"
            onChange={(event) => onChange({ subtitle: event.target.value })}
          />
        </label>

        <label className="text-control" htmlFor="event-date">
          <span>Date</span>
          <input
            id="event-date"
            type="text"
            value={details.date}
            maxLength={16}
            placeholder="JJ/MM/AAAA"
            onChange={(event) => onChange({ date: event.target.value })}
          />
        </label>

        <label className="text-control" htmlFor="participant-count">
          <span>Nombre de participants</span>
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
          <span>Logo du tournoi</span>
          <div className="logo-input-row">
            <label className="file-button">
              {details.tournamentLogo ? 'Remplacer le logo' : 'Importer un logo'}
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
              >
                Retirer
              </button>
            )}
          </div>
          <small>{details.tournamentLogoName || 'Affiché dans le coin supérieur droit'}</small>
        </div>
      </div>
    </section>
  )
}

export default TemplateEditor
