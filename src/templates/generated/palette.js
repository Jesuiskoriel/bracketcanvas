export const PALETTE_KEYS = [
  'background',
  'surface',
  'primary',
  'secondary',
  'accent',
  'text',
  'textMuted',
  'outline',
  'winner',
]

export const PALETTE_LABELS = {
  background: 'Fond',
  surface: 'Surface',
  primary: 'Principale',
  secondary: 'Secondaire',
  accent: 'Accent',
  text: 'Texte',
  textMuted: 'Texte secondaire',
  outline: 'Contours',
  winner: 'Top 1',
}

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value))

const expandHex = (hex) => {
  const normalized = String(hex || '').trim().replace('#', '')
  if (/^[0-9a-f]{3}$/i.test(normalized)) {
    return normalized.split('').map((character) => character + character).join('')
  }
  return /^[0-9a-f]{6}$/i.test(normalized) ? normalized : '000000'
}

export const normalizeHex = (hex) => `#${expandHex(hex).toUpperCase()}`

const hexToRgb = (hex) => {
  const value = expandHex(hex)
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

const rgbToHex = ({ r, g, b }) => `#${[r, g, b]
  .map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, '0'))
  .join('')}`.toUpperCase()

const rgbToHsl = ({ r, g, b }) => {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const maximum = Math.max(red, green, blue)
  const minimum = Math.min(red, green, blue)
  const lightness = (maximum + minimum) / 2
  const delta = maximum - minimum
  if (!delta) return { h: 0, s: 0, l: lightness * 100 }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue
  if (maximum === red) hue = 60 * (((green - blue) / delta) % 6)
  else if (maximum === green) hue = 60 * ((blue - red) / delta + 2)
  else hue = 60 * ((red - green) / delta + 4)
  return { h: hue < 0 ? hue + 360 : hue, s: saturation * 100, l: lightness * 100 }
}

const hslToRgb = ({ h, s, l }) => {
  const hue = ((h % 360) + 360) % 360
  const saturation = clamp(s, 0, 100) / 100
  const lightness = clamp(l, 0, 100) / 100
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const section = hue / 60
  const intermediate = chroma * (1 - Math.abs((section % 2) - 1))
  const values = section < 1 ? [chroma, intermediate, 0]
    : section < 2 ? [intermediate, chroma, 0]
      : section < 3 ? [0, chroma, intermediate]
        : section < 4 ? [0, intermediate, chroma]
          : section < 5 ? [intermediate, 0, chroma]
            : [chroma, 0, intermediate]
  const match = lightness - chroma / 2
  return { r: (values[0] + match) * 255, g: (values[1] + match) * 255, b: (values[2] + match) * 255 }
}

const hslToHex = (hsl) => rgbToHex(hslToRgb(hsl))
const colorHsl = (hex) => rgbToHsl(hexToRgb(hex))

const relativeLuminance = (hex) => {
  const channels = Object.values(hexToRgb(hex)).map((value) => {
    const normalized = value / 255
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export const contrastRatio = (first, second) => {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second))
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second))
  return (light + 0.05) / (dark + 0.05)
}

export const getPaletteWarnings = (palette) => {
  const warnings = []
  if (contrastRatio(palette.text, palette.background) < 4.5) warnings.push('Texte / fond')
  if (contrastRatio(palette.text, palette.surface) < 4.5) warnings.push('Texte / surface')
  if (contrastRatio(palette.outline, palette.surface) < 3) warnings.push('Contours / surface')
  if (contrastRatio(palette.accent, palette.background) < 2.2) warnings.push('Accent / fond')
  return warnings
}

export const normalizePalette = (palette = {}) => {
  const legacyPrimary = palette.surface || palette.primary || '#2457C5'
  const legacySecondary = palette.surfaceAlt || palette.secondary || '#22C8E5'
  const legacyOutline = palette.ink || palette.outline || '#050A18'
  const normalized = {
    background: normalizeHex(palette.background || '#07111D'),
    surface: normalizeHex(palette.surface || legacyPrimary),
    primary: normalizeHex(palette.primary || legacyPrimary),
    secondary: normalizeHex(palette.secondary || legacySecondary),
    accent: normalizeHex(palette.accent || '#68E7FF'),
    text: normalizeHex(palette.text || '#FFFFFF'),
    textMuted: normalizeHex(palette.textMuted || '#B8C9D8'),
    outline: normalizeHex(palette.outline || legacyOutline),
    winner: normalizeHex(palette.winner || palette.accent || '#FFD166'),
  }
  return normalized
}

const moodAdjustments = {
  dark: { background: 8, surface: 18, saturation: 5 },
  light: { background: 92, surface: 82, saturation: -8 },
  vivid: { background: 10, surface: 28, saturation: 20 },
  pastel: { background: 92, surface: 76, saturation: -28 },
  monochrome: { background: 8, surface: 24, saturation: -100 },
  contrast: { background: 5, surface: 22, saturation: 12 },
  neon: { background: 5, surface: 16, saturation: 28 },
  muted: { background: 14, surface: 31, saturation: -32 },
  earth: { background: 13, surface: 30, saturation: -18 },
  warm: { background: 10, surface: 27, saturation: 10 },
  cool: { background: 8, surface: 24, saturation: 9 },
}

