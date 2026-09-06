import { t, msg, useLanguage } from '../i18n.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createDefaultGenerationBrief,
  createTemplateSeed,
  findNovelProposal,
  generateTemplate,
  getTemplateSignature,
  generatedFamilies,
  generatedIntensityLabels,
  generatedLayouts,
  generatedVariations,
} from '../templates/generated/generator.js'
import { createPaletteFromColor } from '../templates/generated/palette.js'
import TemplateLivePreview from './TemplateLivePreview.jsx'

const STEPS = [
  { id: 'identity', label: 'Identité' },
  { id: 'direction', label: 'Univers' },
  { id: 'composition', label: 'Composition' },
  { id: 'panels', label: 'Cases' },
  { id: 'typography', label: 'Titres' },
  { id: 'colors', label: 'Couleurs' },
  { id: 'summary', label: 'Résumé' },
]

const EVENT_TYPES = [
  ['weekly', 'Weekly'], ['major', 'Major'], ['invitational', 'Invitational'],
  ['arcadian', 'Arcadian'], ['crew', 'Crew Battle'], ['championship', 'Championship'],
  ['online', 'Online'], ['other', 'Autre'],
]

const COLOR_MOODS = [
  ['auto', 'Adaptée au style'],
  ['dark', 'Sombre'], ['light', 'Claire'], ['vivid', 'Vive'],
  ['pastel', 'Pastel'], ['monochrome', 'Monochrome'], ['contrast', 'Contrastée'],
  ['neon', 'Néon'], ['muted', 'Sourde'], ['earth', 'Terreuse'],
]

const COLOR_MODES = [
  ['auto', 'Choisir pour moi', 'Palette cohérente avec la direction artistique.'],
  ['primary', 'Depuis une couleur', 'Construire une harmonie depuis une dominante.'],
  ['custom', 'Palette personnalisée', 'Contrôler les quatre couleurs fondatrices.'],
]

const PANEL_SHAPES = [
  ['auto', 'Choisir pour moi', "La forme suit la composition et la direction artistique."],
  ['irregular', 'Irrégulières', 'Des angles variés et une énergie plus organique.'],
  ['diagonal', 'Diagonales', 'Des cases inclinées, rapides et très esport.'],
  ['cut-corners', 'Coins coupés', 'Un rendu graphique net, façon interface futuriste.'],
  ['clean', 'Rectangulaires', 'Une grille plus calme et parfaitement structurée.'],
  ['trapezoid', 'Trapèzes', 'Une inclinaison lisible avec un rythme de compétition.'],
  ['hexagon', 'Hexagones', 'Des panneaux futuristes aux contours plus marqués.'],
  ['capsule', 'Capsules', 'Des silhouettes arrondies, pop et très graphiques.'],
  ['organic', 'Organiques', 'Des contours souples et contrôlés, moins mécaniques.'],
]

const FRAME_STYLES = [
  ['auto', 'Choisir pour moi'],
  ['double', 'Double trait'], ['ink', 'Encrage fort'],
  ['accent', 'Trait couleur'], ['fine', 'Trait fin'], ['thick', 'Trait épais'],
  ['glow', 'Lueur'], ['offset', 'Ombre décalée'], ['techno', 'Techno'],
  ['none', 'Sans cadre'],
]

const LABEL_POSITIONS = [
  ['auto', 'Choisir pour moi'],
  ['bottom', 'En bas'], ['top', 'En haut'], ['alternating', 'Alternés'],
]

const TEXTURES = [
  ['auto', 'Adaptée au style'], ['halftone', 'Trame comic'], ['grid', 'Grille'],
  ['speed', 'Lignes de vitesse'], ['noise', 'Grunge'], ['minimal', 'Minimaliste'],
  ['pixels', 'Pixels'], ['checker', 'Damier'], ['circuit', 'Circuits'],
  ['paper', 'Papier'], ['spray', 'Spray'], ['organic', 'Organique'],
]

