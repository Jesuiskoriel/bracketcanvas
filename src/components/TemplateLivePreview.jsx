import { useMemo } from 'react'
import Top8Canvas from './Top8Canvas.jsx'

function ShuffleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h3.2c4.4 0 5.6 10 9.7 10H20M17 4l3 3-3 3M4 17h3.2c1.7 0 3-1.5 4.2-3.3M17 14l3 3-3 3" />
    </svg>
  )
}

const formatPreviewDate = (date) => {
  if (!date) return 'DATE À VENIR'
  const parsedDate = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsedDate.getTime())) return date
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate)
}

export default function TemplateLivePreview({ template, brief, onShuffle }) {
  const players = useMemo(() => template.slots.map((slot, index) => ({
    id: slot.id,
    placement: slot.placement,
    playerName: `PLAYER ${index + 1}`,
    character: '', renderId: '', render: '',
    secondaryCharacter: '', secondaryRenderId: '', secondaryRender: '',
    teamLogo: '', teamLogoName: '',
    rankX: slot.rank.x,
    rankY: slot.rank.y,
    rankSize: slot.rank.size,
    rankColor: slot.rank.color,
    rankLayer: slot.rank.layer,
    x: 0, y: 0, scale: 1, flipped: false, opacity: 100,
    secondaryX: 18, secondaryY: 0, secondaryScale: 1,
    secondaryFlipped: false, secondaryOpacity: 100,
  })), [template])

  const eventDetails = {
    eventName: brief.tournament.name || 'NOM DU TOURNOI',
    subtitle: brief.tournament.subtitle || 'ÉDITION / SOUS-TITRE',
    date: formatPreviewDate(brief.tournament.date),
    participantCount: brief.tournament.entrants || '0',
    tournamentLogo: '',
  }

  return (
    <aside className="wizard-preview-panel" aria-labelledby="wizard-preview-title">
      <div className="wizard-preview-heading">
        <div>
          <p className="eyebrow">Preview live</p>
          <h3 id="wizard-preview-title">{template.name}</h3>
          <small>{template.familyName} · {template.layoutName}</small>
        </div>
        <button type="button" onClick={onShuffle}>
          <ShuffleIcon />
          Autre proposition
        </button>
      </div>
      <div className="wizard-preview-frame">
        <div className="wizard-preview-canvas" aria-live="polite">
          <Top8Canvas
            template={template}
            players={players}
            eventDetails={eventDetails}
            selectedLayer={{}}
            onPlayerChange={() => {}}
            onSelectLayer={() => {}}
          />
        </div>
      </div>
      <p className="wizard-preview-note">Aperçu 686 × 386 · Aucun render SSBU n’est chargé.</p>
    </aside>
  )
}
