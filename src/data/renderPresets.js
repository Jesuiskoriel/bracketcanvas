const GENERIC_PRESETS = {
  single: { x: 0, y: 0, scale: 1.2, flipped: false },
  duoPrimary: { x: -19, y: 1, scale: 1.15, flipped: false },
  duoSecondary: { x: 21, y: 2, scale: 0.95, flipped: true },
}

// Des ajustements par personnage pourront être ajoutés ici sans changer l'importeur.
export const CHARACTER_RENDER_PRESETS = {}

const getPreset = (characterId, composition) => ({
  ...GENERIC_PRESETS[composition],
  ...CHARACTER_RENDER_PRESETS[characterId]?.[composition],
})

export const getImportedRenderTransforms = (primaryId, secondaryId = '') => {
  const primary = getPreset(primaryId, secondaryId ? 'duoPrimary' : 'single')
  const secondary = secondaryId
    ? getPreset(secondaryId, 'duoSecondary')
    : GENERIC_PRESETS.duoSecondary

  return {
    x: primary.x,
    y: primary.y,
    scale: primary.scale,
    flipped: primary.flipped,
    opacity: 100,
    secondaryX: secondary.x,
    secondaryY: secondary.y,
    secondaryScale: secondary.scale,
    secondaryFlipped: secondary.flipped,
    secondaryOpacity: 100,
  }
}
