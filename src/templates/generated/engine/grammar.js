import { artDirections, getArtDirection } from './artDirections.js'
import { backgroundSystems, overlaySystems, pickCompatibleOverlays } from './backgrounds.js'
import { decorationSystems } from './decorations.js'
import { frameSystems, getFrameSystem } from './frames.js'
import { geometryFamilies, getGeometryFamily } from './geometry.js'
import { headerSystems } from './headers.js'
import { getLayoutFamily, layoutFamilies } from './layouts.js'
import { getNumberSystem, numberSystems } from './numbers.js'
import { clamp, createRandomContext, pick, weightedPick } from './random.js'
import { textureSystems } from './patterns.js'
import { getTypographySystem, typographySystems } from './typography.js'

export const variationLevels = [
  {
    id: 'coherent',
    label: 'Cohérent',
    description: 'Des choix proches de la direction artistique, avec une variation mesurée.',
    preferredWeight: 12,
    outsideWeight: .35,
    overlayCount: [1, 2],
    decorationCount: [1, 1],
  },
  {
    id: 'creative',
    label: 'Créatif',
    description: 'Des associations plus inattendues, tout en gardant une vraie cohérence visuelle.',
    preferredWeight: 7,
    outsideWeight: 1.6,
    overlayCount: [2, 3],
    decorationCount: [1, 2],
  },
  {
    id: 'wild',
    label: 'Sauvage',
    description: 'Le moteur pousse les contrastes, les ruptures et les compositions expérimentales.',
    preferredWeight: 3.4,
    outsideWeight: 2.5,
    overlayCount: [3, 4],
    decorationCount: [2, 3],
  },
]

const eventTypeInfluence = {
  weekly: -7,
  major: 11,
  invitational: 7,
  arcadian: 1,
  crew: 8,
  championship: 12,
  online: -2,
  other: 0,
}

export const createDefaultGenerationBrief = (tournamentName = '') => ({
  generation: { mode: 'surprise', variation: 'creative' },
  tournament: {
    name: tournamentName,
    subtitle: '',
    date: '',
    entrants: '',
    eventType: 'weekly',
  },
  artDirection: { family: 'auto', intensity: 55 },
  composition: {
    layoutFamily: 'auto',
    winnerDominance: 76,
    density: 58,
    symmetry: 42,
  },
  panels: {
    shapeStyle: 'auto',
    frameStyle: 'auto',
    labelPosition: 'auto',
    labelWidth: 76,
    texture: 'auto',
    textureScale: 50,
  },
  typography: {
    family: 'auto',
    rankStyle: 'auto',
    headerStyle: 'auto',
    backgroundEnergy: 58,
  },
  colors: {
    mode: 'auto',
    mood: 'auto',
    primary: '#246BFD',
    secondary: '#7C3AED',
    accent: '#22D3EE',
    background: '#07111D',
    harmony: 'auto',
  },
})

const mergeSection = (defaults, value) => ({ ...defaults, ...(value || {}) })

export const normalizeGenerationBrief = (brief = {}) => {
  const defaults = createDefaultGenerationBrief(brief.tournament?.name || '')
  const legacySurprise = brief.artDirection?.family === 'surprise'
  const normalized = {
    generation: mergeSection(defaults.generation, brief.generation),
    tournament: mergeSection(defaults.tournament, brief.tournament),
    artDirection: mergeSection(defaults.artDirection, brief.artDirection),
    composition: mergeSection(defaults.composition, brief.composition),
    panels: mergeSection(defaults.panels, brief.panels),
    typography: mergeSection(defaults.typography, brief.typography),
    colors: mergeSection(defaults.colors, brief.colors),
  }
  if (legacySurprise) {
    normalized.generation.mode = 'surprise'
    normalized.artDirection.family = 'auto'
  }
  if (!['guided', 'surprise'].includes(normalized.generation.mode)) {
    normalized.generation.mode = normalized.artDirection.family === 'auto' ? 'surprise' : 'guided'
  }
  if (!variationLevels.some(({ id }) => id === normalized.generation.variation)) {
    normalized.generation.variation = 'creative'
  }
  normalized.artDirection.intensity = clamp(Number(normalized.artDirection.intensity), 0, 100)
  normalized.composition.winnerDominance = clamp(Number(normalized.composition.winnerDominance), 0, 100)
  normalized.composition.density = clamp(Number(normalized.composition.density), 0, 100)
  normalized.composition.symmetry = clamp(Number(normalized.composition.symmetry), 0, 100)
  normalized.panels.labelWidth = clamp(Number(normalized.panels.labelWidth), 40, 100)
  normalized.panels.textureScale = clamp(Number(normalized.panels.textureScale), 0, 100)
  normalized.typography.backgroundEnergy = clamp(Number(normalized.typography.backgroundEnergy), 0, 100)
  return normalized
}

