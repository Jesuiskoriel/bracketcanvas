import { artDirections, surpriseDirection } from './engine/artDirections.js'
import { compileGeneratedTemplate } from './engine/compiler.js'
import {
  createDefaultGenerationBrief,
  getVariation,
  normalizeGenerationBrief,
  signatureDistance,
  variationLevels,
} from './engine/grammar.js'
import { layoutFamilies } from './engine/layouts.js'
import { normalizePalette, PALETTE_KEYS } from './palette.js'
import {
  analyzeGeneratedTemplate,
  validateGeneratedTemplate,
} from './engine/validation.js'

export const createTemplateSeed = () => {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(2)
    globalThis.crypto.getRandomValues(values)
    return `${values[0].toString(36)}${values[1].toString(36)}`
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
}

const resolvedSeedPattern = /~(?:q|n)\d+$/
const QUALITY_CANDIDATES = 16

const samePalette = (first, second) => PALETTE_KEYS.every(
  (key) => first[key] === second[key],
)

const enrichWithAnalysis = (template, analysis) => ({
  ...template,
  designScore: analysis.score,
  designWarnings: analysis.warnings,
})

const matchesPrevious = (template, previousSignature, previousTemplate) => {
  if (!previousSignature && !previousTemplate) return false
  const legacySignature = `${template.familyId}:${template.layoutId}`
  if (previousSignature && (
    previousSignature === legacySignature ||
    previousSignature === template.signatureKey
  )) return true
  if (!previousTemplate?.slots?.length) return false
  return previousTemplate.slots.every(
    (slot, index) => slot.clipPath === template.slots[index]?.clipPath,
  )
}

export const generateTemplate = ({
  brief: rawBrief,
  seed: requestedSeed,
  previousSignature = '',
  previousTemplate,
} = {}) => {
  const brief = normalizeGenerationBrief(rawBrief)
  const seedRoot = String(requestedSeed || createTemplateSeed())
  const candidateSeeds = resolvedSeedPattern.test(seedRoot)
    ? [seedRoot]
    : Array.from(
      { length: QUALITY_CANDIDATES },
      (_, index) => index === 0 ? seedRoot : `${seedRoot}~q${index}`,
    )
  let best = null

  for (const seed of candidateSeeds) {
    const template = compileGeneratedTemplate({ brief, seed })
    const analysis = analyzeGeneratedTemplate(template, brief)
    const enriched = enrichWithAnalysis(template, analysis)
    const repeated = matchesPrevious(enriched, previousSignature, previousTemplate)
    const candidate = {
      template: enriched,
      analysis,
      rank: analysis.score - (repeated ? 24 : 0),
    }
    if (!best || candidate.rank > best.rank) best = candidate
  }

  if (!best || best.analysis.hardErrors.length > 0 || !best.analysis.valid) {
    const reason = best?.analysis.hardErrors[0] || best?.analysis.warnings[0] || 'géométrie non valide'
    throw new Error(`Impossible de produire une proposition exploitable : ${reason}`)
  }
  return best.template
}

export const getTemplateSignature = (template) => {
  if (template?.visualSignature && typeof template.visualSignature === 'object') {
    return { ...template.visualSignature }
  }
  if (!template) return null
  return {
    layoutFamily: template.layoutId || 'legacy',
    geometryFamily: (template.slots || []).map(({ clipPath }) => clipPath).join(';'),
    geometryFingerprint: (template.slots || []).map((slot) => [
      Math.round(slot.x), Math.round(slot.y), Math.round(slot.width),
      Math.round(slot.height), slot.points?.length || 0,
    ].join(':')).join('|'),
    hierarchyFamily: 'legacy',
    proportionFamily: 'legacy',
    paletteFamily: template.familyId || 'legacy',
    typographyFamily: 'legacy',
    backgroundFamily: 'legacy',
    frameFamily: 'legacy',
    decorationFamily: 'legacy',
    numberSystem: 'legacy',
    headerSystem: 'legacy',
    textureSystem: 'legacy',
  }
}