const TYPOGRAPHIES = [
  ['auto', 'Adaptée à l’univers', 'Le générateur choisit la meilleure association.'],
  ['condensed', 'Condensée impact', 'Titres massifs et compétition.'],
  ['serif', 'Éditoriale serif', 'Plus premium, magazine et expressive.'],
  ['geometric', 'Géométrique', 'Claire, moderne et très lisible.'],
  ['mono', 'Monospace', 'Technique, arcade ou science-fiction.'],
  ['grotesk-massive', 'Grotesk massive', 'Une voix très large, franche et contemporaine.'],
  ['comic', 'Comic impact', 'Une énergie de planche dessinée et de splash page.'],
  ['retro-arcade', 'Arcade rétro', 'Une voix numérique aux accents de borne CRT.'],
  ['elegant-serif', 'Serif élégante', 'Une finition fantasy ou premium avec Hylia Serif.'],
  ['minimal-sans', 'Sans serif minimale', 'Un titre calme, aéré et très éditorial.'],
]

const RANK_STYLES = [
  ['auto', 'Choisir pour moi'], ['impact', 'Impact'], ['badge', 'Pastille'],
  ['badge-square', 'Badge carré'], ['giant-back', 'Géant derrière'],
  ['watermark', 'Filigrane'], ['attached', 'Accroché'],
  ['shadow', 'Ombre décalée'], ['clean', 'Épuré'],
]

const HEADER_STYLES = [
  ['auto', 'Choisir pour moi'], ['band', 'Bandeau'], ['split', 'Découpé'],
  ['poster', 'Affiche'], ['minimal', 'Minimal'], ['masthead', 'Masthead'],
  ['floating', 'Titre flottant'], ['technical', 'Technique'],
  ['editorial-stack', 'Éditorial empilé'],
]

const LAYOUT_GROUP_LABELS = {
  hero: 'Vainqueur en vedette',
  directional: 'Compositions directionnelles',
  structured: 'Grilles structurées',
  spatial: 'Affiches et compositions spatiales',
  strips: 'Bandes graphiques',
  experimental: 'Compositions libres',
  other: 'Autres compositions',
}

const VARIATION_FALLBACKS = {
  coherent: {
    label: 'Cohérent',
    description: 'Une proposition fidèle aux codes de la direction choisie.',
  },
  creative: {
    label: 'Créatif',
    description: 'Des associations plus audacieuses, toujours bien maîtrisées.',
  },
  wild: {
    label: 'Sauvage',
    description: 'Un maximum de surprise sans sacrifier la lisibilité du Top 8.',
  },
}

const formatGroupLabel = (group) => LAYOUT_GROUP_LABELS[group] || String(group || 'other')
  .replaceAll('-', ' ')
  .replace(/^./, (letter) => letter.toUpperCase())

function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="8" cy="8" r="1" />
      <circle cx="16" cy="8" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="8" cy="16" r="1" />
      <circle cx="16" cy="16" r="1" />
    </svg>
  )
}

const SliderField = ({ id, label, low, high, value, onChange }) => (
  <label className="wizard-slider" htmlFor={id}>
    <span><strong>{t(label)}</strong><output htmlFor={id}>{Math.round(value)}%</output></span>
    <input id={id} type="range" min="0" max="100" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    <small><span>{t(low)}</span><span>{t(high)}</span></small>
  </label>
)

const ChoiceCard = ({ selected, color, title, description, onClick, className = '', icon }) => (
  <button
    type="button"
    className={`wizard-choice${className ? ` ${className}` : ''}${selected ? ' is-selected' : ''}`}
    aria-pressed={selected}
    onClick={onClick}
  >
    {icon && <span className="wizard-choice-icon">{icon}</span>}
    {color && <span className="wizard-choice-swatch" style={{ background: color }} />}
    <span><strong>{t(title)}</strong>{description && <small>{t(description)}</small>}</span>
    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3 3 7-7" /></svg>
  </button>
)

