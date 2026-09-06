import { t, useLanguage } from '../i18n.js'
import { useEffect, useMemo, useState } from 'react'
import {
  analyzeGeneratedTemplate,
  createDefaultGenerationBrief,
  createTemplateSeed,
  generateTemplate,
  generatedFamilies,
  getTemplateSignature,
  templateSignatureDistance,
} from '../templates/generated/generator.js'
import Top8Canvas from './Top8Canvas.jsx'
import LanguageSelect from './LanguageSelect.jsx'
import './TemplateDiversityBoard.css'

const COUNTS = [20, 30, 50]
const VARIATIONS = [
  { id: 'coherent', label: 'Cohérent' },
  { id: 'creative', label: 'Créatif' },
  { id: 'wild', label: 'Sauvage' },
]
const FILTERS = [
  { id: 'all', label: 'Tout' },
  { id: 'invalid', label: 'Invalides' },
  { id: 'duplicates', label: 'Doublons' },
]
const SIGNATURE_FIELDS = [
  ['layoutFamily', 'layout'],
  ['geometryFamily', 'forme'],
  ['backgroundFamily', 'fond'],
  ['typographyFamily', 'typo'],
  ['frameFamily', 'cadre'],
  ['numberSystem', 'numéros'],
]
const NO_SELECTION = Object.freeze({})
const NOOP = () => {}