export const templateSignatureDistance = (first, second, brief) =>
  signatureDistance(first, second, brief)

export const findNovelProposal = ({
  brief: rawBrief,
  recentSignatures = [],
  seedRoot = createTemplateSeed(),
  candidateCount = 28,
} = {}) => {
  const brief = normalizeGenerationBrief(rawBrief)
  const known = recentSignatures.filter((signature) => signature && typeof signature === 'object')
  if (!known.length) return generateTemplate({ brief, seed: seedRoot })
  const variation = getVariation(brief.generation.variation)
  const desiredDistance = variation.id === 'wild' ? .62 : variation.id === 'creative' ? .5 : .32
  let best = null

  for (let index = 0; index < candidateCount; index += 1) {
    const seed = `${seedRoot}~n${index}`
    try {
      const template = generateTemplate({ brief, seed })
      const signature = getTemplateSignature(template)
      const distance = Math.min(...known.map((candidate) =>
        templateSignatureDistance(signature, candidate, brief)))
      const novelty = Math.min(1, distance / desiredDistance)
      const score = novelty * 74 + (template.designScore || 78) * .26
      if (!best || score > best.score) best = { template, score, distance }
      if (distance >= desiredDistance && (template.designScore || 0) >= 88) break
    } catch {
      // Une graine rejetée n'empêche pas la recherche d'une proposition suivante.
    }
  }
  if (!best) return generateTemplate({ brief, seed: seedRoot })
  return best.template
}

const recolorLegacyTemplate = (template, palette, locks) => {
  const current = normalizePalette(template.palette)
  if (samePalette(current, palette)) return { ...template, palette, paletteLocks: locks }
  return {
    ...template,
    palette,
    paletteLocks: locks,
    canvasStyle: { ...template.canvasStyle, backgroundColor: palette.background },
    slotShadeStyle: {
      ...template.slotShadeStyle,
      background: `linear-gradient(180deg, transparent 38%, ${palette.outline}CC 100%)`,
    },
    rankStyle: {
      ...template.rankStyle,
      WebkitTextStroke: `1px ${palette.outline}`,
    },
    slots: template.slots.map((slot, index) => ({
      ...slot,
      rank: { ...slot.rank, color: index === 0 ? palette.winner : palette.text },
      nameZone: {
        ...slot.nameZone,
        background: index === 0 ? palette.winner : palette.accent,
        color: palette.outline,
      },
    })),
    metadata: template.metadata.map((field) => ({
      ...field,
      color: field.id === 'participantCount' ? palette.accent : palette.text,
    })),
  }
}

export const recolorGeneratedTemplate = (
  template,
  nextPalette,
  locks = template.paletteLocks || [],
) => {
  const palette = normalizePalette(nextPalette)
  if (!template.visualGrammar || template.generatorVersion < 4) {
    return recolorLegacyTemplate(template, palette, locks)
  }
  const recolored = compileGeneratedTemplate({
    brief: template.generationBrief,
    seed: template.seed,
    visualGrammar: template.visualGrammar,
    paletteOverride: palette,
    paletteLocks: locks,
    id: template.id,
    name: template.name,
  })
  const analysis = analyzeGeneratedTemplate(recolored, template.generationBrief)
  return {
    ...enrichWithAnalysis(recolored, analysis),
    originalPalette: template.originalPalette || template.palette,
  }
}

const familyDescriptions = {
  manga: 'Trames, encrage et cadrages de splash page.',
  cyber: 'Lumières néon, interfaces et géométries techniques.',
  arcade: 'Pixels, CRT et énergie de salle d’arcade.',
  fantasy: 'Symboles, matières et cadres inspirés de l’heroic fantasy.',
  editorial: 'Composition magazine, serif et espace négatif.',
  esport: 'Impact, vitesse et hiérarchie de compétition.',
  street: 'Graffiti, stickers et textures brutes.',
  y2k: 'Volumes pop, bulles et couleurs numériques.',
  underground: 'Grain sombre, typographie condensée et codes alternatifs.',
  premium: 'Minimalisme, finesse et rythme éditorial.',
  scifi: 'Grilles orbitales, circuits et signalétique futuriste.',
  brutalist: 'Blocs francs, contrastes radicaux et titre massif.',
  retro: 'Impression vintage, papier et composition d’époque.',
}

