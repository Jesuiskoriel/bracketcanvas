import { CANVAS_HEIGHT, CANVAS_WIDTH, svgDataUrl } from './constants.js'
import { createHeaderArtwork } from './headers.js'
import { clamp, createRandom, pick, round } from './random.js'

export const backgroundSystems = [
  { id: 'solid', label: 'Aplat graphique' },
  { id: 'linear', label: 'Dégradé directionnel' },
  { id: 'radial', label: 'Halo radial' },
  { id: 'mesh', label: 'Maillage coloré' },
  { id: 'paper', label: 'Papier imprimé' },
  { id: 'duotone', label: 'Duotone' },
  { id: 'deep-space', label: 'Profondeur nocturne' },
]

export const overlaySystems = [
  'grain', 'halftone', 'lines', 'grid', 'rays', 'blocks', 'waves', 'checker',
  'scanlines', 'noise', 'glow', 'stars', 'speed-lines', 'giant-type', 'circuit',
  'bubbles', 'spray', 'vignette', 'runes', 'pixels',
].map((id) => ({ id }))

const baseMarkup = (id, palette) => {
  if (id === 'solid') return `<rect width="686" height="386" fill="${palette.background}"/>`
  if (id === 'radial') return `<defs><radialGradient id="bg" cx="50%" cy="43%" r="78%"><stop stop-color="${palette.primary}"/><stop offset=".43" stop-color="${palette.surface}"/><stop offset="1" stop-color="${palette.background}"/></radialGradient></defs><rect width="686" height="386" fill="url(#bg)"/>`
  if (id === 'mesh') return `<defs><radialGradient id="a" cx="0" cy="0" r="1" gradientTransform="translate(95 88) rotate(31) scale(430 260)"><stop stop-color="${palette.primary}" stop-opacity=".78"/><stop offset="1" stop-color="${palette.primary}" stop-opacity="0"/></radialGradient><radialGradient id="b" cx="0" cy="0" r="1" gradientTransform="translate(612 318) rotate(-145) scale(420 250)"><stop stop-color="${palette.secondary}" stop-opacity=".7"/><stop offset="1" stop-color="${palette.secondary}" stop-opacity="0"/></radialGradient></defs><rect width="686" height="386" fill="${palette.background}"/><rect width="686" height="386" fill="url(#a)"/><rect width="686" height="386" fill="url(#b)"/>`
  if (id === 'paper') return `<defs><pattern id="fibres" width="34" height="28" patternUnits="userSpaceOnUse"><path d="M-6 9C7 2 19 15 40 4M-4 23C10 17 23 31 38 18" fill="none" stroke="${palette.outline}" stroke-opacity=".1"/><circle cx="7" cy="17" r=".8" fill="${palette.text}" fill-opacity=".15"/></pattern><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.surface}"/><stop offset="1" stop-color="${palette.background}"/></linearGradient></defs><rect width="686" height="386" fill="url(#paper)"/><rect width="686" height="386" fill="url(#fibres)"/>`
  if (id === 'duotone') return `<path d="M0 0H455L308 386H0Z" fill="${palette.background}"/><path d="M455 0H686V386H308Z" fill="${palette.surface}"/><path d="M500 0L352 386" stroke="${palette.primary}" stroke-width="54" opacity=".42"/>`
  if (id === 'deep-space') return `<defs><radialGradient id="space" cx="52%" cy="40%" r="75%"><stop stop-color="${palette.surface}"/><stop offset=".62" stop-color="${palette.background}"/><stop offset="1" stop-color="${palette.outline}"/></radialGradient></defs><rect width="686" height="386" fill="url(#space)"/>`
  return `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.background}"/><stop offset=".55" stop-color="${palette.surface}"/><stop offset="1" stop-color="${palette.outline}"/></linearGradient></defs><rect width="686" height="386" fill="url(#bg)"/>`
}

