import { artDirections, getArtDirection } from './artDirections.js'
import { createBackgroundLayer } from './backgrounds.js'
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  EXPECTED_PLACEMENTS,
  GENERATOR_VERSION,
  SLOT_IDS,
} from './constants.js'
import { createDecorations } from './decorations.js'
import { createFrameLayer } from './frames.js'
import { clipPathFromPoints, createSlotPoints, getGeometryFamily } from './geometry.js'
import { grammarSignature, normalizeGenerationBrief, resolveVisualGrammar } from './grammar.js'
import { createMetadata } from './headers.js'
import { applyDensityAndDominance, getLayoutFamily, resolveLayoutBoxes } from './layouts.js'
import { createRankStyle, createSlotRank } from './numbers.js'
import { createSlotTexture } from './patterns.js'
import { clamp, createRandomContext, pick, round } from './random.js'
import { contrastRatio, createPaletteFromColor, normalizePalette } from '../palette.js'
import { getTypographySystem } from './typography.js'

const readableText = (background, palette) => {
  const lightRatio = contrastRatio('#FFFFFF', background)
  const darkRatio = contrastRatio('#080B12', background)
  if (lightRatio >= darkRatio) return '#FFFFFF'
  return palette.outline || '#080B12'
}

const buildPalette = (grammar, overridePalette) => {
  if (overridePalette) return normalizePalette(overridePalette)
  const recipe = grammar.paletteRecipe
  const generated = createPaletteFromColor({
    primary: recipe.base,
    harmony: recipe.harmony,
    mood: recipe.mood,
  })
  if (!recipe.custom) return generated
  return normalizePalette({ ...generated, ...recipe.custom })
}

const selectGeometry = (grammar, index) => {
  if (grammar.geometryMix === 'coherent') return getGeometryFamily(grammar.geometryFamily)
  if (grammar.geometryMix === 'creative') {
    return getGeometryFamily(index % 3 === 2 ? grammar.secondaryGeometryFamily : grammar.geometryFamily)
  }
  return getGeometryFamily(index % 2 ? grammar.secondaryGeometryFamily : grammar.geometryFamily)
}

const createNameStyle = ({ grammar, palette, index }) => {
  const angular = ['manga-panel', 'clipped-triangle', 'parallelogram', 'asymmetric'].includes(
    index % 2 ? grammar.secondaryGeometryFamily : grammar.geometryFamily,
  )
  const soft = ['capsule', 'soft-rectangle', 'organic', 'card'].includes(
    index % 2 ? grammar.secondaryGeometryFamily : grammar.geometryFamily,
  )
  return {
    clipPath: angular
      ? 'polygon(4% 8%,100% 0,96% 100%,0 91%)'
      : soft ? 'inset(0 round 999px)' : 'none',
    borderRadius: soft ? '999px' : grammar.frameFamily === 'techno' ? '2px' : undefined,
    boxShadow: grammar.frameFamily === 'offset'
      ? `3px 3px 0 ${palette.outline}`
      : grammar.frameFamily === 'glow'
        ? `0 0 7px ${palette.accent}`
        : `0 2px 0 ${palette.outline}99`,
    padding: '1px 6px 0',
    textTransform: 'uppercase',
  }
}

const createAutoPlacement = ({ width, height, nameHeight, labelPosition }) => {
  const horizontalInset = Math.max(4, width * .065)
  const verticalInset = Math.max(3, height * .045)
  const labelAllowance = nameHeight + Math.max(4, height * .025)
  const safeY = labelPosition === 'top' ? labelAllowance : verticalInset
  const safeHeight = Math.max(32, height - safeY - (labelPosition === 'bottom' ? labelAllowance : verticalInset))
  return {
    safeX: round(horizontalInset),
    safeY: round(safeY),
    safeWidth: round(Math.max(44, width - horizontalInset * 2)),
    safeHeight: round(Math.min(height - safeY, safeHeight)),
    solo: { fill: 1.01, maxCrop: 1.52, yBias: .02 },
    duoPrimary: { fill: 1.07, maxCrop: 1.48, width: .63, yBias: .02 },
    duoSecondary: { fill: .93, maxCrop: 1.43, width: .49, yBias: -.02 },
    duoOverlap: .12,
  }
}

