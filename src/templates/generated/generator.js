import { createPaletteFromColor, normalizePalette } from './palette.js'

const WIDTH = 686
const HEIGHT = 386
const HEADER_HEIGHT = 58
const EXPECTED_PLACEMENTS = [1, 2, 3, 4, 5, 5, 7, 7]
const SLOT_IDS = ['first', 'second', 'third', 'fourth', 'fifth-a', 'fifth-b', 'seventh-a', 'seventh-b']

const svgDataUrl = (content) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value))

export const createTemplateSeed = () => {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2)
    crypto.getRandomValues(values)
    return `${values[0].toString(36)}${values[1].toString(36)}`
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

const hashSeed = (seed) => {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const createRandom = (seed) => {
  let value = hashSeed(seed)
  return () => {
    value += 0x6D2B79F5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (values, random) => values[Math.floor(random() * values.length)]

const families = [
  { id: 'manga', label: 'Manga / Comic', names: ['Final Panel', 'Crimson Frame', 'Ink Impact'], base: '#E8473F', harmony: 'complementary', mood: 'vivid', hue: 4, font: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', labelFont: 'Impact, "Arial Black", sans-serif', pattern: 'halftone', frameWidth: 4 },
  { id: 'cyber', label: 'Cyber / Neon', names: ['Neon Rift', 'Ion Division', 'Midnight Circuit'], base: '#7C3AED', harmony: 'triadic', mood: 'dark', hue: 270, font: 'Arial Black, Arial, sans-serif', labelFont: 'ui-monospace, SFMono-Regular, Menlo, monospace', pattern: 'grid', frameWidth: 3 },
  { id: 'arcade', label: 'Retro Arcade / CRT', names: ['Pixel Arena', 'Insert Coin Finals', 'Vector Rush'], base: '#B52579', harmony: 'triadic', mood: 'dark', hue: 326, font: 'ui-monospace, SFMono-Regular, Menlo, monospace', labelFont: 'ui-monospace, SFMono-Regular, Menlo, monospace', pattern: 'pixels', frameWidth: 3 },
  { id: 'fantasy', label: 'Fantasy', names: ['Arcane Bracket', 'Crown of Eight', 'Emerald Trials'], base: '#1F7A5A', harmony: 'analogous', mood: 'dark', hue: 158, font: '"Hylia Serif", Georgia, serif', labelFont: '"Hylia Serif", Georgia, serif', pattern: 'runes', frameWidth: 3 },
  { id: 'editorial', label: 'Editorial / Magazine', names: ['The Final Eight', 'Winner’s Issue', 'Arena Edition'], base: '#C9543D', harmony: 'analogous', mood: 'light', hue: 10, font: 'Georgia, "Times New Roman", serif', labelFont: 'Arial, Helvetica, sans-serif', pattern: 'editorial', frameWidth: 2 },
  { id: 'esport', label: 'Modern Esport', names: ['Prime Clash', 'Velocity Finals', 'Apex Eight'], base: '#176B87', harmony: 'analogous', mood: 'dark', hue: 193, font: 'Arial Black, Arial, sans-serif', labelFont: 'Arial, Helvetica, sans-serif', pattern: 'speed', frameWidth: 3 },
  { id: 'street', label: 'Street / Graffiti', names: ['Concrete Kings', 'Street Crown', 'Wall Breakers'], base: '#EF4D2F', harmony: 'triadic', mood: 'vivid', hue: 9, font: 'Impact, "Arial Black", sans-serif', labelFont: 'Impact, sans-serif', pattern: 'spray', frameWidth: 5 },
  { id: 'y2k', label: 'Y2K', names: ['Chrome Dreams', 'Millennium Eight', 'Digital Pop'], base: '#F05ACF', harmony: 'analogous', mood: 'pastel', hue: 312, font: 'Arial Black, Arial, sans-serif', labelFont: 'Arial, Helvetica, sans-serif', pattern: 'bubbles', frameWidth: 3 },
  { id: 'underground', label: 'Dark / Underground', names: ['Lower Bracket', 'Nocturne Eight', 'Basement Finals'], base: '#8D2436', harmony: 'monochrome', mood: 'dark', hue: 350, font: 'Impact, "Arial Narrow Bold", sans-serif', labelFont: 'ui-monospace, monospace', pattern: 'noise', frameWidth: 4 },
  { id: 'premium', label: 'Minimal Premium', names: ['The Eight', 'Selected', 'Grand Series'], base: '#B48A4A', harmony: 'monochrome', mood: 'dark', hue: 38, font: 'Georgia, "Times New Roman", serif', labelFont: 'Arial, Helvetica, sans-serif', pattern: 'minimal', frameWidth: 2 },
  { id: 'scifi', label: 'Sci-Fi', names: ['Orbital Eight', 'Sector Finals', 'Nova Protocol'], base: '#00A6C8', harmony: 'triadic', mood: 'dark', hue: 190, font: 'Arial Black, Arial, sans-serif', labelFont: 'ui-monospace, SFMono-Regular, Menlo, monospace', pattern: 'circuit', frameWidth: 3 },
  { id: 'surprise', label: 'Libre / Surprise me', names: ['Wildcard Eight'], base: '#6D5DFB', harmony: 'triadic', mood: 'vivid', hue: 246, font: 'Arial Black, Arial, sans-serif', labelFont: 'Arial, Helvetica, sans-serif', pattern: 'mixed', frameWidth: 3 },
]

const layouts = [
  { id: 'podium', label: 'Podium', boxes: [[181, 62, 324, 196], [0, 62, 177, 128], [509, 62, 177, 128], [181, 262, 324, 124], [0, 194, 177, 94], [0, 292, 177, 94], [509, 194, 177, 94], [509, 292, 177, 94]] },
  { id: 'asymmetric', label: 'Asymétrique', boxes: [[0, 62, 330, 216], [334, 62, 208, 130], [546, 62, 140, 130], [334, 196, 352, 102], [0, 302, 164, 84], [168, 302, 164, 84], [336, 302, 171, 84], [511, 302, 175, 84]] },
  { id: 'manga-panels', label: 'Manga panels', boxes: [[200, 62, 286, 210], [0, 62, 196, 132], [490, 62, 196, 132], [200, 276, 286, 110], [0, 198, 196, 90], [0, 292, 196, 94], [490, 198, 196, 90], [490, 292, 196, 94]] },
  { id: 'diagonal', label: 'Diagonale', boxes: [[156, 62, 374, 178], [0, 62, 152, 116], [534, 62, 152, 116], [156, 244, 374, 142], [0, 182, 152, 100], [0, 286, 152, 100], [534, 182, 152, 100], [534, 286, 152, 100]] },
  { id: 'editorial', label: 'Editorial', boxes: [[0, 62, 360, 210], [364, 62, 322, 102], [364, 168, 322, 104], [0, 276, 220, 110], [224, 276, 112, 110], [340, 276, 112, 110], [456, 276, 112, 110], [572, 276, 114, 110]] },
  { id: 'cascade', label: 'Cascade', boxes: [[0, 62, 320, 208], [324, 62, 220, 150], [548, 62, 138, 150], [324, 216, 362, 80], [0, 300, 156, 86], [160, 300, 156, 86], [320, 300, 176, 86], [500, 300, 186, 86]] },
  { id: 'split-screen', label: 'Split screen', boxes: [[0, 62, 360, 210], [364, 62, 322, 102], [364, 168, 322, 104], [0, 276, 220, 110], [224, 276, 112, 110], [340, 276, 112, 110], [456, 276, 112, 110], [572, 276, 114, 110]] },
  { id: 'experimental', label: 'Expérimental', boxes: [[218, 62, 300, 205], [0, 62, 214, 120], [522, 62, 164, 120], [0, 186, 214, 110], [218, 271, 145, 115], [367, 271, 151, 115], [522, 186, 164, 100], [522, 290, 164, 96]] },
  { id: 'champion-left', label: 'Champion à gauche', boxes: [[0, 62, 310, 324], [314, 62, 184, 158], [502, 62, 184, 158], [314, 220, 372, 76], [314, 296, 90, 90], [408, 296, 90, 90], [502, 296, 90, 90], [596, 296, 90, 90]] },
  { id: 'center-stage', label: 'Scène centrale', boxes: [[193, 62, 300, 208], [0, 62, 189, 132], [497, 62, 189, 132], [193, 274, 300, 112], [0, 198, 189, 90], [0, 292, 189, 94], [497, 198, 189, 90], [497, 292, 189, 94]] },
  { id: 'broadcast', label: 'Broadcast', boxes: [[0, 62, 410, 220], [414, 62, 272, 108], [414, 174, 272, 108], [0, 286, 170, 100], [174, 286, 124, 100], [302, 286, 124, 100], [430, 286, 124, 100], [558, 286, 128, 100]] },
  { id: 'staircase', label: 'Escalier', boxes: [[0, 62, 310, 210], [314, 62, 230, 136], [548, 62, 138, 136], [314, 202, 372, 92], [0, 276, 152, 110], [156, 276, 152, 110], [312, 298, 184, 88], [500, 298, 186, 88]] },
]

const legacyLayoutAliases = {
  'podium-central': 'podium',
  'grille-asymetrique': 'asymmetric',
  diagonale: 'diagonal',
  'panneaux-manga': 'manga-panels',
}

const intensityLabels = ['Minimal', 'Équilibré', 'Expressif', 'Extrême']
const eventTypeInfluence = { weekly: -8, major: 12, invitational: 7, arcadian: 1, crew: 8, championship: 12, online: -2, other: 0 }

export const createDefaultGenerationBrief = (tournamentName = '') => ({
  tournament: { name: tournamentName, subtitle: '', date: '', entrants: '', eventType: 'weekly' },
  artDirection: { family: 'surprise', intensity: 50 },
  composition: { layoutFamily: 'auto', winnerDominance: 72, density: 55, symmetry: 42 },
  panels: { shapeStyle: 'irregular', frameStyle: 'double', labelPosition: 'bottom', labelWidth: 76, texture: 'auto', textureScale: 50 },
  typography: { family: 'auto', rankStyle: 'impact', headerStyle: 'band', backgroundEnergy: 55 },
  colors: { mode: 'auto', mood: 'dark', primary: '#246BFD', secondary: '#7C3AED', accent: '#22D3EE', background: '#07111D', harmony: 'analogous' },
})

const normalizeBrief = (brief = {}) => {
  const defaults = createDefaultGenerationBrief(brief.tournament?.name || '')
  return {
    tournament: { ...defaults.tournament, ...(brief.tournament || {}) },
    artDirection: { ...defaults.artDirection, ...(brief.artDirection || {}) },
    composition: { ...defaults.composition, ...(brief.composition || {}) },
    panels: { ...defaults.panels, ...(brief.panels || {}) },
    typography: { ...defaults.typography, ...(brief.typography || {}) },
    colors: { ...defaults.colors, ...(brief.colors || {}) },
  }
}

const buildPalette = (family, brief) => {
  const colors = brief.colors
  if (colors.mode === 'custom') {
    const auto = createPaletteFromColor({ primary: colors.primary, harmony: colors.harmony, mood: colors.mood })
    return normalizePalette({ ...auto, primary: colors.primary, secondary: colors.secondary, accent: colors.accent, background: colors.background })
  }
  return createPaletteFromColor({
    primary: colors.mode === 'primary' ? colors.primary : family.base,
    harmony: colors.mode === 'auto' ? family.harmony : colors.harmony || family.harmony,
    mood: colors.mood || family.mood,
  })
}

const shapePresets = [
  [[0, 7], [93, 0], [100, 100], [0, 94]], [[0, 0], [100, 6], [94, 100], [5, 100]],
  [[7, 0], [100, 0], [100, 92], [0, 100]], [[0, 0], [93, 0], [100, 88], [8, 100]],
  [[0, 10], [100, 0], [92, 100], [0, 88]], [[8, 0], [100, 10], [100, 100], [0, 90]],
  [[0, 0], [100, 8], [95, 92], [8, 100]], [[6, 8], [94, 0], [100, 88], [0, 100]],
]

const cutCornerPresets = [
  [[7, 0], [94, 0], [100, 8], [100, 93], [92, 100], [0, 100], [0, 9]],
  [[0, 0], [92, 0], [100, 10], [100, 100], [8, 100], [0, 91]],
  [[9, 0], [100, 0], [100, 91], [92, 100], [7, 100], [0, 91], [0, 8]],
]

const diagonalPresets = [
  [[10, 0], [100, 0], [90, 100], [0, 100]],
  [[0, 0], [90, 0], [100, 100], [10, 100]],
  [[8, 0], [100, 8], [92, 100], [0, 92]],
]

const resolveShapePreset = (style, index, offset) => {
  if (style === 'clean') return [[0, 0], [100, 0], [100, 100], [0, 100]]
  if (style === 'cut-corners') return cutCornerPresets[(index + offset) % cutCornerPresets.length]
  if (style === 'diagonal') return diagonalPresets[(index + offset) % diagonalPresets.length]
  return shapePresets[(index + offset) % shapePresets.length]
}

const clipPathFromCanvasPoints = (points, box) => `polygon(${points.map(([x, y]) => {
  const localX = ((x - box.x) / box.width) * 100
  const localY = ((y - box.y) / box.height) * 100
  return `${localX.toFixed(2)}% ${localY.toFixed(2)}%`
}).join(', ')})`

const createBoxes = (layout, composition) => {
  const densityInset = Math.round((100 - clamp(Number(composition.density), 0, 100)) * 0.045)
  const boxes = layout.boxes.map(([x, y, width, height]) => [x + densityInset, y + densityInset, width - densityInset * 2, height - densityInset * 2])
  const [x, y, width, height] = boxes[0]
  const otherLargestArea = Math.max(...boxes.slice(1).map((box) => box[2] * box[3]))
  const minimumScale = clamp(Math.sqrt((otherLargestArea * 1.12) / (width * height)), 0.72, 0.94)
  const scale = minimumScale + (1 - minimumScale) * (clamp(Number(composition.winnerDominance), 0, 100) / 100)
  const winnerWidth = Math.round(width * scale)
  const winnerHeight = Math.round(height * scale)
  boxes[0] = [x + Math.round((width - winnerWidth) / 2), y + Math.round((height - winnerHeight) / 2), winnerWidth, winnerHeight]
  return boxes
}

const pointsFromShape = (box, shape, symmetry) => {
  const irregularity = 1 - clamp(Number(symmetry), 0, 100) / 100
  return shape.map(([x, y]) => {
    const structuredX = x < 50 ? 0 : 100
    const structuredY = y < 50 ? 0 : 100
    const mixedX = structuredX + (x - structuredX) * irregularity
    const mixedY = structuredY + (y - structuredY) * irregularity
    return [Math.round(box.x + (mixedX / 100) * box.width), Math.round(box.y + (mixedY / 100) * box.height)]
  })
}

const createPattern = (family, palette, index, intensity = 50, panelOptions = {}) => {
  const base = index === 0 ? palette.winner : index % 2 ? palette.primary : palette.secondary
  const accent = palette.accent
  const ink = palette.outline
  const opacity = (0.12 + clamp(intensity, 0, 100) * 0.003).toFixed(2)
  const patternId = `p${index}`
  const patterns = {
    halftone: `<pattern id="${patternId}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${base}"/><circle cx="4" cy="4" r="2.3" fill="${ink}"/><path d="M8 16L16 8" stroke="${accent}" opacity="${opacity}"/></pattern>`,
    grid: `<pattern id="${patternId}" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="${base}"/><path d="M22 0H0V22" fill="none" stroke="${accent}" opacity="${opacity}"/><circle cx="1" cy="1" r="1.4" fill="${accent}"/></pattern>`,
    pixels: `<pattern id="${patternId}" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="${base}"/><rect x="2" y="2" width="5" height="5" fill="${accent}" opacity="${opacity}"/><rect x="12" y="12" width="6" height="6" fill="${ink}" opacity=".45"/></pattern>`,
    editorial: `<pattern id="${patternId}" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="${base}"/><path d="M0 25H30M25 0V30" stroke="${accent}" opacity="${opacity}"/></pattern>`,
    runes: `<pattern id="${patternId}" width="28" height="28" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="${base}"/><path d="M14 3L22 14L14 25L6 14Z M14 8V20" fill="none" stroke="${accent}" opacity="${opacity}"/></pattern>`,
    speed: `<pattern id="${patternId}" width="38" height="22" patternUnits="userSpaceOnUse"><rect width="38" height="22" fill="${base}"/><path d="M-8 22L8 0M10 22L26 0M28 22L44 0" stroke="${accent}" stroke-width="3" opacity="${opacity}"/></pattern>`,
    spray: `<pattern id="${patternId}" width="36" height="30" patternUnits="userSpaceOnUse"><rect width="36" height="30" fill="${base}"/><circle cx="5" cy="7" r="2" fill="${accent}" opacity="${opacity}"/><circle cx="24" cy="18" r="4" fill="${ink}" opacity=".35"/><path d="M0 28L36 4" stroke="${accent}" stroke-width="2" opacity="${opacity}"/></pattern>`,
    bubbles: `<pattern id="${patternId}" width="42" height="42" patternUnits="userSpaceOnUse"><rect width="42" height="42" fill="${base}"/><circle cx="10" cy="12" r="7" fill="none" stroke="${accent}" stroke-width="2" opacity="${opacity}"/><circle cx="34" cy="32" r="4" fill="${palette.text}" opacity=".24"/></pattern>`,
    noise: `<pattern id="${patternId}" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="24" height="24" fill="${base}"/><path d="M2 5L8 2M15 8L23 4M4 19L12 13M16 22L22 16" stroke="${accent}" opacity="${opacity}"/></pattern>`,
    minimal: `<pattern id="${patternId}" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="${base}"/><path d="M0 79H80" stroke="${accent}" opacity="${opacity}"/></pattern>`,
    circuit: `<pattern id="${patternId}" width="34" height="34" patternUnits="userSpaceOnUse"><rect width="34" height="34" fill="${base}"/><path d="M0 8H20V24H34M8 0V15H26V34" fill="none" stroke="${accent}" opacity="${opacity}"/><circle cx="20" cy="8" r="2" fill="${accent}"/></pattern>`,
    mixed: `<pattern id="${patternId}" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="32" height="32" fill="${base}"/><circle cx="8" cy="8" r="3" fill="${accent}" opacity="${opacity}"/><path d="M16 32L32 16" stroke="${ink}" stroke-width="3" opacity=".3"/></pattern>`,
  }
  const requestedPattern = panelOptions.texture === 'auto' ? family.pattern : panelOptions.texture
  const pattern = patterns[requestedPattern] || patterns[family.pattern]
  const textureScale = (0.7 + clamp(Number(panelOptions.textureScale), 0, 100) * 0.008).toFixed(2)
  const scaledPattern = pattern.replace('<pattern ', `<pattern patternTransform="scale(${textureScale})" `)
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220"><defs>${scaledPattern}</defs><rect width="320" height="220" fill="url(#${patternId})"/><path d="M-40 190L220 -20M90 240L350 30" stroke="${accent}" stroke-width="10" opacity="${opacity}"/></svg>`)
}

const familyArtwork = (family, palette, intensity, backgroundEnergy = 55) => {
  const energy = clamp(Number(backgroundEnergy), 0, 100) / 100
  const opacity = ((0.05 + clamp(intensity, 0, 100) * 0.0016) * (0.45 + energy)).toFixed(2)
  const common = `<circle cx="343" cy="235" r="170" fill="none" stroke="${palette.primary}" stroke-width="24" opacity="${opacity}"/><path d="M30 350L260 70M410 370L660 90" stroke="${palette.secondary}" stroke-width="9" opacity="${opacity}"/>`
  if (family.id === 'editorial' || family.id === 'premium') return `<rect x="0" width="22" height="386" fill="${palette.primary}"/><text x="654" y="365" fill="${palette.outline}" opacity="${opacity}" font-family="serif" font-size="84" font-weight="700" text-anchor="end">08</text>`
  if (family.id === 'cyber' || family.id === 'scifi') return `<path d="M0 330L180 140L310 250L500 40L686 180" fill="none" stroke="${palette.accent}" stroke-width="2" opacity=".45"/><circle cx="545" cy="210" r="105" fill="none" stroke="${palette.secondary}" stroke-width="30" opacity="${opacity}"/>`
  if (family.id === 'fantasy') return `<circle cx="343" cy="224" r="148" fill="none" stroke="${palette.accent}" opacity=".35"/><path d="M343 62L365 102L343 124L321 102Z M343 324L365 346L343 382L321 346Z" fill="${palette.accent}" opacity="${opacity}"/>`
  return common
}

const createHeaderArtwork = (style, palette) => {
  if (style === 'split') return `<path d="M0 0H150L128 58H0ZM154 0H686V58H132Z" fill="${palette.surface}" opacity=".92"/><path d="M132 58L154 0" stroke="${palette.accent}" stroke-width="3"/>`
  if (style === 'poster') return `<rect width="686" height="58" fill="${palette.surface}"/><path d="M8 7H678V51H8Z" fill="none" stroke="${palette.accent}" stroke-width="1.5"/><path d="M0 54H686" stroke="${palette.primary}" stroke-width="7"/>`
  if (style === 'minimal') return `<rect width="686" height="58" fill="${palette.background}" opacity=".78"/><path d="M24 54H662" stroke="${palette.accent}" stroke-width="1"/>`
  return `<rect width="686" height="58" fill="${palette.surface}" opacity=".88"/><path d="M0 58H686" stroke="${palette.accent}" stroke-width="2"/>`
}

const createBackground = (family, palette, intensity, brief) => svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="686" height="386" viewBox="0 0 686 386"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${palette.background}"/><stop offset="1" stop-color="${palette.outline}"/></linearGradient></defs><rect width="686" height="386" fill="url(#bg)"/>${familyArtwork(family, palette, intensity, brief.typography.backgroundEnergy)}${createHeaderArtwork(brief.typography.headerStyle, palette)}</svg>`)

const createOverlay = (slots, family, palette, intensity, frameStyle = 'double') => {
  const strokeWidth = family.frameWidth + Math.round(clamp(intensity, 0, 100) / 38)
  const polygons = slots.map((slot) => {
    const points = slot.points.map((point) => point.join(',')).join(' ')
    if (frameStyle === 'accent') return `<polygon points="${points}" fill="none" stroke="${palette.accent}" stroke-width="${strokeWidth + 2}" stroke-linejoin="round"/>`
    if (frameStyle === 'ink') return `<polygon points="${points}" fill="none" stroke="${palette.outline}" stroke-width="${strokeWidth + 5}" stroke-linejoin="round"/>`
    if (frameStyle === 'fine') return `<polygon points="${points}" fill="none" stroke="${palette.text}" stroke-width="1.5" stroke-linejoin="round" opacity=".85"/>`
    return `<polygon points="${points}" fill="none" stroke="${palette.outline}" stroke-width="${strokeWidth + 3}" stroke-linejoin="round"/><polygon points="${points}" fill="none" stroke="${palette.accent}" stroke-width="1.5" stroke-linejoin="round" opacity=".9"/>`
  }).join('')
  return svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="686" height="386" viewBox="0 0 686 386">${polygons}<path d="M0 59H686" stroke="${palette.outline}" stroke-width="6"/><path d="M0 58H686" stroke="${palette.accent}" stroke-width="1.5"/></svg>`)
}

const createAutoPlacement = (width, height) => ({ safeX: Math.max(6, width * 0.05), safeY: Math.max(4, height * 0.04), safeWidth: width * 0.9, safeHeight: Math.max(40, height - Math.max(23, height * 0.2) - 7), solo: { fill: 1.01, maxCrop: 1.52, yBias: 0.02 }, duoPrimary: { fill: 1.07, maxCrop: 1.48, width: 0.63, yBias: 0.02 }, duoSecondary: { fill: 0.93, maxCrop: 1.43, width: 0.49, yBias: -0.02 }, duoOverlap: 0.12 })

const createSlots = (layout, family, palette, random, brief) => {
  const boxes = createBoxes(layout, brief.composition)
  const shapeOffset = Math.floor(random() * shapePresets.length)
  const effectiveIntensity = clamp(Number(brief.artDirection.intensity) + (eventTypeInfluence[brief.tournament.eventType] || 0), 0, 100)
  const typography = resolveTypography(family, brief)
  return boxes.map((values, index) => {
    const [x, y, width, height] = values
    const box = { x, y, width, height }
    const points = pointsFromShape(box, resolveShapePreset(brief.panels.shapeStyle, index, shapeOffset), brief.composition.symmetry)
    const nameHeight = Math.min(22, Math.max(17, Math.round(height * 0.19)))
    const requestedLabelWidth = clamp(Number(brief.panels.labelWidth), 45, 100) / 100
    const nameWidth = Math.max(70, Math.round(width * (index === 0 ? Math.max(.58, requestedLabelWidth - .08) : requestedLabelWidth)))
    const nameX = x + Math.round((width - nameWidth) / 2)
    const labelPosition = brief.panels.labelPosition === 'alternating'
      ? (index % 2 ? 'top' : 'bottom')
      : brief.panels.labelPosition
    const nameY = labelPosition === 'top' ? y + 4 : y + height - nameHeight - 4
    const rankOnRight = index % 3 === 1
    const rankSize = index === 0 ? 43 : index < 3 ? 31 : index === 3 ? 28 : 24
    return {
      id: SLOT_IDS[index], placement: EXPECTED_PLACEMENTS[index], ...box,
      zIndex: index === 0 ? 12 : index < 3 ? 10 : index === 3 ? 9 : 8,
      points, clipPath: clipPathFromCanvasPoints(points, box),
      texture: createPattern(family, palette, index, effectiveIntensity, brief.panels),
      podiumTone: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : undefined,
      rank: { x: x + (rankOnRight ? width - 24 : 24), y: y + Math.min(30, height * 0.24), size: rankSize, color: index === 0 ? palette.winner : palette.text, layer: 'front' },
      nameZone: { x: nameX, y: nameY, width: nameWidth, height: nameHeight, align: 'center', fontSize: index === 0 ? 12 : 10, background: index === 0 ? palette.winner : palette.accent, color: palette.outline, rotation: index % 2 ? -1 : 1, fontFamily: typography.label, fontWeight: 800, letterSpacing: family.id === 'arcade' ? '.02em' : '.035em' },
      autoPlacement: createAutoPlacement(width, height),
    }
  })
}

export const validateGeneratedTemplate = (template) => {
  if (!template || template.width !== WIDTH || template.height !== HEIGHT) return false
  if (!Array.isArray(template.slots) || template.slots.length !== 8) return false
  const placements = template.slots.map(({ placement }) => placement).sort((a, b) => a - b)
  if (placements.some((placement, index) => placement !== EXPECTED_PLACEMENTS[index])) return false
  if (new Set(template.slots.map(({ id }) => id)).size !== 8) return false
  for (const slot of template.slots) {
    if (slot.x < 0 || slot.y < HEADER_HEIGHT || slot.x + slot.width > WIDTH || slot.y + slot.height > HEIGHT) return false
    if (slot.width < 75 || slot.height < 60 || slot.width * slot.height < 6200) return false
    if (!slot.clipPath || !slot.nameZone || slot.nameZone.height < 17) return false
    if (slot.nameZone.x < slot.x || slot.nameZone.y < slot.y || slot.nameZone.x + slot.nameZone.width > slot.x + slot.width || slot.nameZone.y + slot.nameZone.height > slot.y + slot.height) return false
  }
  for (let firstIndex = 0; firstIndex < template.slots.length; firstIndex += 1) {
    const first = template.slots[firstIndex]
    for (let secondIndex = firstIndex + 1; secondIndex < template.slots.length; secondIndex += 1) {
      const second = template.slots[secondIndex]
      const overlapWidth = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x))
      const overlapHeight = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y))
      if (overlapWidth * overlapHeight > 4) return false
    }
  }
  const areas = template.slots.map(({ width, height }) => width * height)
  return areas[0] > areas[1] && areas[0] > areas[2] && areas[1] > Math.min(...areas.slice(4)) && areas[2] > Math.min(...areas.slice(4))
}

const resolveFamily = (id, random) => {
  const requested = families.find((family) => family.id === id)
  if (requested && requested.id !== 'surprise') return requested
  return pick(families.filter((family) => family.id !== 'surprise'), random)
}

const resolveLayout = (id, random) => {
  const normalizedId = legacyLayoutAliases[id] || id
  return layouts.find((layout) => layout.id === normalizedId) || pick(layouts, random)
}

const typographyFamilies = {
  condensed: { title: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', label: 'Arial Narrow, Arial, sans-serif' },
  serif: { title: 'Georgia, "Times New Roman", serif', label: 'Georgia, "Times New Roman", serif' },
  mono: { title: 'ui-monospace, SFMono-Regular, Menlo, monospace', label: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
  geometric: { title: 'Arial Black, Arial, sans-serif', label: 'Arial, Helvetica, sans-serif' },
}

const resolveTypography = (family, brief) => typographyFamilies[brief.typography.family] || { title: family.font, label: family.labelFont }

const createMetadata = (family, palette, brief) => {
  const hasSubtitle = Boolean(brief.tournament.subtitle)
  const typography = resolveTypography(family, brief)
  return [
    { id: 'eventName', x: 122, y: hasSubtitle ? 1 : 3, width: 486, height: hasSubtitle ? 35 : 50, zIndex: 5, fontSize: hasSubtitle ? 25 : family.id === 'editorial' ? 28 : 31, lineHeight: 1, align: 'center', color: palette.text, fontFamily: typography.title, fontWeight: 900, fontStyle: ['manga', 'esport', 'street'].includes(family.id) && brief.typography.family === 'auto' ? 'italic' : 'normal', letterSpacing: family.id === 'arcade' ? '.03em' : '.015em', textTransform: 'uppercase', textShadow: `2px 2px 0 ${palette.outline}` },
    ...(hasSubtitle ? [{ id: 'subtitle', x: 185, y: 35, width: 360, height: 16, zIndex: 5, fontSize: 8, lineHeight: 1, align: 'center', color: palette.textMuted, fontFamily: typography.label, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }] : []),
    { id: 'date', x: 10, y: 7, width: 102, height: 19, zIndex: 5, fontSize: 10, lineHeight: 1, align: 'left', color: palette.text, fontFamily: typography.label, fontWeight: 800, letterSpacing: '.02em' },
    { id: 'participantCount', x: 10, y: 32, width: 107, height: 18, zIndex: 5, fontSize: 9, lineHeight: 1, align: 'left', color: palette.accent, fontFamily: typography.label, fontWeight: 800, letterSpacing: '.02em' },
  ]
}

const createRankStyle = (family, palette, brief) => {
  const typography = resolveTypography(family, brief)
  const base = { fontFamily: typography.title, fontWeight: 900, fontStyle: ['manga', 'esport', 'street'].includes(family.id) && brief.typography.family === 'auto' ? 'italic' : 'normal' }
  if (brief.typography.rankStyle === 'clean') return { ...base, WebkitTextStroke: `1px ${palette.outline}`, textShadow: 'none' }
  if (brief.typography.rankStyle === 'badge') return { ...base, color: palette.outline, background: palette.winner, borderRadius: '999px', WebkitTextStroke: '0 transparent', textShadow: 'none', boxShadow: `0 2px 0 ${palette.outline}` }
  if (brief.typography.rankStyle === 'shadow') return { ...base, WebkitTextStroke: `1px ${palette.outline}`, textShadow: `5px 5px 0 ${palette.secondary}` }
  return { ...base, WebkitTextStroke: `${family.id === 'editorial' ? 1 : 2}px ${palette.outline}`, textShadow: `2px 2px 0 ${palette.secondary}, 4px 4px 0 ${palette.outline}AA` }
}

const buildTemplate = ({ id, name, family, layout, palette, seed, brief }) => {
  const random = createRandom(`${seed}-slots`)
  const slots = createSlots(layout, family, palette, random, brief)
  const intensity = clamp(Number(brief.artDirection.intensity) + (eventTypeInfluence[brief.tournament.eventType] || 0), 0, 100)
  return {
    id, revision: 3, generated: true, generatorVersion: 3,
    familyId: family.id, familyName: family.label, familyHue: family.hue,
    layoutId: layout.id, layoutName: layout.label, seed, visualStyle: 'generated', name,
    width: WIDTH, height: HEIGHT, generationBrief: brief,
    palette, originalPalette: palette, paletteLocks: [],
    slotTexture: slots[0].texture,
    teamLogo: { top: 7, right: 6, width: 19, height: 20 },
    tournamentLogo: { x: 620, y: 2, width: 58, height: 54, zIndex: 24 },
    canvasStyle: { backgroundColor: palette.background },
    renderFilter: family.id === 'editorial' ? 'saturate(.88) contrast(1.05)' : 'saturate(1.08) contrast(1.07) drop-shadow(0 2px 1px rgba(0,0,0,.35))',
    slotTextureStyle: { filter: 'none' },
    slotShadeStyle: { background: `linear-gradient(180deg, transparent 38%, ${palette.outline}CC 100%)` },
    rankStyle: createRankStyle(family, palette, brief),
    layers: [{ id: 'generated-background', src: createBackground(family, palette, intensity, brief), zIndex: 0 }, { id: 'generated-frames', src: createOverlay(slots, family, palette, intensity, brief.panels.frameStyle), zIndex: 20 }],
    decorations: [], metadata: createMetadata(family, palette, brief), slots,
  }
}

export const recolorGeneratedTemplate = (template, nextPalette, locks = template.paletteLocks || []) => {
  const palette = normalizePalette(nextPalette)
  const family = families.find(({ id }) => id === template.familyId) || families[5]
  const brief = normalizeBrief(template.generationBrief)
  const intensity = clamp(Number(brief.artDirection.intensity) + (eventTypeInfluence[brief.tournament.eventType] || 0), 0, 100)
  const slots = template.slots.map((slot, index) => ({
    ...slot,
    texture: createPattern(family, palette, index, intensity, brief.panels),
    rank: { ...slot.rank, color: index === 0 ? palette.winner : palette.text },
    nameZone: { ...slot.nameZone, background: index === 0 ? palette.winner : palette.accent, color: palette.outline },
  }))
  return {
    ...template, palette, paletteLocks: locks, slots, slotTexture: slots[0].texture,
    canvasStyle: { ...template.canvasStyle, backgroundColor: palette.background },
    slotShadeStyle: { background: `linear-gradient(180deg, transparent 38%, ${palette.outline}CC 100%)` },
    rankStyle: createRankStyle(family, palette, brief),
    layers: [{ id: 'generated-background', src: createBackground(family, palette, intensity, brief), zIndex: 0 }, { id: 'generated-frames', src: createOverlay(slots, family, palette, intensity, brief.panels.frameStyle), zIndex: 20 }],
    metadata: createMetadata(family, palette, brief),
  }
}

export const generateTemplate = ({
  brief: rawBrief,
  seed: requestedSeed,
  previousSignature = '',
  previousTemplate,
} = {}) => {
  const brief = normalizeBrief(rawBrief)
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const seedRoot = requestedSeed || createTemplateSeed()
    const seed = attempt ? `${seedRoot}-${attempt}` : seedRoot
    const family = resolveFamily(
      brief.artDirection.family,
      createRandom(`${seed}-family`),
    )
    const layout = resolveLayout(
      brief.composition.layoutFamily,
      createRandom(`${seed}-layout`),
    )
    const signature = `${family.id}:${layout.id}`
    if (signature === previousSignature && attempt < 12 && brief.composition.layoutFamily === 'auto') continue
    const palette = buildPalette(family, brief)
    const resolvedBrief = brief.artDirection.family === 'surprise'
      ? { ...brief, artDirection: { ...brief.artDirection, family: family.id } }
      : brief
    const template = buildTemplate({
      id: `generated-${seed}`,
      name: pick(family.names, createRandom(`${seed}-name`)),
      family,
      layout,
      palette,
      seed,
      brief: resolvedBrief,
    })
    const repeatsPreviousShapes = previousTemplate?.slots?.every(
      (slot, index) => slot.clipPath === template.slots[index]?.clipPath,
    )
    if (repeatsPreviousShapes && attempt < 20) continue
    if (validateGeneratedTemplate(template)) return template
  }
  throw new Error('Impossible de produire une géométrie de template valide.')
}

export const generatedFamilies = families.map(({ id, label, base, harmony, mood }) => ({ id, label, color: base, harmony, mood }))
export const generatedLayouts = [{ id: 'auto', label: 'Laisser le générateur choisir' }, ...layouts.map(({ id, label }) => ({ id, label }))]
export const generatedIntensityLabels = intensityLabels
