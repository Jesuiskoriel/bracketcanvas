import { normalizePalette } from './generated/palette.js'
import { recolorGeneratedTemplate } from './generated/generator.js'

const ZERO_DEFAULT_PALETTE = normalizePalette({
  background: '#06101D',
  surface: '#0B3376',
  primary: '#126CC5',
  secondary: '#0DC7E5',
  accent: '#A7F3FF',
  text: '#F8FDFF',
  textMuted: '#A9C7D6',
  outline: '#020914',
  winner: '#55E3FF',
})

export const getTemplatePaletteState = (template, savedState) => {
  const originalPalette = normalizePalette(
    savedState?.originalPalette || template.originalPalette || template.palette || ZERO_DEFAULT_PALETTE,
  )
  return {
    originalPalette,
    currentPalette: normalizePalette(savedState?.currentPalette || template.palette || originalPalette),
    locks: Array.isArray(savedState?.locks)
      ? savedState.locks.filter((key) => Object.hasOwn(originalPalette, key))
      : Array.isArray(template.paletteLocks) ? template.paletteLocks : [],
  }
}

const recolorZeroTemplate = (template, paletteState) => ({
  ...template,
  palette: paletteState.currentPalette,
  originalPalette: paletteState.originalPalette,
  paletteLocks: paletteState.locks,
  metadata: template.metadata.map((field) => ({
    ...field,
    color: field.id === 'participantCount'
      ? paletteState.currentPalette.accent
      : paletteState.currentPalette.text,
    textShadow: field.textShadow
      ? `2px 2px 0 ${paletteState.currentPalette.outline}`
      : field.textShadow,
  })),
  rankStyle: {
    ...template.rankStyle,
    WebkitTextStroke: `1px ${paletteState.currentPalette.outline}`,
  },
})

export const applyPaletteStateToTemplate = (template, savedState) => {
  const paletteState = getTemplatePaletteState(template, savedState)
  if (template.generated) {
    return recolorGeneratedTemplate(
      { ...template, originalPalette: paletteState.originalPalette },
      paletteState.currentPalette,
      paletteState.locks,
    )
  }
  return recolorZeroTemplate(template, paletteState)
}

export const createPersistablePaletteState = (template) => ({
  originalPalette: normalizePalette(template.originalPalette || template.palette || ZERO_DEFAULT_PALETTE),
  currentPalette: normalizePalette(template.palette || template.originalPalette || ZERO_DEFAULT_PALETTE),
  locks: Array.isArray(template.paletteLocks) ? template.paletteLocks : [],
})
