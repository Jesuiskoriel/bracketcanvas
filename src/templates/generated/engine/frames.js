import { CANVAS_HEIGHT, CANVAS_WIDTH, svgDataUrl } from './constants.js'
import { clamp } from './random.js'

export const frameSystems = [
  { id: 'none', label: 'Sans cadre' },
  { id: 'fine', label: 'Trait fin' },
  { id: 'thick', label: 'Trait épais' },
  { id: 'double', label: 'Double trait' },
  { id: 'glow', label: 'Lueur' },
  { id: 'offset', label: 'Ombre décalée' },
  { id: 'irregular', label: 'Encrage irrégulier' },
  { id: 'ink', label: 'Encrage noir' },
  { id: 'techno', label: 'Interface techno' },
  { id: 'retro', label: 'Bordure rétro' },
  { id: 'shadow', label: 'Cadre ombré' },
  { id: 'ornamental', label: 'Ornemental' },
]

const aliases = { accent: 'offset' }

export const getFrameSystem = (id) => frameSystems.find(
  (system) => system.id === (aliases[id] || id),
)

const polygon = (slot) => slot.points.map((point) => point.join(',')).join(' ')

const frameForSlot = ({ systemId, slot, palette, intensity, index }) => {
  const points = polygon(slot)
  const width = 1.4 + clamp(intensity, 0, 100) * .035
  if (systemId === 'none') return ''
  if (systemId === 'fine') return `<polygon points="${points}" fill="none" stroke="${palette.text}" stroke-width="1.4" stroke-linejoin="round" opacity=".86"/>`
  if (systemId === 'thick') return `<polygon points="${points}" fill="none" stroke="${palette.outline}" stroke-width="${width + 5}" stroke-linejoin="round"/>`
  if (systemId === 'double') return `<polygon points="${points}" fill="none" stroke="${palette.outline}" stroke-width="${width + 6}" stroke-linejoin="round"/><polygon points="${points}" fill="none" stroke="${index === 0 ? palette.winner : palette.accent}" stroke-width="1.6" stroke-linejoin="round"/>`
  if (systemId === 'glow') return `<polygon points="${points}" fill="none" stroke="${palette.accent}" stroke-width="${width + 6}" stroke-linejoin="round" opacity=".2"/><polygon points="${points}" fill="none" stroke="${palette.text}" stroke-width="${width}" stroke-linejoin="round"/>`
  if (systemId === 'offset') return `<polygon points="${points}" transform="translate(4 4)" fill="none" stroke="${palette.secondary}" stroke-width="${width + 4}" stroke-linejoin="round"/><polygon points="${points}" fill="none" stroke="${palette.outline}" stroke-width="${width + 2}" stroke-linejoin="round"/>`
  if (systemId === 'irregular') return `<polygon points="${points}" fill="none" stroke="${palette.outline}" stroke-width="${width + 5 + (index % 3)}" stroke-linejoin="round"/><polygon points="${points}" transform="translate(${index % 2 ? -1 : 1} ${index % 2 ? 1 : -1})" fill="none" stroke="${palette.text}" stroke-width="1" stroke-linejoin="round" opacity=".72"/>`
  if (systemId === 'ink') return `<polygon points="${points}" fill="none" stroke="${palette.outline}" stroke-width="${width + 7}" stroke-linejoin="bevel"/><polygon points="${points}" fill="none" stroke="${palette.text}" stroke-width="1.2" opacity=".8"/>`
  if (systemId === 'techno') return `<polygon points="${points}" fill="none" stroke="${palette.outline}" stroke-width="${width + 5}"/><polygon points="${points}" fill="none" stroke="${palette.accent}" stroke-width="1.4" stroke-dasharray="${10 + index * 2} 5"/>`
  if (systemId === 'retro') return `<polygon points="${points}" transform="translate(3 3)" fill="none" stroke="${palette.outline}" stroke-width="${width + 5}"/><polygon points="${points}" fill="none" stroke="${palette.text}" stroke-width="${width + 1}"/><polygon points="${points}" fill="none" stroke="${palette.primary}" stroke-width="1"/>`
  if (systemId === 'shadow') return `<polygon points="${points}" transform="translate(5 5)" fill="${palette.outline}" opacity=".55"/><polygon points="${points}" fill="none" stroke="${palette.text}" stroke-width="${width}"/>`
  return `<polygon points="${points}" fill="none" stroke="${palette.outline}" stroke-width="${width + 6}"/><polygon points="${points}" fill="none" stroke="${palette.winner}" stroke-width="1.6"/><circle cx="${slot.x + 7}" cy="${slot.y + 7}" r="3" fill="${palette.winner}"/><circle cx="${slot.x + slot.width - 7}" cy="${slot.y + slot.height - 7}" r="3" fill="${palette.winner}"/>`
}

export const createFrameLayer = ({ slots, systemId, palette, intensity = 50 }) => {
  const frames = slots.map((slot, index) => frameForSlot({ systemId, slot, palette, intensity, index })).join('')
  const dividerWidth = systemId === 'none' ? 1 : Math.max(2, 1 + intensity / 28)
  return {
    id: 'generated-frames',
    zIndex: 20,
    src: svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">${frames}<path d="M0 59H686" stroke="${palette.outline}" stroke-width="${dividerWidth + 3}"/><path d="M0 58H686" stroke="${palette.accent}" stroke-width="${Math.max(1, dividerWidth * .45)}"/></svg>`),
  }
}
