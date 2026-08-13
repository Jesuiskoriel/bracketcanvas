import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createDefaultGenerationBrief,
  createTemplateSeed,
  generateTemplate,
  generatedFamilies,
  generatedIntensityLabels,
  generatedLayouts,
} from '../templates/generated/generator.js'
import { createPaletteFromColor } from '../templates/generated/palette.js'
import TemplateLivePreview from './TemplateLivePreview.jsx'

const STEPS = [
  { id: 'identity', label: 'Identité' },
  { id: 'direction', label: 'Direction artistique' },
  { id: 'composition', label: 'Composition' },
  { id: 'colors', label: 'Couleurs' },
  { id: 'summary', label: 'Résumé' },
]

const EVENT_TYPES = [
  ['weekly', 'Weekly local'], ['major', 'Major'], ['invitational', 'Invitational'],
  ['arcadian', 'Arcadian'], ['crew', 'Crew Battle'], ['championship', 'Championship'],
  ['online', 'Online'], ['other', 'Autre'],
]

const COLOR_MOODS = [
  ['dark', 'Sombre'], ['light', 'Claire'], ['vivid', 'Vive'],
  ['pastel', 'Pastel'], ['monochrome', 'Monochrome'], ['contrast', 'Contrastée'],
]

const COLOR_MODES = [
  ['auto', 'Choisir pour moi', 'Palette cohérente avec la direction artistique.'],
  ['primary', 'Depuis une couleur', 'Construire une harmonie depuis une dominante.'],
  ['custom', 'Palette personnalisée', 'Contrôler les quatre couleurs fondatrices.'],
]

const SliderField = ({ id, label, low, high, value, onChange }) => (
  <label className="wizard-slider" htmlFor={id}>
    <span><strong>{label}</strong><output htmlFor={id}>{Math.round(value)}%</output></span>
    <input id={id} type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <small><span>{low}</span><span>{high}</span></small>
  </label>
)

const ChoiceCard = ({ selected, color, title, description, onClick }) => (
  <button
    type="button"
    className={`wizard-choice${selected ? ' is-selected' : ''}`}
    aria-pressed={selected}
    onClick={onClick}
  >
    {color && <span className="wizard-choice-swatch" style={{ background: color }} />}
    <span><strong>{title}</strong>{description && <small>{description}</small>}</span>
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3 3 7-7" /></svg>
  </button>
)

