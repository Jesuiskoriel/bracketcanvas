import { clamp } from './random.js'

export const numberSystems = [
  { id: 'giant-back', label: 'Géant en arrière-plan' },
  { id: 'badge-circle', label: 'Badge rond' },
  { id: 'badge-square', label: 'Badge carré' },
  { id: 'outline', label: 'Contour' },
  { id: 'solid', label: 'Plein' },
  { id: 'watermark', label: 'Filigrane' },
  { id: 'attached', label: 'Accroché au cadre' },
  { id: 'floating', label: 'Flottant' },
  { id: 'corner-cut', label: 'Cartouche angulaire' },
  { id: 'shadow', label: 'Ombre portée' },
  { id: 'clean', label: 'Minimal' },
]

const aliases = { impact: 'outline', badge: 'badge-circle' }

export const getNumberSystem = (id) => numberSystems.find(
  (system) => system.id === (aliases[id] || id),
)

export const createRankStyle = ({ systemId, palette, typography }) => {
  const base = {
    fontFamily: typography.title,
    fontWeight: typography.weight,
    fontStyle: ['condensed', 'comic', 'heavy-display'].includes(typography.id) ? 'italic' : 'normal',
  }
  if (systemId === 'badge-circle') return { ...base, background: palette.winner, borderRadius: '999px', padding: '.08em .22em', WebkitTextStroke: '0 transparent', textShadow: `0 2px 0 ${palette.outline}`, boxShadow: `0 0 0 2px ${palette.outline}` }
  if (systemId === 'badge-square') return { ...base, background: palette.accent, borderRadius: '2px', padding: '.05em .2em', WebkitTextStroke: `1px ${palette.outline}`, textShadow: 'none', boxShadow: `3px 3px 0 ${palette.outline}` }
  if (systemId === 'solid') return { ...base, WebkitTextStroke: '0 transparent', textShadow: `3px 3px 0 ${palette.outline}` }
  if (systemId === 'watermark') return { ...base, opacity: .32, WebkitTextStroke: `1px ${palette.text}`, textShadow: 'none' }
  if (systemId === 'attached') return { ...base, background: palette.outline, padding: '.06em .18em', WebkitTextStroke: `1px ${palette.accent}`, textShadow: 'none', boxShadow: `inset 0 0 0 1px ${palette.accent}` }
  if (systemId === 'floating') return { ...base, WebkitTextStroke: `1.5px ${palette.outline}`, textShadow: `0 5px 9px ${palette.outline}` }
  if (systemId === 'corner-cut') return { ...base, background: palette.surface, padding: '.03em .22em', clipPath: 'polygon(12% 0,100% 0,88% 100%,0 100%)', WebkitTextStroke: `1px ${palette.outline}`, textShadow: 'none' }
  if (systemId === 'shadow') return { ...base, WebkitTextStroke: `1px ${palette.outline}`, textShadow: `5px 5px 0 ${palette.secondary}, 7px 7px 0 ${palette.outline}` }
  if (systemId === 'clean') return { ...base, WebkitTextStroke: `1px ${palette.outline}`, textShadow: 'none' }
  if (systemId === 'giant-back') return { ...base, opacity: .7, WebkitTextStroke: `2px ${palette.outline}`, textShadow: `5px 5px 0 ${palette.secondary}` }
  return { ...base, WebkitTextStroke: `2px ${palette.outline}`, textShadow: `2px 2px 0 ${palette.secondary}, 4px 4px 0 ${palette.outline}` }
}

export const createSlotRank = ({ systemId, slot, index, palette, hierarchy, random }) => {
  const compact = Math.min(slot.width, slot.height)
  const baseSize = index === 0 ? Math.min(58, Math.max(36, compact * .27))
    : index < 3 ? Math.min(40, Math.max(24, compact * .23))
      : Math.min(31, Math.max(19, compact * .2))
  let size = clamp(baseSize, 16, 68)
  let x = slot.x + Math.max(18, slot.width * .12)
  let y = slot.y + Math.max(20, slot.height * .18)
  let layer = 'front'
  if ((index + Math.floor(random() * 2)) % 3 === 1) x = slot.x + slot.width - Math.max(18, slot.width * .12)
  if (systemId === 'giant-back') {
    size = clamp(index === 0 ? slot.height * .48 : slot.height * .34, 24, 76)
    x = slot.x + slot.width * (index % 2 ? .76 : .24)
    y = slot.y + slot.height * .48
    layer = 'back'
  } else if (systemId === 'watermark') {
    size = clamp(slot.height * .43, 25, 72)
    x = slot.x + slot.width * .5
    y = slot.y + slot.height * .48
    layer = 'back'
  } else if (systemId === 'attached' || systemId === 'corner-cut') {
    x = slot.x + (index % 2 ? slot.width - size * .35 : size * .35)
    y = slot.y + size * .36
  } else if (hierarchy === 'number-led' && index === 0) {
    size = clamp(size * 1.28, 32, 76)
  }
  return {
    x: Math.round(x),
    y: Math.round(y),
    size: Math.round(size),
    color: index === 0 ? palette.winner : palette.text,
    layer,
  }
}