const selectSystem = ({ values, id, preferred, variation, random }) => {
  const explicit = values.find((value) => value.id === id)
  if (explicit) return explicit
  const preferredSet = new Set(preferred || [])
  return weightedPick(
    values,
    (value) => preferredSet.has(value.id) ? variation.preferredWeight : variation.outsideWeight,
    random,
  )
}

const normalizeExplicitId = (id, getter) => {
  if (!id || id === 'auto') return 'auto'
  return getter(id)?.id || 'auto'
}

const chooseDirection = (brief, random) => {
  const guidedDirection = getArtDirection(brief.artDirection.family)
  if (brief.generation.mode === 'guided' && guidedDirection) return guidedDirection
  return pick(artDirections, random)
}

const choosePaletteRecipe = ({ direction, brief, variation, random }) => {
  const custom = brief.colors.mode === 'custom'
  const primaryOnly = brief.colors.mode === 'primary'
  const base = custom || primaryOnly ? brief.colors.primary : pick(direction.bases, random)
  const harmony = brief.colors.harmony !== 'auto'
    ? brief.colors.harmony
    : weightedPick(
      ['analogous', 'complementary', 'triadic', 'monochrome', 'duotone', 'split-complementary', 'tetradic', 'earth', 'high-contrast'],
      (id) => direction.harmonies.includes(id) ? variation.preferredWeight : variation.outsideWeight,
      random,
    )
  const mood = brief.colors.mood !== 'auto'
    ? brief.colors.mood
    : weightedPick(
      ['dark', 'light', 'vivid', 'pastel', 'monochrome', 'contrast', 'neon', 'muted', 'earth', 'warm', 'cool'],
      (id) => direction.moods.includes(id) ? variation.preferredWeight : variation.outsideWeight,
      random,
    )
  return {
    id: `${harmony}-${mood}`,
    base,
    harmony,
    mood,
    mode: brief.colors.mode,
    custom: custom ? {
      primary: brief.colors.primary,
      secondary: brief.colors.secondary,
      accent: brief.colors.accent,
      background: brief.colors.background,
    } : null,
  }
}

const hierarchyOptions = ['giant', 'balanced', 'number-led', 'isolated', 'chromatic']
const proportionOptions = ['monumental', 'dominant', 'tiered', 'balanced', 'editorial']

const hierarchyForLayout = (layoutId, dominance, random) => {
  if (dominance >= 82) return pick(['giant', 'isolated', 'number-led'], random)
  if (['podium', 'hero-left', 'hero-right', 'hero-top', 'hero-bottom', 'corner-hero', 'comic-splash'].includes(layoutId)) {
    return pick(['giant', 'chromatic', 'number-led'], random)
  }
  return pick(hierarchyOptions, random)
}

const proportionFor = (layoutId, dominance) => {
  if (dominance >= 85) return 'monumental'
  if (dominance >= 68) return 'dominant'
  if (['editorial', 'magazine', 'poster'].includes(layoutId)) return 'editorial'
  if (['horizontal-strips', 'vertical-strips', 'swiss-grid'].includes(layoutId)) return 'balanced'
  return 'tiered'
}

const pickSeveral = ({ pool, preferred, count, variation, random }) => {
  const result = []
  while (result.length < Math.min(count, pool.length)) {
    const selected = selectSystem({ values: pool, id: 'auto', preferred, variation, random })
    if (!result.includes(selected.id)) result.push(selected.id)
  }
  return result
}

