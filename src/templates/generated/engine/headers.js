export const headerSystems = [
  { id: 'band', label: 'Bandeau' },
  { id: 'split', label: 'Découpé' },
  { id: 'poster', label: 'Affiche' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'masthead', label: 'Masthead magazine' },
  { id: 'floating', label: 'Titre flottant' },
  { id: 'technical', label: 'Interface technique' },
  { id: 'editorial-stack', label: 'Pile éditoriale' },
]

export const createHeaderArtwork = (id, palette) => {
  if (id === 'split') return `<path d="M0 0H150L128 58H0ZM154 0H686V58H132Z" fill="${palette.surface}" opacity=".94"/><path d="M132 58L154 0" stroke="${palette.accent}" stroke-width="3"/>`
  if (id === 'poster') return `<rect width="686" height="58" fill="${palette.surface}"/><path d="M8 7H678V51H8Z" fill="none" stroke="${palette.accent}" stroke-width="1.5"/><path d="M0 54H686" stroke="${palette.primary}" stroke-width="7"/>`
  if (id === 'minimal') return `<rect width="686" height="58" fill="${palette.background}" opacity=".86"/><path d="M24 54H662" stroke="${palette.accent}" stroke-width="1"/>`
  if (id === 'masthead') return `<rect width="686" height="58" fill="${palette.text}"/><rect width="116" height="58" fill="${palette.primary}"/><path d="M124 10H674M124 48H674" stroke="${palette.outline}" stroke-width="1" opacity=".5"/>`
  if (id === 'floating') return `<path d="M86 4H600L620 50H66Z" fill="${palette.surface}" opacity=".94"/><path d="M66 50H620" stroke="${palette.accent}" stroke-width="3"/>`
  if (id === 'technical') return `<rect width="686" height="58" fill="${palette.surface}"/><path d="M0 49H686M18 8H96M590 8H668" stroke="${palette.accent}" stroke-width="2"/><path d="M10 54h80M596 54h80" stroke="${palette.textMuted}" stroke-dasharray="3 4"/>`
  if (id === 'editorial-stack') return `<rect width="686" height="58" fill="${palette.background}"/><rect x="0" y="0" width="168" height="58" fill="${palette.primary}"/><rect x="174" y="0" width="12" height="58" fill="${palette.accent}"/><path d="M194 50H676" stroke="${palette.textMuted}"/>`
  return `<rect width="686" height="58" fill="${palette.surface}" opacity=".9"/><path d="M0 58H686" stroke="${palette.accent}" stroke-width="2"/>`
}

export const createMetadata = ({ headerId, palette, typography, hasSubtitle, artDirectionId }) => {
  const titleBase = {
    id: 'eventName', zIndex: 5, lineHeight: 1, color: palette.text,
    fontFamily: typography.title, fontWeight: typography.weight,
    letterSpacing: typography.tracking, textTransform: typography.transform,
    textShadow: ['manga', 'esport', 'street', 'brutalist'].includes(artDirectionId)
      ? `2px 2px 0 ${palette.outline}`
      : 'none',
  }
  const infoBase = {
    zIndex: 5, lineHeight: 1, fontFamily: typography.labelFont,
    fontWeight: 800, letterSpacing: '.025em',
  }
  const conventional = [
    { ...titleBase, x: 122, y: hasSubtitle ? 1 : 3, width: 486, height: hasSubtitle ? 35 : 50, fontSize: hasSubtitle ? 25 : 31, align: 'center' },
    ...(hasSubtitle ? [{ ...infoBase, id: 'subtitle', x: 185, y: 35, width: 360, height: 16, fontSize: 8, align: 'center', color: palette.textMuted, letterSpacing: '.08em', textTransform: 'uppercase' }] : []),
    { ...infoBase, id: 'date', x: 10, y: 7, width: 102, height: 19, fontSize: 10, align: 'left', color: palette.text },
    { ...infoBase, id: 'participantCount', x: 10, y: 32, width: 107, height: 18, fontSize: 9, align: 'left', color: palette.accent },
  ]
  if (headerId === 'masthead') return [
    { ...titleBase, x: 128, y: 2, width: 470, height: 42, fontSize: 31, align: 'left', color: palette.outline },
    ...(hasSubtitle ? [{ ...infoBase, id: 'subtitle', x: 130, y: 40, width: 360, height: 13, fontSize: 7, align: 'left', color: palette.outline, textTransform: 'uppercase' }] : []),
    { ...infoBase, id: 'date', x: 10, y: 9, width: 96, height: 18, fontSize: 9, align: 'left', color: palette.text },
    { ...infoBase, id: 'participantCount', x: 10, y: 32, width: 100, height: 16, fontSize: 8, align: 'left', color: palette.text },
  ]
  if (headerId === 'editorial-stack') return [
    { ...titleBase, x: 198, y: 2, width: 412, height: 40, fontSize: 29, align: 'left' },
    ...(hasSubtitle ? [{ ...infoBase, id: 'subtitle', x: 200, y: 41, width: 330, height: 13, fontSize: 7, align: 'left', color: palette.textMuted, textTransform: 'uppercase' }] : []),
    { ...infoBase, id: 'date', x: 10, y: 8, width: 145, height: 18, fontSize: 10, align: 'left', color: palette.text },
    { ...infoBase, id: 'participantCount', x: 10, y: 31, width: 145, height: 18, fontSize: 9, align: 'left', color: palette.text },
  ]
  if (headerId === 'technical') return conventional.map((field) => field.id === 'eventName'
    ? { ...field, x: 138, width: 410, fontSize: 25, letterSpacing: '.08em' }
    : field)
  if (headerId === 'floating') return conventional.map((field) => field.id === 'eventName'
    ? { ...field, x: 105, width: 476, fontSize: 28 }
    : field)
  if (headerId === 'minimal') return conventional.map((field) => field.id === 'eventName'
    ? { ...field, x: 150, width: 386, fontSize: 23, letterSpacing: '.12em' }
    : field)
  return conventional
}