const createSlots = ({ grammar, palette, seed }) => {
  const randoms = createRandomContext(`${seed}/slots`)
  const layout = getLayoutFamily(grammar.layoutFamily)
  const rawBoxes = resolveLayoutBoxes(layout, randoms.for('layout-variant'), grammar.variation)
  const boxes = applyDensityAndDominance(rawBoxes, {
    density: grammar.density,
    winnerDominance: grammar.winnerDominance,
  })
  const typography = getTypographySystem(grammar.typographyFamily)
  const labelPositionFor = (index) => grammar.labelPosition === 'alternating'
    ? (index % 2 ? 'top' : 'bottom')
    : grammar.labelPosition

  return boxes.map(([x, y, width, height], index) => {
    const box = { x, y, width, height }
    const geometry = selectGeometry(grammar, index)
    const points = createSlotPoints({
      family: geometry,
      box,
      index,
      random: randoms.for(`geometry-${index}`),
      symmetry: grammar.symmetry,
      intensity: grammar.intensity,
    })
    const labelPosition = labelPositionFor(index)
    const nameHeight = Math.round(clamp(height * .18, 14, index === 0 ? 24 : 21))
    const requestedWidth = clamp(grammar.labelWidth, 42, 100) / 100
    const targetWidth = width * (index === 0 ? Math.max(.58, requestedWidth - .06) : requestedWidth)
    const nameWidth = Math.round(clamp(targetWidth, Math.min(52, width - 8), width - 8))
    const nameX = Math.round(x + (width - nameWidth) / 2)
    const nameY = Math.round(labelPosition === 'top' ? y + 4 : y + height - nameHeight - 4)
    const nameBackground = index === 0
      ? palette.winner
      : index < 3 ? palette.accent : (index % 2 ? palette.primary : palette.secondary)
    const fontSize = Math.round(clamp(
      Math.min(nameHeight * .6, nameWidth / (index === 0 ? 12 : 10)),
      8,
      index === 0 ? 14 : 11,
    ))
    const slot = {
      id: SLOT_IDS[index],
      placement: EXPECTED_PLACEMENTS[index],
      x,
      y,
      width,
      height,
      zIndex: index === 0 ? 12 : index < 3 ? 10 : index === 3 ? 9 : 8,
      points,
      clipPath: clipPathFromPoints(points, box),
      texture: createSlotTexture({
        textureId: grammar.textureSystem,
        palette,
        index,
        intensity: grammar.intensity,
        textureScale: grammar.textureScale,
        hierarchy: grammar.hierarchyFamily,
      }),
      podiumTone: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : undefined,
      nameZone: {
        x: nameX,
        y: nameY,
        width: nameWidth,
        height: nameHeight,
        align: 'center',
        fontSize,
        background: nameBackground,
        color: readableText(nameBackground, palette),
        rotation: grammar.geometryMix === 'wild' ? (index % 2 ? -1.4 : 1.1) : 0,
        fontFamily: typography.labelFont,
        fontWeight: Math.max(700, typography.weight),
        fontStyle: typography.id === 'comic' ? 'italic' : 'normal',
        letterSpacing: typography.tracking,
        textShadow: 'none',
        style: createNameStyle({ grammar, palette, index }),
      },
      autoPlacement: createAutoPlacement({ width, height, nameHeight, labelPosition }),
    }
    slot.rank = createSlotRank({
      systemId: grammar.numberSystem,
      slot,
      index,
      palette,
      hierarchy: grammar.hierarchyFamily,
      random: randoms.for(`rank-${index}`),
    })
    return slot
  })
}

