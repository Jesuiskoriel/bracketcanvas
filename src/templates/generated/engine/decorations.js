import { svgDataUrl } from './constants.js'
import { clamp, pick, round } from './random.js'

export const decorationSystems = [
  'none', 'labels', 'arrows', 'burst', 'technical', 'crosses', 'coordinates',
  'manga-marks', 'pixel-icons', 'stars', 'runes', 'ornaments', 'editorial',
  'rules', 'stickers', 'bubbles',
].map((id) => ({ id }))

const artwork = (id, palette, index) => {
  const variants = {
    labels: `<path d="M3 9H72L63 27H0Z" fill="${palette.accent}"/><path d="M9 14H48" stroke="${palette.outline}" stroke-width="3"/>`,
    arrows: `<path d="M2 22H52L42 10M52 22L42 34" fill="none" stroke="${palette.accent}" stroke-width="7"/>`,
    burst: `<path d="M38 1L43 22L66 10L52 31L76 38L51 44L66 67L43 54L37 78L31 54L9 67L22 44L0 38L23 31L9 10L31 22Z" fill="${palette.accent}"/>`,
    technical: `<path d="M2 28V2H28M78 2H104V28M104 58V84H78M28 84H2V58" fill="none" stroke="${palette.accent}" stroke-width="3"/><circle cx="53" cy="43" r="13" fill="none" stroke="${palette.text}" stroke-dasharray="4 4"/>`,
    crosses: `<path d="M23 2V44M2 23H44" stroke="${palette.accent}" stroke-width="8"/>`,
    coordinates: `<path d="M2 2H74V34H2Z" fill="none" stroke="${palette.accent}"/><path d="M8 11H62M8 18H42M8 25H55" stroke="${palette.text}" stroke-width="2"/>`,
    'manga-marks': `<path d="M2 72L35 4M22 76L48 6M44 78L62 10" stroke="${palette.accent}" stroke-width="7"/>`,
    'pixel-icons': `<path d="M2 2H20V20H38V38H20V56H2V38H-16V20H2Z" fill="${palette.accent}"/>`,
    stars: `<path d="M34 2L42 25L66 26L47 40L53 64L34 50L14 64L21 40L2 26L26 25Z" fill="${palette.accent}"/>`,
    runes: `<path d="M34 2L64 38L34 74L4 38Z M34 12V64M14 38H54" fill="none" stroke="${palette.accent}" stroke-width="4"/>`,
    ornaments: `<path d="M2 38C20 6 42 6 58 38C74 70 98 70 116 38M16 38H102" fill="none" stroke="${palette.accent}" stroke-width="3"/>`,
    editorial: `<text x="2" y="62" fill="${palette.accent}" font-family="Georgia,serif" font-size="66" font-weight="700">${String(index + 1).padStart(2, '0')}</text>`,
    rules: `<path d="M2 8H118M2 19H76M2 30H102" stroke="${palette.accent}" stroke-width="3"/>`,
    stickers: `<path d="M5 14L72 2L82 45L14 58Z" fill="${palette.accent}" stroke="${palette.outline}" stroke-width="4"/><path d="M19 25L63 18M22 36L54 31" stroke="${palette.outline}" stroke-width="4"/>`,
    bubbles: `<circle cx="33" cy="33" r="27" fill="none" stroke="${palette.accent}" stroke-width="7"/><circle cx="70" cy="16" r="11" fill="${palette.text}" opacity=".55"/>`,
  }
  return variants[id] || ''
}

export const createDecorations = ({ systemIds, palette, intensity, density = 50, random }) => {
  const selected = systemIds.filter((id) => id !== 'none')
  if (!selected.length) return []
  const count = Math.round(
    .5 + clamp(intensity, 0, 100) / 42 + clamp(density, 0, 100) / 36,
  )
  return Array.from({ length: count }, (_, index) => {
    const systemId = pick(selected, random)
    const width = round(34 + random() * 78)
    const height = round(30 + random() * 60)
    const onRight = index % 2 === 0
    const x = round(onRight ? 686 - width - random() * 38 : random() * 42)
    const y = round(64 + random() * Math.max(1, 316 - height))
    return {
      id: `generated-${systemId}-${index}`,
      x, y, width, height,
      zIndex: 22,
      opacity: round(.28 + random() * .42),
      blendMode: 'normal',
      rotation: round(-16 + random() * 32, 1),
      flipped: random() > .5,
      src: svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90" viewBox="0 0 120 90">${artwork(systemId, palette, index)}</svg>`),
    }
  })
}