export const resolveVisualGrammar = ({ brief: rawBrief, seed }) => {
  const brief = normalizeGenerationBrief(rawBrief)
  const randoms = createRandomContext(seed)
  const variation = variationLevels.find(({ id }) => id === brief.generation.variation) || variationLevels[1]
  const direction = chooseDirection(brief, randoms.for('art-direction'))
  const freedomMultiplier = brief.generation.mode === 'surprise' ? 1 : .48
  const variationAmplitude = variation.id === 'wild' ? 34 : variation.id === 'creative' ? 21 : 10
  const varyIntent = (value, namespace, multiplier = 1) => clamp(
    Number(value) +
      (randoms.for(namespace)() * 2 - 1) * variationAmplitude * freedomMultiplier * multiplier,
    0,
    100,
  )
  const resolvedDensity = Math.round(varyIntent(brief.composition.density, 'density'))
  const resolvedDominance = Math.round(varyIntent(brief.composition.winnerDominance, 'dominance', .72))
  const resolvedSymmetry = Math.round(varyIntent(brief.composition.symmetry, 'symmetry', .8))

  const layout = selectSystem({
    values: layoutFamilies,
    id: normalizeExplicitId(brief.composition.layoutFamily, getLayoutFamily),
    preferred: direction.layouts,
    variation,
    random: randoms.for('layout'),
  })
  const primaryGeometry = selectSystem({
    values: geometryFamilies,
    id: normalizeExplicitId(brief.panels.shapeStyle, getGeometryFamily),
    preferred: direction.geometries,
    variation,
    random: randoms.for('geometry-primary'),
  })
  const secondaryGeometry = variation.id === 'coherent'
    ? primaryGeometry
    : selectSystem({
      values: geometryFamilies.filter(({ id }) => id !== primaryGeometry.id),
      id: 'auto',
      preferred: direction.geometries,
      variation,
      random: randoms.for('geometry-secondary'),
    })
  const background = selectSystem({
    values: backgroundSystems,
    id: 'auto',
    preferred: direction.backgrounds,
    variation,
    random: randoms.for('background'),
  })
  const frame = selectSystem({
    values: frameSystems,
    id: normalizeExplicitId(brief.panels.frameStyle, getFrameSystem),
    preferred: direction.frames,
    variation,
    random: randoms.for('frame'),
  })
  const typography = selectSystem({
    values: typographySystems,
    id: normalizeExplicitId(brief.typography.family, getTypographySystem),
    preferred: direction.typography,
    variation,
    random: randoms.for('typography'),
  })
  const number = selectSystem({
    values: numberSystems,
    id: normalizeExplicitId(brief.typography.rankStyle, getNumberSystem),
    preferred: direction.numbers,
    variation,
    random: randoms.for('numbers'),
  })
  const header = selectSystem({
    values: headerSystems,
    id: headerSystems.some(({ id }) => id === brief.typography.headerStyle) ? brief.typography.headerStyle : 'auto',
    preferred: direction.headers,
    variation,
    random: randoms.for('header'),
  })
  const texture = selectSystem({
    values: textureSystems,
    id: textureSystems.some(({ id }) => id === brief.panels.texture) ? brief.panels.texture : 'auto',
    preferred: direction.textures,
    variation,
    random: randoms.for('texture'),
  })
  const overlayDensityOffset = resolvedDensity >= 72 ? 1 : resolvedDensity <= 32 ? -1 : 0
  const overlayCount = clamp(variation.overlayCount[0] + Math.floor(
    randoms.for('overlay-count')() * (variation.overlayCount[1] - variation.overlayCount[0] + 1),
  ) + overlayDensityOffset, 1, 4)
  const overlays = pickCompatibleOverlays({
    preferred: variation.id === 'wild'
      ? [...direction.overlays, ...overlaySystems.map(({ id }) => id)]
      : direction.overlays,
    count: overlayCount,
    random: randoms.for('overlays'),
  })
  const decorationDensityOffset = resolvedDensity >= 70 ? 1 : resolvedDensity <= 30 ? -1 : 0
  const decorationCount = clamp(variation.decorationCount[0] + Math.floor(
    randoms.for('decoration-count')() * (variation.decorationCount[1] - variation.decorationCount[0] + 1),
  ) + decorationDensityOffset, 1, 4)
  const decorations = pickSeveral({
    pool: decorationSystems.filter(({ id }) => id !== 'none'),
    preferred: direction.decorations,
    count: decorationCount,
    variation,
    random: randoms.for('decorations'),
  })
  const hierarchy = hierarchyForLayout(layout.id, resolvedDominance, randoms.for('hierarchy'))
  const palette = choosePaletteRecipe({ direction, brief, variation, random: randoms.for('palette') })
  const labelPosition = brief.panels.labelPosition !== 'auto'
    ? brief.panels.labelPosition
    : pick(['bottom', 'top', 'alternating'], randoms.for('labels'))
  const effectiveIntensity = clamp(
    brief.artDirection.intensity + (eventTypeInfluence[brief.tournament.eventType] || 0),
    0,
    100,
  )

  return {
    version: 1,
    mode: brief.generation.mode,
    variation: variation.id,
    artDirection: direction.id,
    layoutFamily: layout.id,
    geometryFamily: primaryGeometry.id,
    secondaryGeometryFamily: secondaryGeometry.id,
    geometryMix: variation.id,
    hierarchyFamily: hierarchy,
    proportionFamily: proportionFor(layout.id, resolvedDominance),
    paletteFamily: palette.id,
    paletteRecipe: palette,
    typographyFamily: typography.id,
    backgroundFamily: background.id,
    overlayFamilies: overlays,
    frameFamily: frame.id,
    decorationFamilies: decorations,
    numberSystem: number.id,
    headerSystem: header.id,
    textureSystem: texture.id,
    labelPosition,
    density: resolvedDensity,
    symmetry: resolvedSymmetry,
    winnerDominance: resolvedDominance,
    intensity: effectiveIntensity,
    backgroundEnergy: brief.typography.backgroundEnergy,
    labelWidth: brief.panels.labelWidth,
    textureScale: brief.panels.textureScale,
  }
}