export const createGeometryFingerprint = (slots) => slots.flatMap((slot) => [
  Math.round(((slot.x + slot.width / 2) / CANVAS_WIDTH) * 10),
  Math.round(((slot.y + slot.height / 2) / CANVAS_HEIGHT) * 10),
  Math.round((slot.width / CANVAS_WIDTH) * 10),
  Math.round((slot.height / CANVAS_HEIGHT) * 10),
  slot.points.length,
]).join('|')

const renderFilterFor = (directionId) => {
  if (['editorial', 'premium', 'retro'].includes(directionId)) return 'saturate(.9) contrast(1.04) drop-shadow(0 2px 1px rgba(0,0,0,.25))'
  if (['cyber', 'scifi', 'arcade', 'y2k'].includes(directionId)) return 'saturate(1.14) contrast(1.08) drop-shadow(0 2px 2px rgba(0,0,0,.42))'
  return 'saturate(1.06) contrast(1.07) drop-shadow(0 2px 1px rgba(0,0,0,.35))'
}

export const compileGeneratedTemplate = ({
  brief: rawBrief,
  seed,
  visualGrammar,
  paletteOverride,
  paletteLocks = [],
  id,
  name,
}) => {
  const brief = normalizeGenerationBrief(rawBrief)
  const grammar = visualGrammar || resolveVisualGrammar({ brief, seed })
  const direction = getArtDirection(grammar.artDirection) || artDirections[0]
  const typography = getTypographySystem(grammar.typographyFamily)
  const layout = getLayoutFamily(grammar.layoutFamily)
  const palette = buildPalette(grammar, paletteOverride)
  const slots = createSlots({ grammar, palette, seed })
  const geometryFingerprint = createGeometryFingerprint(slots)
  const visualSignature = grammarSignature(grammar, geometryFingerprint)
  const randoms = createRandomContext(`${seed}/compiler`)
  const templateName = name || pick(direction.names, randoms.for('name'))
  const backgroundLayer = createBackgroundLayer({
    systemId: grammar.backgroundFamily,
    overlays: grammar.overlayFamilies,
    palette,
    intensity: grammar.intensity,
    energy: grammar.backgroundEnergy,
    headerId: grammar.headerSystem,
    seed,
  })
  const frameLayer = createFrameLayer({
    slots,
    systemId: grammar.frameFamily,
    palette,
    intensity: grammar.intensity,
  })
  const decorations = createDecorations({
    systemIds: grammar.decorationFamilies,
    palette,
    intensity: grammar.intensity,
    density: grammar.density,
    random: randoms.for('decorations'),
  })

  return {
    id: id || `generated-${seed}`,
    revision: 4,
    generated: true,
    generatorVersion: GENERATOR_VERSION,
    familyId: direction.id,
    familyName: direction.label,
    familyHue: direction.hue,
    layoutId: layout.id,
    layoutName: layout.label,
    seed,
    visualStyle: 'generated',
    name: templateName,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    generationBrief: brief,
    visualGrammar: grammar,
    visualSignature,
    signatureKey: JSON.stringify(visualSignature),
    palette,
    originalPalette: palette,
    paletteLocks,
    slotTexture: slots[0].texture,
    teamLogo: { top: 7, right: 6, width: 19, height: 20 },
    tournamentLogo: { x: 626, y: 3, width: 52, height: 52, zIndex: 24 },
    canvasStyle: { backgroundColor: palette.background },
    renderFilter: renderFilterFor(direction.id),
    slotTextureStyle: { filter: 'none' },
    slotShadeStyle: { background: `linear-gradient(180deg, transparent 36%, ${palette.outline}D6 100%)` },
    rankStyle: createRankStyle({
      systemId: grammar.numberSystem,
      palette,
      typography,
    }),
    layers: [backgroundLayer, frameLayer],
    decorations,
    metadata: createMetadata({
      headerId: grammar.headerSystem,
      palette,
      typography,
      hasSubtitle: Boolean(brief.tournament.subtitle),
      artDirectionId: direction.id,
    }),
    slots,
  }
}