const median = (values) => {
  if (!values.length) return 0
  const sorted = [...values].sort((first, second) => first - second)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

const stableSerialize = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(',')}]`
  return `{${Object.keys(value).sort().map(
    (key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`,
  ).join(',')}}`
}

const signatureValue = (signature, keys) => {
  if (!signature || typeof signature !== 'object') return ''
  for (const key of keys) {
    const value = signature[key]
    if (typeof value === 'string' && value) return value
  }
  return ''
}

const geometryFingerprint = (template) => (template?.slots || []).map((slot) => [
  Math.round(slot.x), Math.round(slot.y), Math.round(slot.width),
  Math.round(slot.height), slot.points?.length || 0,
].join(':')).join('|')

const normalizeIssue = (issue) => {
  if (typeof issue === 'string') return issue
  return issue?.message || issue?.code || t("Problème non détaillé")
}

const normalizeAnalysis = (analysis) => {
  const issues = [
    ...(Array.isArray(analysis?.hardErrors) ? analysis.hardErrors : []),
    ...(Array.isArray(analysis?.errors) ? analysis.errors : []),
    ...(Array.isArray(analysis?.issues)
      ? analysis.issues.filter((issue) =>
          ['error', 'fatal'].includes(issue?.severity || issue?.level))
      : []),
  ].map(normalizeIssue)
  const warnings = [
    ...(Array.isArray(analysis?.warnings) ? analysis.warnings : []),
    ...(Array.isArray(analysis?.issues)
      ? analysis.issues.filter((issue) =>
          !['error', 'fatal'].includes(issue?.severity || issue?.level))
      : []),
  ].map(normalizeIssue)
  const score = Number(analysis?.score)

  return {
    valid: typeof analysis?.valid === 'boolean' ? analysis.valid : issues.length === 0,
    score: Number.isFinite(score) ? Math.round(score) : 0,
    issues: [...new Set(issues)],
    warnings: [...new Set(warnings)],
  }
}

const isRenderableTemplate = (template) =>
  Boolean(
    template &&
    Number(template.width) > 0 &&
    Number(template.height) > 0 &&
    Array.isArray(template.layers) &&
    Array.isArray(template.decorations) &&
    Array.isArray(template.metadata) &&
    Array.isArray(template.slots) &&
    template.slots.length === 8 &&
    template.slots.every((slot) => slot?.rank && slot?.nameZone),
  )

const createPreviewPlayers = (template) => template.slots.map((slot, index) => ({
  id: slot.id,
  placement: slot.placement,
  playerName: t('JOUEUR {0}', { 0: index + 1 }),
  character: '',
  renderId: '',
  render: '',
  secondaryCharacter: '',
  secondaryRenderId: '',
  secondaryRender: '',
  teamLogo: '',
  teamLogoName: '',
  rankX: slot.rank.x,
  rankY: slot.rank.y,
  rankSize: slot.rank.size,
  rankColor: slot.rank.color,
  rankLayer: slot.rank.layer,
  x: 0,
  y: 0,
  scale: 1,
  flipped: false,
  opacity: 100,
  secondaryX: 18,
  secondaryY: 0,
  secondaryScale: 1,
  secondaryFlipped: false,
  secondaryOpacity: 100,
}))

const scheduleIdle = (callback) => {
  if (typeof window.requestIdleCallback === 'function') {
    return { type: 'idle', id: window.requestIdleCallback(callback, { timeout: 120 }) }
  }
  return { type: 'timeout', id: window.setTimeout(() => callback(null), 0) }
}

const cancelScheduled = (scheduled) => {
  if (!scheduled) return
  if (scheduled.type === 'idle') window.cancelIdleCallback(scheduled.id)
  else window.clearTimeout(scheduled.id)
}

function TemplateCard({ entry }) {
  const language = useLanguage()
  const players = useMemo(() => {
    void language
    return entry.renderable ? createPreviewPlayers(entry.template) : []
  }, [entry.renderable, entry.template, language])
  const eventDetails = useMemo(() => ({
    eventName: 'DIVERSITY AUDIT',
    subtitle: `SEED ${String(entry.index + 1).padStart(2, '0')}`,
    date: '16/08/2026',
    participantCount: '128',
    tournamentLogo: '',
  }), [entry.index])
  const signatureBadges = SIGNATURE_FIELDS.map(([key, label]) => ({
    key,
    label,
    value: signatureValue(entry.signature, [key, key.replace(/Family$/, 'Id')]),
  })).filter(({ value }) => value)

  return (
    <article
      className={`tdb-card${entry.analysis.valid ? '' : ' is-invalid'}${entry.duplicate ? ' is-duplicate' : ''}`}
      aria-labelledby={`tdb-card-${entry.index}`}
    >
      <header className="tdb-card-header">
        <div>
          <span className="tdb-card-index">#{String(entry.index + 1).padStart(2, '0')}</span>
          <h2 id={`tdb-card-${entry.index}`}>{entry.template?.name || t("Génération impossible")}</h2>
          <p>{entry.seed}</p>
        </div>
        <span
          className={`tdb-score${entry.analysis.valid ? ' is-valid' : ' is-invalid'}`}
          aria-label={t('Score {0} sur 100, {1}', { 0: entry.analysis.score, 1: entry.analysis.valid ? t('valide') : t('invalide') })}
        >
          <strong>{entry.analysis.score}</strong>
          <small>{entry.analysis.valid ? t("valide") : t("invalide")}</small>
        </span>
      </header>

      <div className="tdb-preview" aria-label={t('Aperçu {0}', { 0: entry.index + 1 })}>
        {entry.renderable ? (
          <Top8Canvas
            template={entry.template}
            players={players}
            eventDetails={eventDetails}
            selectedLayer={NO_SELECTION}
            onPlayerChange={NOOP}
            onSelectLayer={NOOP}
          />
        ) : (
          <div className="tdb-preview-error" role="img" aria-label={t("Template non affichable")}>
            <strong>{t("Template non affichable")}</strong>
            <span>{t("Le contrat minimal du canvas n’est pas respecté.")}</span>
          </div>
        )}
      </div>

      <div className="tdb-card-meta">
        <div className="tdb-signature" title={entry.signatureKey}>
          {signatureBadges.length ? signatureBadges.map(({ key, label, value }) => (
            <span key={key}><small>{t(label)}</small>{value}</span>
          )) : <span><small>signature</small>{entry.signatureKey || '—'}</span>}
        </div>
        {(entry.duplicate || entry.analysis.issues.length > 0 || entry.analysis.warnings.length > 0) && (
          <ul className="tdb-issues">
            {entry.duplicate && <li>{t("Signature dupliquée dans cette planche.")}</li>}
            {entry.analysis.issues.slice(0, 2).map((issue) => <li key={issue}>{t(issue)}</li>)}
            {entry.analysis.warnings.slice(0, 1).map((warning) => <li key={warning}>{t("Avertissement : ")}{t(warning)}</li>)}
          </ul>
        )}
      </div>
    </article>
  )
}

export default function TemplateDiversityBoard() {
  useLanguage()
  const [count, setCount] = useState(20)
  const [family, setFamily] = useState('surprise')
  const [variation, setVariation] = useState('creative')
  const [filter, setFilter] = useState('all')
  const [seedDraft, setSeedDraft] = useState(() => createTemplateSeed())
  const [rootSeed, setRootSeed] = useState(seedDraft)
  const [entries, setEntries] = useState([])
  const [progress, setProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(true)

  useEffect(() => {
    let cancelled = false
    let scheduled = null
    let cursor = 0

    setEntries([])
    setProgress(0)
    setIsGenerating(true)

    const generateBatch = (deadline) => {
      if (cancelled) return
      const batch = []
      const batchStartedAt = performance.now()

      while (
        cursor < count &&
        batch.length < 4 &&
        (
          batch.length === 0 ||
          (!deadline && performance.now() - batchStartedAt < 18) ||
          (deadline && (deadline.didTimeout || deadline.timeRemaining() > 4))
        )
      ) {
        const index = cursor
        const seed = `${rootSeed}/${String(index + 1).padStart(2, '0')}`
        cursor += 1

        try {
          const brief = createDefaultGenerationBrief('DIVERSITY AUDIT')
          brief.tournament.subtitle = `SEED ${String(index + 1).padStart(2, '0')}`
          brief.tournament.date = '2026-08-16'
          brief.tournament.entrants = '128'
          brief.artDirection = {
            ...brief.artDirection,
            family,
          }
          brief.generation = {
            ...brief.generation,
            mode: family === 'surprise' ? 'surprise' : 'guided',
            variation,
          }
          const template = generateTemplate({ brief, seed })
          const analysis = normalizeAnalysis(analyzeGeneratedTemplate(template))
          const signature = getTemplateSignature(template)
          batch.push({
            index,
            seed,
            template,
            analysis,
            signature,
            signatureKey: stableSerialize(signature),
            renderable: isRenderableTemplate(template),
          })
        } catch (error) {
          batch.push({
            index,
            seed,
            template: null,
            analysis: {
              valid: false,
              score: 0,
              issues: [error?.message || t("La génération a échoué.")],
              warnings: [],
            },
            signature: null,
            signatureKey: '',
            renderable: false,
          })
        }
      }

      if (cancelled) return
      setEntries((current) => [...current, ...batch])
      setProgress(cursor)

      if (cursor < count) scheduled = scheduleIdle(generateBatch)
      else setIsGenerating(false)
    }

    scheduled = scheduleIdle(generateBatch)
    return () => {
      cancelled = true
      cancelScheduled(scheduled)
    }
  }, [count, family, rootSeed, variation])

  const auditedEntries = useMemo(() => {
    const signatureCounts = new Map()
    entries.forEach(({ signatureKey }) => {
      if (!signatureKey) return
      signatureCounts.set(signatureKey, (signatureCounts.get(signatureKey) || 0) + 1)
    })
    return entries.map((entry) => ({
      ...entry,
      duplicate: Boolean(
        entry.signatureKey && signatureCounts.get(entry.signatureKey) > 1,
      ),
    }))
  }, [entries])

  const stats = useMemo(() => {
    const signatures = auditedEntries
      .filter(({ signature }) => signature)
      .map(({ signature }) => signature)
    const distances = []
    for (let first = 0; first < signatures.length; first += 1) {
      for (let second = first + 1; second < signatures.length; second += 1) {
        const value = Number(templateSignatureDistance(signatures[first], signatures[second]))
        if (Number.isFinite(value)) distances.push(value)
      }
    }
    const layoutIds = new Set(auditedEntries.map(({ signature, template }) =>
      signatureValue(signature, ['layoutFamily', 'layoutId']) || template?.layoutId,
    ).filter(Boolean))
    const geometryIds = new Set(auditedEntries.map(({ signature, template }) =>
      signatureValue(signature, ['geometryFamily', 'geometryId']) || geometryFingerprint(template),
    ).filter(Boolean))

    return {
      valid: auditedEntries.filter(({ analysis }) => analysis.valid).length,
      signatures: new Set(auditedEntries.map(({ signatureKey }) => signatureKey).filter(Boolean)).size,
      layouts: layoutIds.size,
      geometries: geometryIds.size,
      distance: median(distances),
      duplicates: auditedEntries.filter(({ duplicate }) => duplicate).length,
    }
  }, [auditedEntries])

  const visibleEntries = useMemo(() => auditedEntries.filter((entry) => {
    if (filter === 'invalid') return !entry.analysis.valid
    if (filter === 'duplicates') return entry.duplicate
    return true
  }), [auditedEntries, filter])

  const applySeed = (event) => {
    event.preventDefault()
    const nextSeed = seedDraft.trim()
    if (nextSeed) setRootSeed(nextSeed)
  }

  const randomizeSeed = () => {
    const nextSeed = createTemplateSeed()
    setSeedDraft(nextSeed)
    setRootSeed(nextSeed)
  }

  return (
    <main className="template-diversity-board">
      <header className="tdb-page-header">
        <div className="tdb-title-block">
          <span className="tdb-dev-label">{t('DÉVELOPPEMENT UNIQUEMENT')}</span>
          <LanguageSelect />
          <p>{t("BracketCanvas / audit du générateur")}</p>
        <h1>{t('Planche de diversité des modèles')}</h1>
          <span>{t("Une planche réelle pour juger la variété visuelle, la qualité et les doublons.")}</span>
        </div>

        <section className="tdb-controls" aria-label={t("Paramètres de la planche")}>
          <form className="tdb-seed-control" onSubmit={applySeed}>
            <label htmlFor="tdb-seed">{t("Seed racine")}</label>
            <div>
              <input
                id="tdb-seed"
                value={seedDraft}
                spellCheck="false"
                onChange={(event) => setSeedDraft(event.target.value)}
              />
              <button type="submit" disabled={!seedDraft.trim()}>{t("Appliquer")}</button>
              <button type="button" onClick={randomizeSeed}>{t("Nouvelle seed")}</button>
            </div>
          </form>

          <label className="tdb-select-control" htmlFor="tdb-family">{t("Direction artistique")}<select id="tdb-family" value={family} onChange={(event) => setFamily(event.target.value)}>
              <option value="surprise">{t("Surprends-moi · toutes les directions")}</option>
              {generatedFamilies.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{t(candidate.label)}</option>
              ))}
            </select>
          </label>

          <fieldset className="tdb-segment-control">
            <legend>{t("Variation")}</legend>
            <div>{VARIATIONS.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                className={variation === candidate.id ? 'is-active' : ''}
                aria-pressed={variation === candidate.id}
                onClick={() => setVariation(candidate.id)}
              >
                {t(candidate.label)}
              </button>
            ))}</div>
          </fieldset>

          <fieldset className="tdb-segment-control">
            <legend>{t("Nombre de previews")}</legend>
            <div>{COUNTS.map((candidate) => (
              <button
                type="button"
                key={candidate}
                className={count === candidate ? 'is-active' : ''}
                aria-pressed={count === candidate}
                onClick={() => setCount(candidate)}
              >
                {candidate}
              </button>
            ))}</div>
          </fieldset>
        </section>
      </header>

      <section className="tdb-summary" aria-label={t("Résultats de l’audit")}>
        <div className="tdb-stat"><small>{t("Validité")}</small><strong>{stats.valid}/{entries.length || count}</strong></div>
        <div className="tdb-stat"><small>{t("Signatures")}</small><strong>{stats.signatures}</strong></div>
        <div className="tdb-stat"><small>{t("Layouts")}</small><strong>{stats.layouts}</strong></div>
        <div className="tdb-stat"><small>{t("Géométries")}</small><strong>{stats.geometries}</strong></div>
        <div className="tdb-stat"><small>{t("Distance médiane")}</small><strong>{stats.distance.toFixed(2)}</strong></div>
        <div className="tdb-stat"><small>{t("Doublons")}</small><strong>{stats.duplicates}</strong></div>

        <fieldset className="tdb-filter-control">
          <legend>{t("Filtrer la planche")}</legend>
          <div>{FILTERS.map((candidate) => (
            <button
              type="button"
              key={candidate.id}
              className={filter === candidate.id ? 'is-active' : ''}
              aria-pressed={filter === candidate.id}
              onClick={() => setFilter(candidate.id)}
            >
              {t(candidate.label)}
            </button>
          ))}</div>
        </fieldset>
      </section>

      <div className="tdb-progress" aria-live="polite">
        <span>{isGenerating ? t('Génération {0}/{1}', { 0: progress, 1: count }) : t(visibleEntries.length === 1 ? '{0} aperçu affiché' : '{0} aperçus affichés', { 0: visibleEntries.length })}</span>
        <progress max={count} value={progress}>{progress}{t(" sur ")}{count}</progress>
      </div>

      {visibleEntries.length > 0 ? (
        <section className="tdb-grid" aria-label={t("Previews des templates")}>
          {visibleEntries.map((entry) => <TemplateCard key={entry.seed} entry={entry} />)}
        </section>
      ) : !isGenerating && (
        <div className="tdb-empty" role="status">
          <strong>{t("Aucun résultat pour ce filtre.")}</strong>
          <span>{t("La planche ne contient ni template invalide ni doublon correspondant.")}</span>
        </div>
      )}
    </main>
  )
}