const hueOffsets = {
  complementary: [0, 180, 28],
  analogous: [0, 34, -34],
  triadic: [0, 120, 240],
  monochrome: [0, 0, 0],
  'high-contrast': [0, 180, 60],
  duotone: [0, 180, 180],
  'split-complementary': [0, 150, 210],
  tetradic: [0, 90, 180],
  earth: [0, 42, -32],
}

export const createPaletteFromColor = ({
  primary = '#246BFD',
  harmony = 'analogous',
  mood = 'dark',
} = {}) => {
  const base = colorHsl(primary)
  const offsets = hueOffsets[harmony] || hueOffsets.analogous
  const adjustment = moodAdjustments[mood] || moodAdjustments.dark
  const saturation = mood === 'monochrome'
    ? 0
    : clamp(base.s + adjustment.saturation, 18, 96)
  const backgroundLightness = adjustment.background
  const surfaceLightness = adjustment.surface
  const isLight = backgroundLightness > 55
  const palette = {
    background: hslToHex({ h: base.h + offsets[2], s: clamp(saturation * 0.42, 8, 42), l: backgroundLightness }),
    surface: hslToHex({ h: base.h + offsets[1], s: clamp(saturation * 0.66, 16, 76), l: surfaceLightness }),
    primary: hslToHex({ h: base.h, s: saturation, l: clamp(base.l, 38, 58) }),
    secondary: hslToHex({ h: base.h + offsets[1], s: saturation, l: isLight ? 45 : 58 }),
    accent: hslToHex({ h: base.h + offsets[2], s: clamp(saturation + 8, 30, 100), l: isLight ? 40 : 62 }),
    text: isLight ? '#10131C' : '#FFFFFF',
    textMuted: isLight ? '#4D5568' : '#B8C3D6',
    outline: isLight ? '#11131A' : '#02040A',
    winner: hslToHex({ h: base.h + (harmony === 'monochrome' ? 0 : 52), s: clamp(saturation + 4, 28, 100), l: isLight ? 42 : 64 }),
  }
  if (harmony === 'high-contrast') {
    palette.background = isLight ? '#F7F4ED' : '#07080B'
    palette.surface = isLight ? '#111318' : '#F4F1E8'
    palette.secondary = isLight ? '#111318' : '#FFFFFF'
    palette.accent = hslToHex({ h: base.h, s: clamp(base.s + 18, 54, 100), l: isLight ? 42 : 60 })
    palette.text = isLight ? '#090A0D' : '#FFFFFF'
    palette.textMuted = isLight ? '#4D4F58' : '#C7C8CC'
    palette.outline = isLight ? '#0A0B0E' : '#010204'
  }
  if (contrastRatio(palette.text, palette.background) < 4.5) {
    palette.text = isLight ? '#090A0D' : '#FFFFFF'
  }
  return normalizePalette(palette)
}

const mergeUnlocked = (current, next, locks = []) => Object.fromEntries(
  PALETTE_KEYS.map((key) => [key, locks.includes(key) ? current[key] : next[key]]),
)

export const regeneratePalette = ({ current, primary, harmony, mood, locks = [] }) =>
  mergeUnlocked(
    normalizePalette(current),
    createPaletteFromColor({ primary, harmony, mood }),
    locks,
  )

export const transformPalette = (palette, {
  hue = 0,
  saturation = 100,
  lightness = 0,
  contrast = 100,
  locks = [],
} = {}) => {
  const source = normalizePalette(palette)
  const result = {}
  for (const key of PALETTE_KEYS) {
    if (locks.includes(key)) {
      result[key] = source[key]
      continue
    }
    const hsl = colorHsl(source[key])
    const contrastDistance = hsl.l - 50
    result[key] = hslToHex({
      h: hsl.h + hue,
      s: clamp(hsl.s * (saturation / 100), 0, 100),
      l: clamp(50 + contrastDistance * (contrast / 100) + lightness, 1, 99),
    })
  }
  return normalizePalette(result)
}

export const createPalettePreset = (name, original, current, locks = []) => {
  const base = normalizePalette(original)
  let next = base
  if (name === 'dark') next = transformPalette(base, { lightness: -14, saturation: 92, contrast: 118 })
  if (name === 'light') next = transformPalette(base, { lightness: 35, saturation: 76, contrast: 82 })
  if (name === 'monochrome') next = transformPalette(base, { saturation: 0, contrast: 112 })
  if (name === 'high-contrast') next = transformPalette(base, { saturation: 112, contrast: 145 })
  return mergeUnlocked(normalizePalette(current), next, locks)
}

export const createRandomPalette = ({ current, familyHue = 210, mood = 'dark', locks = [] }) => {
  const hue = (familyHue + Math.floor(Math.random() * 151) - 75 + 360) % 360
  const primary = hslToHex({ h: hue, s: 76, l: 52 })
  const harmonies = ['complementary', 'analogous', 'triadic', 'monochrome', 'high-contrast']
  const harmony = harmonies[Math.floor(Math.random() * harmonies.length)]
  return regeneratePalette({ current, primary, harmony, mood, locks })
}