const layoutGroups = {
  podium: 'hero',
  'hero-left': 'hero',
  'hero-right': 'hero',
  'hero-top': 'hero',
  'hero-bottom': 'hero',
  'corner-hero': 'hero',
  'comic-splash': 'hero',
  diagonal: 'directional',
  'reverse-diagonal': 'directional',
  cascade: 'directional',
  staircase: 'directional',
  'swiss-grid': 'structured',
  split: 'structured',
  cross: 'structured',
  mosaic: 'structured',
  brutalist: 'structured',
  editorial: 'structured',
  magazine: 'structured',
  broadcast: 'structured',
  'horizontal-strips': 'strips',
  'vertical-strips': 'strips',
  radial: 'spatial',
  'center-void': 'spatial',
  poster: 'spatial',
  'manga-panels': 'spatial',
}

const layoutDescriptions = {
  podium: 'Le Top 1 domine un podium central.',
  'hero-left': 'Un champion monumental ouvre la composition.',
  'hero-right': 'Le champion ferme la composition sur la droite.',
  'hero-top': 'Une grande scène supérieure surplombe le classement.',
  'hero-bottom': 'Le vainqueur occupe une base spectaculaire.',
  diagonal: 'Le regard traverse le visuel en diagonale.',
  'reverse-diagonal': 'Une diagonale inversée change le sens de lecture.',
  radial: 'Les huit joueurs orbitent autour d’un centre visuel.',
  'manga-panels': 'Un rythme de page manga asymétrique.',
  'comic-splash': 'Un grand splash et une rangée de cases secondaires.',
  editorial: 'Une grille magazine volontairement asymétrique.',
  magazine: 'Des colonnes et respirations de couverture.',
  'swiss-grid': 'Une grille précise, lisible et hiérarchisée.',
  brutalist: 'Des blocs francs aux proportions contrastées.',
  cascade: 'Une hiérarchie descendante en cascade.',
  staircase: 'Des niveaux successifs comme un escalier.',
  split: 'Un grand panneau opposé à une série de modules.',
  cross: 'Une composition centrée en croix.',
  'horizontal-strips': 'Huit bandes dynamiques en lecture horizontale.',
  'vertical-strips': 'Huit colonnes fortes façon affiche.',
  mosaic: 'Une mosaïque dense aux formats variés.',
  'corner-hero': 'Le vainqueur ancre un angle du visuel.',
  'center-void': 'Un vide central réserve une zone de branding.',
  poster: 'Une affiche centrale encadrée de challengers.',
  broadcast: 'Une hiérarchie pensée comme un habillage live.',
}

export const generatedFamilies = artDirections.map((direction) => ({
  id: direction.id,
  label: direction.label,
  color: direction.bases[0],
  harmony: direction.harmonies[0],
  mood: direction.moods[0],
  description: familyDescriptions[direction.id],
}))

export const generatedLayouts = [
  {
    id: 'auto',
    label: 'Laisser le générateur choisir',
    group: 'auto',
    description: 'Le layout est choisi selon la direction et le niveau de variation.',
  },
  ...layoutFamilies.map((layout) => ({
    id: layout.id,
    label: layout.label,
    group: layoutGroups[layout.id] || 'other',
    description: layoutDescriptions[layout.id] || 'Une composition Top 8 alternative.',
  })),
]

export const generatedVariations = variationLevels.map(({ id, label, description }) => ({
  id,
  label,
  description,
}))

export const generatedIntensityLabels = ['Minimal', 'Équilibré', 'Expressif', 'Extrême']
export { analyzeGeneratedTemplate, createDefaultGenerationBrief, normalizeGenerationBrief, validateGeneratedTemplate }
export { surpriseDirection }