export const visualGrammarKeys = [
  'layoutFamily',
  'geometryFamily',
  'secondaryGeometryFamily',
  'hierarchyFamily',
  'proportionFamily',
  'paletteFamily',
  'typographyFamily',
  'backgroundFamily',
  'frameFamily',
  'decorationFamilies',
  'numberSystem',
  'headerSystem',
  'textureSystem',
]

export const grammarSignature = (grammar, geometryFingerprint = '') => ({
  layoutFamily: grammar.layoutFamily,
  geometryFamily: `${grammar.geometryFamily}+${grammar.secondaryGeometryFamily}`,
  geometryFingerprint,
  hierarchyFamily: grammar.hierarchyFamily,
  proportionFamily: grammar.proportionFamily,
  paletteFamily: grammar.paletteFamily,
  typographyFamily: grammar.typographyFamily,
  backgroundFamily: `${grammar.backgroundFamily}+${[...(grammar.overlayFamilies || [])].sort().join('+')}`,
  frameFamily: grammar.frameFamily,
  decorationFamily: [...(grammar.decorationFamilies || [])].sort().join('+') || 'none',
  numberSystem: grammar.numberSystem,
  headerSystem: grammar.headerSystem,
  textureSystem: grammar.textureSystem,
})

const signatureWeights = {
  layoutFamily: .23,
  geometryFamily: .11,
  geometryFingerprint: .08,
  backgroundFamily: .11,
  typographyFamily: .09,
  paletteFamily: .09,
  hierarchyFamily: .08,
  proportionFamily: .06,
  frameFamily: .06,
  decorationFamily: .04,
  numberSystem: .03,
  headerSystem: .02,
}

const geometryDistance = (first, second) => {
  if (!first || !second) return first === second ? 0 : 1
  const a = String(first).split('|').map(Number)
  const b = String(second).split('|').map(Number)
  const count = Math.max(a.length, b.length)
  if (!count) return 0
  let difference = 0
  for (let index = 0; index < count; index += 1) {
    difference += Math.min(1, Math.abs((a[index] || 0) - (b[index] || 0)) / 10)
  }
  return difference / count
}

export const signatureDistance = (first = {}, second = {}, brief) => {
  const normalizedBrief = brief ? normalizeGenerationBrief(brief) : null
  const locked = new Set()
  if (normalizedBrief?.composition.layoutFamily !== 'auto') locked.add('layoutFamily')
  if (normalizedBrief?.panels.shapeStyle !== 'auto') locked.add('geometryFamily')
  if (normalizedBrief?.typography.family !== 'auto') locked.add('typographyFamily')
  if (normalizedBrief?.panels.frameStyle !== 'auto') locked.add('frameFamily')
  if (normalizedBrief?.typography.rankStyle !== 'auto') locked.add('numberSystem')
  if (normalizedBrief?.typography.headerStyle !== 'auto') locked.add('headerSystem')
  if (normalizedBrief?.colors.mode === 'custom') locked.add('paletteFamily')
  let weightedDifference = 0
  let weightTotal = 0
  for (const [key, weight] of Object.entries(signatureWeights)) {
    if (locked.has(key)) continue
    weightTotal += weight
    if (key === 'geometryFingerprint') {
      weightedDifference += geometryDistance(first[key], second[key]) * weight
    } else if (first[key] !== second[key]) {
      weightedDifference += weight
    }
  }
  return weightTotal ? weightedDifference / weightTotal : 0
}

export const getVariation = (id) => variationLevels.find((variation) => variation.id === id) || variationLevels[1]
export const getProportionOptions = () => [...proportionOptions]
