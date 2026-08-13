import { useEffect, useMemo, useRef, useState } from 'react'
import {
  PALETTE_KEYS,
  PALETTE_LABELS,
  createPalettePreset,
  createRandomPalette,
  getPaletteWarnings,
  normalizeHex,
  regeneratePalette,
  transformPalette,
} from '../templates/generated/palette.js'

const HARMONIES = [
  ['complementary', 'Complémentaire'], ['analogous', 'Analogue'],
  ['triadic', 'Triadique'], ['monochrome', 'Monochrome'],
  ['high-contrast', 'Contraste fort'],
]

const PRESETS = [
  ['original', 'Original'], ['dark', 'Dark'], ['light', 'Light'],
  ['monochrome', 'Monochrome'], ['high-contrast', 'High Contrast'],
]

function PaletteIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 0-3.6h-.7a1.7 1.7 0 0 1 0-3.4H15a6 6 0 0 0 0-12h-3Z" /><circle cx="7.5" cy="10" r="1" /><circle cx="9.5" cy="6.5" r="1" /><circle cx="14" cy="6" r="1" /></svg>
}

function LockIcon({ locked }) {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="8" width="12" height="9" rx="2" /><path d={locked ? 'M6.5 8V5.7a3.5 3.5 0 0 1 7 0V8' : 'M7 8V5.8a3.5 3.5 0 0 1 6.4-2'} /></svg>
}

const DEFAULT_TRANSFORMS = { hue: 0, saturation: 100, lightness: 0, contrast: 100 }

export default function PaletteEditor({ template, onClose, onChange }) {
  const [basePalette, setBasePalette] = useState(template.palette)
  const [transforms, setTransforms] = useState(DEFAULT_TRANSFORMS)
  const [sourceColor, setSourceColor] = useState(template.palette.primary)
  const [harmony, setHarmony] = useState('analogous')
  const headingRef = useRef(null)
  const palette = template.palette
  const locks = template.paletteLocks || []
  const warnings = useMemo(() => getPaletteWarnings(palette), [palette])

  useEffect(() => {
    headingRef.current?.focus()
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const commit = (nextPalette, nextLocks = locks, resetTransforms = true) => {
    onChange(nextPalette, nextLocks)
    if (resetTransforms) {
      setBasePalette(nextPalette)
      setTransforms(DEFAULT_TRANSFORMS)
    }
  }

  const changeTransform = (key, value) => {
    const nextTransforms = { ...transforms, [key]: value }
    setTransforms(nextTransforms)
    onChange(transformPalette(basePalette, { ...nextTransforms, locks }), locks)
  }

  const toggleLock = (key) => {
    const nextLocks = locks.includes(key)
      ? locks.filter((candidate) => candidate !== key)
      : [...locks, key]
    onChange(palette, nextLocks)
  }

  const generateFromColor = () => commit(regeneratePalette({
    current: palette,
    primary: sourceColor,
    harmony,
    mood: template.generationBrief?.colors?.mood || 'dark',
    locks,
  }))

  const applyPreset = (preset) => commit(createPalettePreset(
    preset,
    template.originalPalette,
    palette,
    locks,
  ))

  return (
    <div className="palette-editor-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="palette-editor" role="dialog" aria-modal="true" aria-labelledby="palette-editor-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className="palette-editor-title-row">
            <span className="palette-editor-icon"><PaletteIcon /></span>
            <div><p className="eyebrow">Direction artistique</p><h2 id="palette-editor-title" ref={headingRef} tabIndex="-1">Palette globale</h2></div>
          </div>
          <button className="palette-close" type="button" aria-label="Fermer l’éditeur de palette" onClick={onClose}>×</button>
        </header>

        <div className="palette-editor-scroll">
          <section aria-labelledby="palette-tokens-title">
            <div className="palette-section-heading"><h3 id="palette-tokens-title">Couleurs du template</h3><small>Modifications en temps réel</small></div>
            <div className="palette-token-list">
              {PALETTE_KEYS.map((key) => (
                <div className="palette-token" key={key}>
                  <label htmlFor={`palette-${key}`}><input id={`palette-${key}`} type="color" value={palette[key]} onChange={(event) => commit({ ...palette, [key]: normalizeHex(event.target.value) })} /><span>{PALETTE_LABELS[key]}</span><code>{palette[key]}</code></label>
                  <button type="button" className={locks.includes(key) ? 'is-locked' : ''} aria-label={`${locks.includes(key) ? 'Déverrouiller' : 'Verrouiller'} ${PALETTE_LABELS[key]}`} aria-pressed={locks.includes(key)} onClick={() => toggleLock(key)}><LockIcon locked={locks.includes(key)} /></button>
                </div>
              ))}
            </div>
            {warnings.length > 0 && <p className="palette-warning" role="status">Contraste faible : {warnings.join(', ')}. Le choix manuel reste appliqué.</p>}
          </section>

          <section aria-labelledby="palette-harmony-title">
            <div className="palette-section-heading"><h3 id="palette-harmony-title">Générer depuis une couleur</h3></div>
            <div className="palette-source-row"><label htmlFor="palette-source">Couleur principale<input id="palette-source" type="color" value={sourceColor} onChange={(event) => setSourceColor(event.target.value)} /></label><select aria-label="Type d’harmonie" value={harmony} onChange={(event) => setHarmony(event.target.value)}>{HARMONIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
            <button className="palette-wide-action" type="button" onClick={generateFromColor}>Créer une palette à partir de cette couleur</button>
          </section>

          <section aria-labelledby="palette-adjustments-title">
            <div className="palette-section-heading"><h3 id="palette-adjustments-title">Réglages globaux</h3><button type="button" onClick={() => { setBasePalette(palette); setTransforms(DEFAULT_TRANSFORMS) }}>Définir comme base</button></div>
            {[
              ['hue', 'Teinte globale', -180, 180, '°'],
              ['saturation', 'Saturation', 0, 200, '%'],
              ['lightness', 'Luminosité', -35, 35, ''],
              ['contrast', 'Contraste', 50, 160, '%'],
            ].map(([key, label, min, max, suffix]) => <label className="palette-slider" htmlFor={`palette-${key}`} key={key}><span>{label}<output htmlFor={`palette-${key}`}>{transforms[key]}{suffix}</output></span><input id={`palette-${key}`} type="range" min={min} max={max} value={transforms[key]} onChange={(event) => changeTransform(key, Number(event.target.value))} /></label>)}
          </section>

          <section aria-labelledby="palette-presets-title">
            <div className="palette-section-heading"><h3 id="palette-presets-title">Presets</h3></div>
            <div className="palette-preset-grid">{PRESETS.map(([id, label]) => <button key={id} type="button" onClick={() => applyPreset(id)}>{label}</button>)}</div>
          </section>
        </div>

        <footer>
          <button type="button" onClick={() => commit(createRandomPalette({ current: palette, familyHue: template.familyHue, mood: template.generationBrief?.colors?.mood || 'dark', locks }))}>Nouvelle palette</button>
          <button type="button" onClick={() => commit(template.originalPalette, locks)}>Réinitialiser</button>
          <button type="button" className="palette-done" onClick={onClose}>Terminé</button>
        </footer>
      </aside>
    </div>
  )
}