export default function TemplateCreationWizard({ projectName, onBack, onCancel, onSubmit }) {
  const [brief, setBrief] = useState(() => createDefaultGenerationBrief(projectName))
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState('')
  const [previewSeed, setPreviewSeed] = useState(() => createTemplateSeed())
  const headingRef = useRef(null)
  const step = STEPS[stepIndex]

  useEffect(() => {
    headingRef.current?.focus()
  }, [stepIndex])

  const patchSection = (section, changes) => {
    setBrief((current) => ({
      ...current,
      [section]: { ...current[section], ...changes },
    }))
  }

  const palettePreview = useMemo(() => {
    if (brief.colors.mode === 'custom') {
      return [brief.colors.background, brief.colors.primary, brief.colors.secondary, brief.colors.accent]
    }
    const family = generatedFamilies.find(({ id }) => id === brief.artDirection.family)
    const palette = createPaletteFromColor({
      primary: brief.colors.mode === 'auto' ? family?.color : brief.colors.primary,
      harmony: brief.colors.mode === 'auto' ? family?.harmony : brief.colors.harmony,
      mood: brief.colors.mood || family?.mood,
    })
    return [palette.background, palette.primary, palette.secondary, palette.accent]
  }, [brief.artDirection.family, brief.colors])

  const goNext = () => {
    if (step.id === 'identity' && !brief.tournament.name.trim()) {
      setError('Le nom du tournoi est obligatoire.')
      return
    }
    setError('')
    setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))
  }

  const goBack = () => {
    if (stepIndex === 0) onBack()
    else setStepIndex((current) => current - 1)
  }

  const selectedFamily = generatedFamilies.find(({ id }) => id === brief.artDirection.family)
  const selectedLayout = generatedLayouts.find(({ id }) => id === brief.composition.layoutFamily)
  const intensityIndex = Math.min(3, Math.floor(Number(brief.artDirection.intensity) / 25))
  const previewTemplate = useMemo(
    () => generateTemplate({ brief, seed: previewSeed }),
    [brief, previewSeed],
  )

  return (
    <>
      <header className="wizard-header">
        <p className="eyebrow">Assistant de création</p>
        <h2 id="project-dialog-title" ref={headingRef} tabIndex="-1">{step.label}</h2>
        <div className="wizard-progress" aria-label={`Étape ${stepIndex + 1} sur ${STEPS.length}`}>
          {STEPS.map((item, index) => (
            <span key={item.id} className={index === stepIndex ? 'is-current' : index < stepIndex ? 'is-complete' : ''}>
              <i>{index + 1}</i><small>{item.label}</small>
            </span>
          ))}
        </div>
      </header>

      <div className="wizard-body">
        <div className="wizard-workspace">
          <div className="wizard-controls">
        {step.id === 'identity' && (
          <div className="wizard-form-grid">
            <label className="text-control wizard-field wizard-field-wide" htmlFor="wizard-tournament-name">
              Nom du tournoi <span aria-hidden="true">*</span>
              <input id="wizard-tournament-name" value={brief.tournament.name} autoComplete="organization" onChange={(event) => { patchSection('tournament', { name: event.target.value }); setError('') }} />
            </label>
            <label className="text-control wizard-field wizard-field-wide" htmlFor="wizard-subtitle">
              Sous-titre / édition <small>Optionnel</small>
              <input id="wizard-subtitle" value={brief.tournament.subtitle} placeholder="Weekly #34" onChange={(event) => patchSection('tournament', { subtitle: event.target.value })} />
            </label>
            <label className="text-control wizard-field" htmlFor="wizard-date">
              Date <small>Optionnel</small>
              <input id="wizard-date" type="date" value={brief.tournament.date} onChange={(event) => patchSection('tournament', { date: event.target.value })} />
            </label>
            <label className="text-control wizard-field" htmlFor="wizard-entrants">
              Participants <small>Optionnel</small>
              <input id="wizard-entrants" type="number" min="0" inputMode="numeric" value={brief.tournament.entrants} onChange={(event) => patchSection('tournament', { entrants: event.target.value })} />
            </label>
            <fieldset className="wizard-fieldset wizard-field-wide">
              <legend>Type d’événement</legend>
              <div className="wizard-chip-list">
                {EVENT_TYPES.map(([id, label]) => <button type="button" key={id} className={brief.tournament.eventType === id ? 'is-selected' : ''} aria-pressed={brief.tournament.eventType === id} onClick={() => patchSection('tournament', { eventType: id })}>{label}</button>)}
              </div>
            </fieldset>
          </div>
        )}

        {step.id === 'direction' && (
          <>
            <p className="wizard-question">Quelle ambiance veux-tu ?</p>
            <div className="wizard-choice-grid wizard-family-grid">
              {generatedFamilies.map((family) => <ChoiceCard key={family.id} selected={brief.artDirection.family === family.id} color={family.color} title={family.label} onClick={() => patchSection('artDirection', { family: family.id })} />)}
            </div>
            <SliderField id="wizard-intensity" label={`Intensité — ${generatedIntensityLabels[intensityIndex]}`} low="Sobre" high="Très marqué" value={brief.artDirection.intensity} onChange={(intensity) => patchSection('artDirection', { intensity })} />
          </>
        )}

        {step.id === 'composition' && (
          <>
            <p className="wizard-question">Quel type de composition ?</p>
            <div className="wizard-choice-grid wizard-layout-grid">
              {generatedLayouts.map((layout) => <ChoiceCard key={layout.id} selected={brief.composition.layoutFamily === layout.id} title={layout.label} onClick={() => patchSection('composition', { layoutFamily: layout.id })} />)}
            </div>
            <div className="wizard-slider-grid">
              <SliderField id="wizard-dominance" label="Importance du Top 1" low="Discret" high="Dominant" value={brief.composition.winnerDominance} onChange={(winnerDominance) => patchSection('composition', { winnerDominance })} />
              <SliderField id="wizard-density" label="Densité du layout" low="Aéré" high="Compact" value={brief.composition.density} onChange={(density) => patchSection('composition', { density })} />
              <SliderField id="wizard-symmetry" label="Symétrie" low="Très asymétrique" high="Très structuré" value={brief.composition.symmetry} onChange={(symmetry) => patchSection('composition', { symmetry })} />
            </div>
          </>
        )}

        {step.id === 'colors' && (
          <>
            <p className="wizard-question">Quelle palette veux-tu ?</p>
            <div className="wizard-choice-grid wizard-color-modes">
              {COLOR_MODES.map(([id, title, description]) => <ChoiceCard key={id} selected={brief.colors.mode === id} title={title} description={description} onClick={() => patchSection('colors', { mode: id })} />)}
            </div>
            {brief.colors.mode !== 'auto' && (
              <div className="wizard-color-fields">
                <label>Principale <input type="color" value={brief.colors.primary} onChange={(event) => patchSection('colors', { primary: event.target.value })} /></label>
                {brief.colors.mode === 'custom' && <>
                  <label>Secondaire <input type="color" value={brief.colors.secondary} onChange={(event) => patchSection('colors', { secondary: event.target.value })} /></label>
                  <label>Accent <input type="color" value={brief.colors.accent} onChange={(event) => patchSection('colors', { accent: event.target.value })} /></label>
                  <label>Fond <input type="color" value={brief.colors.background} onChange={(event) => patchSection('colors', { background: event.target.value })} /></label>
                </>}
              </div>
            )}
            <fieldset className="wizard-fieldset">
              <legend>Ambiance couleur</legend>
              <div className="wizard-chip-list">{COLOR_MOODS.map(([id, label]) => <button type="button" key={id} className={brief.colors.mood === id ? 'is-selected' : ''} aria-pressed={brief.colors.mood === id} onClick={() => patchSection('colors', { mood: id })}>{label}</button>)}</div>
            </fieldset>
            <div className="wizard-palette-preview" aria-label="Aperçu de la palette">{palettePreview.map((color, index) => <span key={`${color}-${index}`} style={{ background: color }} title={color} />)}</div>
          </>
        )}

        {step.id === 'summary' && (
          <div className="wizard-summary">
            <div><span>Nom</span><strong>{brief.tournament.name}</strong><small>{brief.tournament.subtitle || 'Sans sous-titre'}</small></div>
            <div><span>Direction artistique</span><strong>{selectedFamily?.label}</strong><small>{generatedIntensityLabels[intensityIndex]}</small></div>
            <div><span>Composition</span><strong>{selectedLayout?.label}</strong><small>Top 1 à {brief.composition.winnerDominance}% · densité {brief.composition.density}%</small></div>
            <div><span>Palette</span><strong>{COLOR_MODES.find(([id]) => id === brief.colors.mode)?.[1]}</strong><div className="wizard-palette-preview">{palettePreview.map((color, index) => <span key={`${color}-${index}`} style={{ background: color }} />)}</div></div>
          </div>
        )}

        {error && <p className="project-dialog-error" role="alert">{error}</p>}
          </div>
          <TemplateLivePreview
            template={previewTemplate}
            brief={brief}
            onShuffle={() => setPreviewSeed(createTemplateSeed())}
          />
        </div>
      </div>

      <div className="project-dialog-actions wizard-actions">
        <button type="button" onClick={goBack}>Retour</button>
        <button type="button" onClick={onCancel}>Annuler</button>
        {step.id === 'summary'
          ? <button type="button" className="wizard-generate-button" onClick={() => onSubmit(brief, previewSeed)}>Générer mon template</button>
          : <button type="button" onClick={goNext}>Continuer</button>}
      </div>
    </>
  )
}