const scatter = (seed, count, create) => {
  const random = createRandom(seed)
  return Array.from({ length: count }, (_, index) => create(random, index)).join('')
}

const overlayMarkup = ({ id, palette, intensity, seed }) => {
  const opacity = round(.055 + clamp(intensity, 0, 100) * .00165, 3)
  if (id === 'halftone') return `<defs><pattern id="dots" width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.2" fill="${palette.accent}"/></pattern></defs><path d="M0 72H686V386H0Z" fill="url(#dots)" opacity="${opacity}"/>`
  if (id === 'lines') return `<defs><pattern id="lines" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><path d="M0 2H16" stroke="${palette.accent}" stroke-width="2"/></pattern></defs><rect y="58" width="686" height="328" fill="url(#lines)" opacity="${opacity}"/>`
  if (id === 'grid') return `<defs><pattern id="grid" width="31" height="31" patternUnits="userSpaceOnUse"><path d="M31 0H0V31" fill="none" stroke="${palette.accent}"/></pattern></defs><rect y="58" width="686" height="328" fill="url(#grid)" opacity="${opacity * 1.4}"/>`
  if (id === 'rays') return `<g fill="${palette.accent}" opacity="${opacity}"><path d="M343 230L80 58H0V98Z"/><path d="M343 230L606 58H686V98Z"/><path d="M343 230L686 260V320Z"/><path d="M343 230L0 260V320Z"/><path d="M343 230L285 386H245Z"/><path d="M343 230L401 386H441Z"/></g>`
  if (id === 'blocks') return `<g fill="${palette.accent}" opacity="${opacity * 1.35}"><path d="M0 104H172V146H0Z"/><path d="M514 286H686V350H514Z"/><path d="M76 238H228V260H76Z"/><path d="M460 92H648V112H460Z"/></g>`
  if (id === 'waves') return `<path d="M-30 306C94 217 179 367 314 277S545 188 730 287" fill="none" stroke="${palette.accent}" stroke-width="22" opacity="${opacity}"/><path d="M-20 332C112 242 199 391 334 302S555 214 720 312" fill="none" stroke="${palette.text}" stroke-width="2" opacity="${opacity * 1.9}"/>`
  if (id === 'checker') return `<defs><pattern id="check" width="38" height="38" patternUnits="userSpaceOnUse"><path d="M0 0H19V19H0ZM19 19H38V38H19Z" fill="${palette.accent}"/></pattern></defs><path d="M0 276H686V386H0Z" fill="url(#check)" opacity="${opacity}"/>`
  if (id === 'scanlines') return `<defs><pattern id="scan" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 1H8" stroke="${palette.text}"/></pattern></defs><rect width="686" height="386" fill="url(#scan)" opacity="${opacity * .75}"/>`
  if (id === 'noise' || id === 'grain') return scatter(`${seed}/${id}`, 86, (random) => `<circle cx="${round(random() * 686)}" cy="${round(58 + random() * 328)}" r="${round(.4 + random() * 1.4)}" fill="${random() > .5 ? palette.text : palette.outline}" opacity="${round(opacity * (.4 + random()), 3)}"/>`)
  if (id === 'glow') return `<defs><radialGradient id="halo"><stop stop-color="${palette.accent}" stop-opacity=".48"/><stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/></radialGradient></defs><ellipse cx="343" cy="226" rx="260" ry="156" fill="url(#halo)" opacity="${Math.min(.7, opacity * 5)}"/>`
  if (id === 'stars') return scatter(`${seed}/stars`, 42, (random) => `<circle cx="${round(random() * 686)}" cy="${round(62 + random() * 318)}" r="${round(.7 + random() * 1.5)}" fill="${palette.accent}" opacity="${round(.25 + random() * .55, 2)}"/>`)
  if (id === 'speed-lines') return scatter(`${seed}/speed`, 26, (random) => { const y = round(62 + random() * 324); const x = round(random() * 540); const width = round(30 + random() * 150); return `<path d="M${x} ${y}H${Math.min(686, x + width)}" stroke="${palette.accent}" stroke-width="${round(1 + random() * 4)}" opacity="${round(opacity * (1 + random()), 3)}"/>` })
  if (id === 'giant-type') return `<text x="670" y="363" text-anchor="end" fill="${palette.accent}" opacity="${opacity * 1.8}" font-family="Arial Black,Arial,sans-serif" font-size="168" font-weight="900">TOP8</text>`
  if (id === 'circuit') return `<g fill="none" stroke="${palette.accent}" opacity="${opacity * 1.8}"><path d="M0 112H98V164H220V98H328M686 304H590V250H514V342H404"/><circle cx="98" cy="112" r="5"/><circle cx="514" cy="250" r="5"/></g>`
  if (id === 'bubbles') return scatter(`${seed}/bubbles`, 18, (random) => `<circle cx="${round(random() * 686)}" cy="${round(64 + random() * 316)}" r="${round(7 + random() * 31)}" fill="none" stroke="${palette.accent}" stroke-width="${round(1 + random() * 4)}" opacity="${round(opacity * (1 + random() * 1.6), 3)}"/>`)
  if (id === 'spray') return scatter(`${seed}/spray`, 58, (random) => `<circle cx="${round(random() * 686)}" cy="${round(66 + random() * 314)}" r="${round(1 + random() * 5)}" fill="${palette.accent}" opacity="${round(opacity * (1 + random()), 3)}"/>`)
  if (id === 'vignette') return `<defs><radialGradient id="v"><stop offset=".55" stop-color="${palette.outline}" stop-opacity="0"/><stop offset="1" stop-color="${palette.outline}" stop-opacity=".92"/></radialGradient></defs><rect width="686" height="386" fill="url(#v)" opacity="${Math.min(.9, opacity * 4)}"/>`
  if (id === 'runes') return scatter(`${seed}/runes`, 12, (random, index) => { const x = round(random() * 686); const y = round(75 + random() * 295); const size = round(8 + random() * 22); return `<path d="M${x} ${y - size}L${x + size} ${y}L${x} ${y + size}L${x - size} ${y}Z M${x} ${y - size * .55}V${y + size * .55}" fill="none" stroke="${palette.accent}" opacity="${round(opacity * (1 + (index % 3)), 3)}"/>` })
  if (id === 'pixels') return scatter(`${seed}/pixels`, 28, (random) => { const size = Math.round(3 + random() * 13); return `<rect x="${round(random() * 676)}" y="${round(62 + random() * 312)}" width="${size}" height="${size}" fill="${palette.accent}" opacity="${round(opacity * (1 + random()), 3)}"/>` })
  return ''
}

export const createBackgroundLayer = ({
  systemId,
  overlays = [],
  palette,
  intensity = 50,
  energy = 55,
  headerId = 'band',
  seed = 'template',
}) => {
  const orderedOverlays = [...new Set(overlays)]
  const effectiveIntensity = clamp((Number(intensity) + Number(energy)) / 2, 0, 100)
  const content = [
    baseMarkup(systemId, palette),
    ...orderedOverlays.map((id) => overlayMarkup({ id, palette, intensity: effectiveIntensity, seed })),
    createHeaderArtwork(headerId, palette),
  ].join('')
  return {
    id: 'generated-background',
    zIndex: 0,
    src: svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">${content}</svg>`),
  }
}

export const getBackgroundSystem = (id) => backgroundSystems.find((system) => system.id === id)

export const pickCompatibleOverlays = ({ preferred = [], count = 2, random }) => {
  const pool = preferred.length ? preferred : overlaySystems.map(({ id }) => id)
  const selected = []
  while (selected.length < Math.min(count, pool.length)) {
    const candidate = pick(pool, random)
    if (!selected.includes(candidate)) selected.push(candidate)
  }
  return selected
}