export default function TemplateCreationWizard({ projectName, onBack, onCancel, onSubmit, required = false }) {
  useLanguage()
  const [brief, setBrief] = useState(() => createDefaultGenerationBrief(projectName))
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState('')
  const [previewSeed, setPreviewSeed] = useState(() => createTemplateSeed())
  const [previewActionError, setPreviewActionError] = useState('')
  const [isShuffling, setIsShuffling] = useState(false)
  const headingRef = useRef(null)
  const recentSignaturesRef = useRef([])
  const shuffleFrameRef = useRef(null)
  const step = STEPS[stepIndex]

  useEffect(() => {
    headingRef.current?.focus()
  }, [stepIndex])

  useEffect(
    () => () => {
      if (shuffleFrameRef.current) cancelAnimationFrame(shuffleFrameRef.current)
    },
    [],
  )

  const patchSection = (section, changes) => {
    setPreviewActionError('')
    setBrief((current) => ({
      ...current,
      [section]: { ...current[section], ...changes },
    }))
  }

  const chooseGuidedFamily = (familyId) => {
    setPreviewActionError('')
    setBrief((current) => ({
      ...current,
      generation: { ...current.generation, mode: 'guided' },
      artDirection: { ...current.artDirection, family: familyId },
    }))
  }

  const generationMode = brief.generation?.mode || (
    brief.artDirection.family === 'surprise' ? 'surprise' : 'guided'
  )
  const variationId = brief.generation?.variation || 'creative'
  const guidedFamilies = generatedFamilies.filter(
    ({ id }) => !['auto', 'surprise'].includes(id),
  )
  const variationOptions = generatedVariations.map((variation) => ({
    ...VARIATION_FALLBACKS[variation.id],
    ...variation,
  }))
  const selectedVariation = variationOptions.find(({ id }) => id === variationId)
    || { id: variationId, ...VARIATION_FALLBACKS[variationId] }
  const autoLayout = generatedLayouts.find(({ id }) => id === 'auto')
  const layoutGroups = generatedLayouts
    .filter(({ id }) => id !== 'auto')
    .reduce((groups, layout) => {
      const group = layout.group || 'other'
      const currentGroup = groups.find((candidate) => candidate.id === group)
      if (currentGroup) currentGroup.layouts.push(layout)
      else groups.push({ id: group, layouts: [layout] })
      return groups
    }, [])

  const previewResult = useMemo(() => {
    try {
      return { template: generateTemplate({ brief, seed: previewSeed }), error: '' }
    } catch {
      return {
        template: null,
        error: t("Cette proposition n'a pas pu être construite. Essaie une autre variation."),
      }
    }
  }, [brief, previewSeed])
  const previewTemplate = previewResult.template

  const rememberSignature = (template) => {
    if (!template) return
    const signature = getTemplateSignature(template)
    if (!signature) return
    recentSignaturesRef.current = [
      ...recentSignaturesRef.current.filter((candidate) => candidate !== signature),
      signature,
    ].slice(-8)
  }

  const shuffleProposal = () => {
    if (isShuffling) return
    setIsShuffling(true)
    setPreviewActionError('')
    rememberSignature(previewTemplate)

    shuffleFrameRef.current = requestAnimationFrame(() => {
      shuffleFrameRef.current = null
      try {
        const proposal = findNovelProposal({
          brief,
          recentSignatures: recentSignaturesRef.current,
          seedRoot: createTemplateSeed(),
        })
        const proposedTemplate = proposal?.template || proposal
        const resolvedSeed = proposal?.seed || proposedTemplate?.seed
        if (!resolvedSeed) throw new Error(t("Seed de proposition manquante."))
        setPreviewSeed(resolvedSeed)
      } catch {
        setPreviewActionError(
          msg("Impossible de trouver une nouvelle proposition pour le moment. Réessaie."),
        )
      } finally {
        setIsShuffling(false)
      }
    })
  }

  const palettePreview = useMemo(() => {
    if (generationMode === 'surprise' && previewTemplate?.palette) {
      return ['background', 'primary', 'secondary', 'accent']
        .map((key) => previewTemplate.palette[key])
    }
    if (brief.colors.mode === 'custom') {
      return [brief.colors.background, brief.colors.primary, brief.colors.secondary, brief.colors.accent]
    }
    const family = generatedFamilies.find(({ id }) => id === brief.artDirection.family)
    const palette = createPaletteFromColor({
      primary: brief.colors.mode === 'auto' ? family?.color : brief.colors.primary,
      harmony: brief.colors.mode === 'auto' || brief.colors.harmony === 'auto'
        ? family?.harmony
        : brief.colors.harmony,
      mood: brief.colors.mood === 'auto' ? family?.mood : brief.colors.mood,
    })
    return [palette.background, palette.primary, palette.secondary, palette.accent]
  }, [brief.artDirection.family, brief.colors, generationMode, previewTemplate])

  const goNext = () => {
    if (step.id === 'identity' && !brief.tournament.name.trim()) {
      setError(msg("Le nom du tournoi est obligatoire."))
      return
    }
    setError('')
    setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))
  }

  const goBack = () => {
    if (stepIndex === 0) onBack()
    else setStepIndex((current) => current - 1)
  }

  const selectedFamily = guidedFamilies.find(({ id }) => id === brief.artDirection.family)
  const selectedLayout = generatedLayouts.find(({ id }) => id === brief.composition.layoutFamily)
  const selectedShape = PANEL_SHAPES.find(([id]) => id === brief.panels.shapeStyle)
  const selectedTypography = TYPOGRAPHIES.find(([id]) => id === brief.typography.family)
  const intensityIndex = Math.min(3, Math.floor(Number(brief.artDirection.intensity) / 25))
  return (
    <>
      <header className="wizard-header">
        <p className="eyebrow">{t("Assistant de création")}</p>
        <h2 id="project-dialog-title" ref={headingRef} tabIndex="-1">{t(step.label)}</h2>
        <div className="wizard-progress" aria-label={t("Étape {0} sur {1}", { 0: stepIndex + 1, 1: STEPS.length })}>
          {STEPS.map((item, index) => (
            <span key={item.id} className={index === stepIndex ? 'is-current' : index < stepIndex ? 'is-complete' : ''}>
              <i>{index + 1}</i><small>{t(item.label)}</small>
            </span>
          ))}
        </div>
      </header>

      <div className="wizard-body">
        <div className="wizard-workspace">
          <div className="wizard-controls">
        {step.id === 'identity' && (
          <div className="wizard-form-grid">
            <label className="text-control wizard-field wizard-field-wide" htmlFor="wizard-tournament-name">{t("Nom du tournoi ")}<span aria-hidden="true">*</span>
              <input id="wizard-tournament-name" value={brief.tournament.name} autoComplete="organization" onChange={(event) => { patchSection('tournament', { name: event.target.value }); setError('') }} />
            </label>
            <label className="text-control wizard-field wizard-field-wide" htmlFor="wizard-subtitle">{t("Sous-titre / édition ")}<small>{t("Optionnel")}</small>
              <input id="wizard-subtitle" value={brief.tournament.subtitle} placeholder={t("Weekly #34")} onChange={(event) => patchSection('tournament', { subtitle: event.target.value })} />
            </label>
            <label className="text-control wizard-field" htmlFor="wizard-date">{t("Date ")}<small>{t("Optionnel")}</small>
              <input id="wizard-date" type="date" value={brief.tournament.date} onChange={(event) => patchSection('tournament', { date: event.target.value })} />
            </label>
            <label className="text-control wizard-field" htmlFor="wizard-entrants">{t("Participants ")}<small>{t("Optionnel")}</small>
              <input id="wizard-entrants" type="number" min="0" inputMode="numeric" value={brief.tournament.entrants} onChange={(event) => patchSection('tournament', { entrants: event.target.value })} />
            </label>
            <fieldset className="wizard-fieldset wizard-field-wide">
              <legend>{t("Type d’événement")}</legend>
              <div className="wizard-chip-list">
                {EVENT_TYPES.map(([id, label]) => <button type="button" key={id} className={brief.tournament.eventType === id ? 'is-selected' : ''} aria-pressed={brief.tournament.eventType === id} onClick={() => patchSection('tournament', { eventType: id })}>{t(label)}</button>)}
              </div>
            </fieldset>
          </div>
        )}

        {step.id === 'direction' && (
          <>
            <p className="wizard-question">{t("Jusqu'où le générateur peut-il aller ?")}</p>
            <div className="wizard-surprise-row">
              <ChoiceCard
                className="wizard-surprise-choice"
                selected={generationMode === 'surprise'}
                title={t("Surprends-moi")}
                description={t("BracketCanvas choisit librement la direction artistique, la composition, les formes, la palette et le traitement graphique.")}
                icon={<DiceIcon />}
                onClick={() => patchSection('generation', { mode: 'surprise' })}
              />
            </div>

            <fieldset className="wizard-fieldset wizard-variation-fieldset">
              <legend>{t("Niveau de variation")}</legend>
              <div className="wizard-choice-grid wizard-variation-grid">
                {variationOptions.map((variation) => (
                  <ChoiceCard
                    key={variation.id}
                    selected={variationId === variation.id}
                    title={variation.label}
                    description={variation.description}
                    onClick={() => patchSection('generation', { variation: variation.id })}
                  />
                ))}
              </div>
            </fieldset>

            <div className="wizard-guided-heading">
              <span>{t("Ou guide la direction artistique")}</span>
              {generationMode === 'guided' && <small>{t("Mode guidé actif")}</small>}
            </div>
            <div className="wizard-choice-grid wizard-family-grid">
              {guidedFamilies.map((family) => (
                <ChoiceCard
                  key={family.id}
                  selected={generationMode === 'guided' && brief.artDirection.family === family.id}
                  color={family.color}
                  title={family.label}
                  description={family.description}
                  onClick={() => chooseGuidedFamily(family.id)}
                />
              ))}
            </div>
            <SliderField id="wizard-intensity" label={t("Intensité — {0}", { 0: t(generatedIntensityLabels[intensityIndex]) })} low={t("Sobre")} high={t("Très marqué")} value={brief.artDirection.intensity} onChange={(intensity) => patchSection('artDirection', { intensity })} />
          </>
        )}

        {step.id === 'composition' && (
          <>
            <p className="wizard-question">{t("Quel type de composition ?")}</p>
            {autoLayout && (
              <div className="wizard-layout-auto">
                <ChoiceCard
                  selected={brief.composition.layoutFamily === autoLayout.id}
                  title={autoLayout.label}
                  description={autoLayout.description || t("Choisir une structure cohérente avec le reste du brief.")}
                  onClick={() => patchSection('composition', { layoutFamily: autoLayout.id })}
                />
              </div>
            )}
            <div className="wizard-layout-groups">
              {layoutGroups.map((group) => (
                <fieldset className="wizard-fieldset wizard-layout-group" key={group.id}>
                  <legend>{t(formatGroupLabel(group.id))}</legend>
                  <div className="wizard-choice-grid wizard-layout-grid">
                    {group.layouts.map((layout) => (
                      <ChoiceCard
                        key={layout.id}
                        selected={brief.composition.layoutFamily === layout.id}
                        title={layout.label}
                        description={layout.description}
                        onClick={() => patchSection('composition', { layoutFamily: layout.id })}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <div className="wizard-slider-grid">
              <SliderField id="wizard-dominance" label={t("Importance du Top 1")} low={t("Discret")} high={t("Dominant")} value={brief.composition.winnerDominance} onChange={(winnerDominance) => patchSection('composition', { winnerDominance })} />
              <SliderField id="wizard-density" label={t("Densité de la composition")} low={t("Aéré")} high={t("Compact")} value={brief.composition.density} onChange={(density) => patchSection('composition', { density })} />
              <SliderField id="wizard-symmetry" label={t("Symétrie")} low={t("Très asymétrique")} high={t("Très structuré")} value={brief.composition.symmetry} onChange={(symmetry) => patchSection('composition', { symmetry })} />
            </div>
          </>
        )}

        {step.id === 'panels' && (
          <>
            <p className="wizard-question">{t("Donne une vraie personnalité aux huit cases.")}</p>
            <fieldset className="wizard-fieldset wizard-fieldset-first">
              <legend>{t("Forme des cases")}</legend>
              <div className="wizard-choice-grid wizard-option-grid">
                {PANEL_SHAPES.map(([id, title, description]) => <ChoiceCard key={id} selected={brief.panels.shapeStyle === id} title={title} description={description} onClick={() => patchSection('panels', { shapeStyle: id })} />)}
              </div>
            </fieldset>
            <div className="wizard-two-column-options">
              <fieldset className="wizard-fieldset">
                <legend>{t("Style des cadres")}</legend>
                <div className="wizard-chip-list">{FRAME_STYLES.map(([id, label]) => <button type="button" key={id} className={brief.panels.frameStyle === id ? 'is-selected' : ''} aria-pressed={brief.panels.frameStyle === id} onClick={() => patchSection('panels', { frameStyle: id })}>{t(label)}</button>)}</div>
              </fieldset>
              <fieldset className="wizard-fieldset">
                <legend>{t("Position des pseudos")}</legend>
                <div className="wizard-chip-list">{LABEL_POSITIONS.map(([id, label]) => <button type="button" key={id} className={brief.panels.labelPosition === id ? 'is-selected' : ''} aria-pressed={brief.panels.labelPosition === id} onClick={() => patchSection('panels', { labelPosition: id })}>{t(label)}</button>)}</div>
              </fieldset>
            </div>
            <fieldset className="wizard-fieldset">
              <legend>{t("Texture intérieure")}</legend>
              <div className="wizard-chip-list">{TEXTURES.map(([id, label]) => <button type="button" key={id} className={brief.panels.texture === id ? 'is-selected' : ''} aria-pressed={brief.panels.texture === id} onClick={() => patchSection('panels', { texture: id })}>{t(label)}</button>)}</div>
            </fieldset>
            <div className="wizard-slider-grid wizard-slider-grid-two">
              <SliderField id="wizard-label-width" label={t("Largeur des pseudos")} low={t("Courte")} high={t("Pleine largeur")} value={brief.panels.labelWidth} onChange={(labelWidth) => patchSection('panels', { labelWidth })} />
              <SliderField id="wizard-texture-scale" label={t("Échelle du motif")} low={t("Fine")} high={t("Large")} value={brief.panels.textureScale} onChange={(textureScale) => patchSection('panels', { textureScale })} />
            </div>
          </>
        )}

        {step.id === 'typography' && (
          <>
            <p className="wizard-question">{t("Comment le tournoi doit-il prendre la parole ?")}</p>
            <div className="wizard-choice-grid wizard-typography-grid">
              {TYPOGRAPHIES.map(([id, title, description]) => <ChoiceCard key={id} selected={brief.typography.family === id} title={title} description={description} onClick={() => patchSection('typography', { family: id })} />)}
            </div>
            <div className="wizard-two-column-options">
              <fieldset className="wizard-fieldset">
                <legend>{t("Style des placements")}</legend>
                <div className="wizard-chip-list">{RANK_STYLES.map(([id, label]) => <button type="button" key={id} className={brief.typography.rankStyle === id ? 'is-selected' : ''} aria-pressed={brief.typography.rankStyle === id} onClick={() => patchSection('typography', { rankStyle: id })}>{t(label)}</button>)}</div>
              </fieldset>
              <fieldset className="wizard-fieldset">
                <legend>{t("Construction du bandeau")}</legend>
                <div className="wizard-chip-list">{HEADER_STYLES.map(([id, label]) => <button type="button" key={id} className={brief.typography.headerStyle === id ? 'is-selected' : ''} aria-pressed={brief.typography.headerStyle === id} onClick={() => patchSection('typography', { headerStyle: id })}>{t(label)}</button>)}</div>
              </fieldset>
            </div>
            <SliderField id="wizard-background-energy" label={t("Énergie du fond")} low={t("Très calme")} high={t("Très présent")} value={brief.typography.backgroundEnergy} onChange={(backgroundEnergy) => patchSection('typography', { backgroundEnergy })} />
          </>
        )}

        {step.id === 'colors' && (
          <>
            <p className="wizard-question">{t("Quelle palette veux-tu ?")}</p>
            <div className="wizard-choice-grid wizard-color-modes">
              {COLOR_MODES.map(([id, title, description]) => <ChoiceCard key={id} selected={brief.colors.mode === id} title={title} description={description} onClick={() => patchSection('colors', { mode: id })} />)}
            </div>
            {brief.colors.mode !== 'auto' && (
              <div className="wizard-color-fields">
                <label>{t("Principale ")}<input type="color" value={brief.colors.primary} onChange={(event) => patchSection('colors', { primary: event.target.value })} /></label>
                {brief.colors.mode === 'custom' && <>
                  <label>{t("Secondaire ")}<input type="color" value={brief.colors.secondary} onChange={(event) => patchSection('colors', { secondary: event.target.value })} /></label>
                  <label>{t("Accent ")}<input type="color" value={brief.colors.accent} onChange={(event) => patchSection('colors', { accent: event.target.value })} /></label>
                  <label>{t("Fond ")}<input type="color" value={brief.colors.background} onChange={(event) => patchSection('colors', { background: event.target.value })} /></label>
                </>}
              </div>
            )}
            <fieldset className="wizard-fieldset">
              <legend>{t("Ambiance couleur")}</legend>
              <div className="wizard-chip-list">{COLOR_MOODS.map(([id, label]) => <button type="button" key={id} className={brief.colors.mood === id ? 'is-selected' : ''} aria-pressed={brief.colors.mood === id} onClick={() => patchSection('colors', { mood: id })}>{t(label)}</button>)}</div>
            </fieldset>
            <div className="wizard-palette-preview" aria-label={t("Aperçu de la palette")}>{palettePreview.map((color, index) => <span key={`${color}-${index}`} style={{ background: color }} title={color} />)}</div>
          </>
        )}

        {step.id === 'summary' && (
          <div className="wizard-summary">
            <div><span>{t("Nom")}</span><strong>{brief.tournament.name}</strong><small>{brief.tournament.subtitle || t("Sans sous-titre")}</small></div>
            <div><span>{t("Direction artistique")}</span><strong>{generationMode === 'surprise' ? t("Surprends-moi") : t(selectedFamily?.label)}</strong><small>{t(generatedIntensityLabels[intensityIndex])}</small></div>
            <div><span>{t("Variation")}</span><strong>{t(selectedVariation?.label) || variationId}</strong><small>{t(selectedVariation?.description)}</small></div>
            <div><span>{t("Composition")}</span><strong>{t(selectedLayout?.label)}</strong><small>{t("Top 1 à ")}{brief.composition.winnerDominance}{t("% · densité ")}{brief.composition.density}%</small></div>
            <div><span>{t("Cases")}</span><strong>{t(selectedShape?.[1] || 'Choisir pour moi')}</strong><small>{t(FRAME_STYLES.find(([id]) => id === brief.panels.frameStyle)?.[1] || 'Cadre automatique')}{t(" · pseudos ")}{t(LABEL_POSITIONS.find(([id]) => id === brief.panels.labelPosition)?.[1] || 'automatiques').toLowerCase()}</small></div>
            <div><span>{t("Typographie")}</span><strong>{t(selectedTypography?.[1] || 'Adaptée à l’univers')}</strong><small>{t("Placements ")}{t(RANK_STYLES.find(([id]) => id === brief.typography.rankStyle)?.[1] || 'automatiques').toLowerCase()}{t(" · bandeau ")}{t(HEADER_STYLES.find(([id]) => id === brief.typography.headerStyle)?.[1] || 'automatique').toLowerCase()}</small></div>
            <div><span>{t("Palette")}</span><strong>{t(COLOR_MODES.find(([id]) => id === brief.colors.mode)?.[1])}</strong><div className="wizard-palette-preview">{palettePreview.map((color, index) => <span key={`${color}-${index}`} style={{ background: color }} />)}</div></div>
          </div>
        )}

        {error && <p className="project-dialog-error" role="alert">{t(error)}</p>}
          </div>
          <TemplateLivePreview
            template={previewTemplate}
            brief={brief}
            error={previewActionError || previewResult.error}
            isBusy={isShuffling}
            onShuffle={shuffleProposal}
          />
        </div>
      </div>

      <div className="project-dialog-actions wizard-actions">
        <button type="button" onClick={goBack}>{t("Retour")}</button>
        {!required && <button type="button" onClick={onCancel}>{t("Annuler")}</button>}
        {step.id === 'summary'
          ? <button type="button" className="wizard-generate-button" disabled={!previewTemplate || isShuffling} onClick={() => onSubmit(brief, previewTemplate.seed)}>{t("Générer mon modèle")}</button>
          : <button type="button" onClick={goNext}>{t("Continuer")}</button>}
      </div>
    </>
  )
}
