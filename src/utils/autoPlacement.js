import { getImportedRenderTransforms } from '../data/renderPresets.js'
import { analyzeRender } from './imageAnalysis.js'

const RENDER_WIDTH_RATIO = 0.92
const RENDER_TOP_RATIO = 0.48
const SCALE_MIN = 0.25
const SCALE_MAX = 2.5
const SCALE_STEP = 0.05
const GRID_COLUMNS = 22
const GRID_ROWS = 14

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value))

const round = (value, precision = 2) => {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

const roundScale = (value) =>
  round(clamp(Math.round(value / SCALE_STEP) * SCALE_STEP, SCALE_MIN, SCALE_MAX))

const pointInPolygon = ({ x, y }, polygon) => {
  let inside = false
  for (
    let current = 0, previous = polygon.length - 1;
    current < polygon.length;
    previous = current, current += 1
  ) {
    const pointA = polygon[current]
    const pointB = polygon[previous]
    const intersects =
      pointA.y > y !== pointB.y > y &&
      x <
        ((pointB.x - pointA.x) * (y - pointA.y)) /
          (pointB.y - pointA.y) +
          pointA.x
    if (intersects) inside = !inside
  }
  return inside
}

const pointInRect = (point, rect) =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.width &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.height

const getSlotPolygon = (slot) =>
  slot.points.map(([x, y]) => ({ x: x - slot.x, y: y - slot.y }))

const getAutoPlacementConfig = (slot) =>
  slot.autoPlacement || {
    safeX: slot.width * 0.06,
    safeY: slot.height * 0.06,
    safeWidth: slot.width * 0.88,
    safeHeight: slot.height * 0.78,
    solo: { fill: 1, maxCrop: 1.55, yBias: 0 },
    duoPrimary: { fill: 1.06, maxCrop: 1.5, width: 0.62, yBias: 0.02 },
    duoSecondary: { fill: 0.92, maxCrop: 1.45, width: 0.5, yBias: -0.02 },
    duoOverlap: 0.12,
  }

const getSafeZone = (config) => ({
  x: config.safeX,
  y: config.safeY,
  width: config.safeWidth,
  height: config.safeHeight,
})

const getProtectedZones = (slot, template, extraZones = []) => {
  const zones = []
  if (slot.nameZone) {
    zones.push({
      type: 'rect',
      x: slot.nameZone.x - slot.x,
      y: slot.nameZone.y - slot.y,
      width: slot.nameZone.width,
      height: slot.nameZone.height,
      weight: 1.3,
    })
  }
  if (slot.rank && !extraZones.some((zone) => zone.kind === 'rank')) {
    zones.push({
      type: 'circle',
      kind: 'rank',
      x: slot.rank.x - slot.x,
      y: slot.rank.y - slot.y,
      radius: slot.rank.size * 0.58,
      weight: 1,
    })
  }
  if (template.teamLogo) {
    const width = (template.teamLogo.width / 100) * slot.width
    const height = (template.teamLogo.height / 100) * slot.height
    zones.push({
      type: 'rect',
      x:
        slot.width -
        (template.teamLogo.right / 100) * slot.width -
        width,
      y: (template.teamLogo.top / 100) * slot.height,
      width,
      height,
      weight: 0.75,
    })
  }
  return [...zones, ...extraZones]
}

const getProtectedWeight = (point, zones) =>
  zones.reduce((weight, zone) => {
    if (zone.type === 'circle') {
      return Math.hypot(point.x - zone.x, point.y - zone.y) <= zone.radius
        ? Math.max(weight, zone.weight || 1)
        : weight
    }
    return pointInRect(point, zone)
      ? Math.max(weight, zone.weight || 1)
      : weight
  }, 0)

const getImageMetrics = (analysis, slot) => {
  const width = slot.width * RENDER_WIDTH_RATIO
  return { width, height: width / analysis.aspectRatio }
}

const projectPoint = (point, analysis, candidate, slot) => {
  const image = getImageMetrics(analysis, slot)
  const centerX = slot.width * 0.5 + (candidate.x / 100) * image.width
  const centerY =
    slot.height * RENDER_TOP_RATIO + (candidate.y / 100) * image.height
  const normalizedX = candidate.flipped ? 1 - point.x : point.x

  return {
    x: centerX + (normalizedX - 0.5) * image.width * candidate.scale,
    y: centerY + (point.y - 0.5) * image.height * candidate.scale,
  }
}

const projectBounds = (
  analysis,
  candidate,
  slot,
  sourceBounds = analysis.bounds,
) => {
  const corners = [
    { x: sourceBounds.left, y: sourceBounds.top },
    { x: sourceBounds.right, y: sourceBounds.top },
    { x: sourceBounds.left, y: sourceBounds.bottom },
    { x: sourceBounds.right, y: sourceBounds.bottom },
  ].map((point) => projectPoint(point, analysis, candidate, slot))
  const xs = corners.map(({ x }) => x)
  const ys = corners.map(({ y }) => y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  }
}

const calculateFitScale = (analysis, slot, zone, fill, maxCrop) => {
  const image = getImageMetrics(analysis, slot)
  const focusBounds = analysis.focusBounds || analysis.bounds
  const fullFit = Math.min(
    zone.width / (image.width * analysis.bounds.width),
    zone.height / (image.height * analysis.bounds.height),
  )
  const focusFit = Math.min(
    zone.width / (image.width * focusBounds.width),
    zone.height / (image.height * focusBounds.height),
  )
  return roundScale(
    Math.min(focusFit * fill, fullFit * maxCrop),
  )
}

const centerSubjectInZone = ({
  analysis,
  slot,
  zone,
  scale,
  flipped,
  xBias = 0,
  yBias = 0,
}) => {
  const image = getImageMetrics(analysis, slot)
  const focusBounds = analysis.focusBounds || analysis.bounds
  const sourceCenterX = (focusBounds.left + focusBounds.right) / 2
  const sourceCenterY = (focusBounds.top + focusBounds.bottom) / 2
  const normalizedCenterX = flipped ? 1 - sourceCenterX : sourceCenterX
  const targetX = zone.x + zone.width * (0.5 + xBias)
  const targetY = zone.y + zone.height * (0.5 + yBias)
  const imageCenterX =
    targetX - (normalizedCenterX - 0.5) * image.width * scale
  const imageCenterY =
    targetY - (sourceCenterY - 0.5) * image.height * scale

  return {
    x: round(((imageCenterX - slot.width * 0.5) / image.width) * 100, 1),
    y: round(
      ((imageCenterY - slot.height * RENDER_TOP_RATIO) / image.height) * 100,
      1,
    ),
    scale,
    flipped,
  }
}

const createFitCandidate = ({
  analysis,
  slot,
  zone,
  fill,
  maxCrop,
  scaleFactor,
  flipped,
  xBias,
  yBias,
}) => {
  const scale = roundScale(
    calculateFitScale(analysis, slot, zone, fill, maxCrop) * scaleFactor,
  )
  return centerSubjectInZone({
    analysis,
    slot,
    zone,
    scale,
    flipped,
    xBias,
    yBias,
  })
}

const getGridKey = (point, slot) => {
  const column = clamp(
    Math.floor((point.x / slot.width) * GRID_COLUMNS),
    0,
    GRID_COLUMNS - 1,
  )
  const row = clamp(
    Math.floor((point.y / slot.height) * GRID_ROWS),
    0,
    GRID_ROWS - 1,
  )
  return `${column}:${row}`
}

const getMaskCellCount = (slot, polygon) => {
  let count = 0
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const point = {
        x: ((column + 0.5) / GRID_COLUMNS) * slot.width,
        y: ((row + 0.5) / GRID_ROWS) * slot.height,
      }
      if (pointInPolygon(point, polygon)) count += 1
    }
  }
  return Math.max(1, count)
}

const evaluateRender = ({
  analysis,
  candidate,
  slot,
  polygon,
  safeZone,
  targetZone,
  protectedZones,
}) => {
  const headLimit =
    analysis.bounds.top + analysis.bounds.height * 0.34
  let maskVisible = 0
  let safeVisible = 0
  let zoneVisible = 0
  let headTotal = 0
  let headMaskVisible = 0
  let headSafeVisible = 0
  let protectedWeight = 0
  let protectedHeadWeight = 0
  let headX = 0
  const occupiedCells = new Set()
  const headCells = new Set()

  analysis.points.forEach((point) => {
    const isHead = point.y <= headLimit
    if (isHead) headTotal += 1
    const projected = projectPoint(point, analysis, candidate, slot)
    const insideMask = pointInPolygon(projected, polygon)
    const insideSafe = pointInRect(projected, safeZone)
    if (insideSafe) safeVisible += 1
    if (pointInRect(projected, targetZone)) zoneVisible += 1
    if (!insideMask) return

    maskVisible += 1
    const gridKey = getGridKey(projected, slot)
    occupiedCells.add(gridKey)
    const zoneWeight = getProtectedWeight(projected, protectedZones)
    protectedWeight += zoneWeight
    if (isHead) {
      headMaskVisible += 1
      headX += projected.x
      headCells.add(gridKey)
      if (insideSafe) headSafeVisible += 1
      protectedHeadWeight += zoneWeight
    }
  })

  const total = Math.max(1, analysis.points.length)
  const bounds = projectBounds(analysis, candidate, slot)
  const focusBounds = projectBounds(
    analysis,
    candidate,
    slot,
    analysis.focusBounds || analysis.bounds,
  )
  const targetCenterX = targetZone.x + targetZone.width / 2
  const targetCenterY = targetZone.y + targetZone.height / 2
  const centerDistance = Math.hypot(
    (focusBounds.centerX - targetCenterX) / targetZone.width,
    (focusBounds.centerY - targetCenterY) / targetZone.height,
  )

  return {
    maskVisibility: maskVisible / total,
    safeVisibility: safeVisible / total,
    zoneVisibility: zoneVisible / total,
    headMaskVisibility: headMaskVisible / Math.max(1, headTotal),
    headSafeVisibility: headSafeVisible / Math.max(1, headTotal),
    protectedRatio: protectedWeight / Math.max(1, maskVisible),
    protectedHeadRatio:
      protectedHeadWeight / Math.max(1, headMaskVisible),
    fill: Math.max(
      focusBounds.width / targetZone.width,
      focusBounds.height / targetZone.height,
    ),
    bounds,
    focusBounds,
    centerDistance,
    occupiedCells,
    headCells,
    headX: headMaskVisible ? headX / headMaskVisible : slot.width / 2,
  }
}

const qualityAround = (value, target, tolerance) =>
  1 - Math.min(1, Math.abs(value - target) / tolerance)

const scoreSolo = (evaluation, targetFill, maskCellCount) => {
  const occupancy = evaluation.occupiedCells.size / maskCellCount
  return (
    evaluation.headMaskVisibility * 210 +
    evaluation.headSafeVisibility * 145 +
    evaluation.maskVisibility * 90 +
    evaluation.safeVisibility * 58 +
    qualityAround(evaluation.fill, targetFill, 0.28) * 120 +
    Math.min(occupancy, 0.58) * 155 -
    Math.max(0, 0.72 - evaluation.safeVisibility) * 360 -
    Math.max(0, 0.9 - evaluation.headMaskVisibility) * 520 -
    Math.max(0, 0.78 - evaluation.headSafeVisibility) * 300 -
    Math.max(0, 0.68 - evaluation.fill) * 330 -
    Math.max(0, evaluation.fill - 1.2) * 240 -
    evaluation.centerDistance * 54 -
    evaluation.protectedRatio * 55 -
    evaluation.protectedHeadRatio * 190
  )
}

const getIntersectionSize = (setA, setB) => {
  let count = 0
  setA.forEach((value) => {
    if (setB.has(value)) count += 1
  })
  return count
}

const scoreDuo = ({ primary, secondary, maskCellCount, slot }) => {
  const overlap = getIntersectionSize(
    primary.occupiedCells,
    secondary.occupiedCells,
  )
  const smallerSilhouette = Math.max(
    1,
    Math.min(primary.occupiedCells.size, secondary.occupiedCells.size),
  )
  const overlapRatio = overlap / smallerSilhouette
  const headOverlap = getIntersectionSize(primary.headCells, secondary.headCells)
  const smallerHead = Math.max(
    1,
    Math.min(primary.headCells.size, secondary.headCells.size),
  )
  const headOverlapRatio = headOverlap / smallerHead
  const union = new Set([
    ...primary.occupiedCells,
    ...secondary.occupiedCells,
  ])
  const occupancy = union.size / maskCellCount
  const primaryArea = primary.focusBounds.width * primary.focusBounds.height
  const secondaryArea = Math.max(
    1,
    secondary.focusBounds.width * secondary.focusBounds.height,
  )
  const dominance = primaryArea / secondaryArea
  const headSeparation = Math.abs(primary.headX - secondary.headX) / slot.width
  const overlapQuality = qualityAround(overlapRatio, 0.24, 0.27)

  return (
    primary.headMaskVisibility * 150 +
    secondary.headMaskVisibility * 145 +
    primary.headSafeVisibility * 90 +
    secondary.headSafeVisibility * 88 +
    primary.maskVisibility * 52 +
    secondary.maskVisibility * 50 +
    primary.safeVisibility * 38 +
    secondary.safeVisibility * 38 +
    primary.zoneVisibility * 24 +
    secondary.zoneVisibility * 22 +
    Math.min(occupancy, 0.72) * 165 +
    overlapQuality * 48 +
    Math.min(headSeparation, 0.42) * 72 +
    qualityAround(dominance, 1.28, 0.7) * 45 -
    Math.max(0, 0.67 - primary.safeVisibility) * 285 -
    Math.max(0, 0.64 - secondary.safeVisibility) * 310 -
    Math.max(0, 0.88 - primary.headMaskVisibility) * 440 -
    Math.max(0, 0.86 - secondary.headMaskVisibility) * 450 -
    Math.max(0, overlapRatio - 0.58) * 280 -
    headOverlapRatio * 190 -
    primary.centerDistance * 28 -
    secondary.centerDistance * 28 -
    primary.protectedHeadRatio * 150 -
    secondary.protectedHeadRatio * 150 -
    primary.protectedRatio * 34 -
    secondary.protectedRatio * 34
  )
}

const createSoloCandidates = ({ analysis, slot, safeZone, config }) => {
  const candidates = []
  const offsets = [
    [0, 0],
    [0, -0.05],
    [-0.07, 0],
    [0.07, 0],
    [-0.055, -0.045],
    [0.055, -0.045],
    [0, 0.045],
  ]
  ;[0.96, 1, 1.06].forEach((scaleFactor) => {
    offsets.forEach(([xBias, yBias]) => {
      ;[false, true].forEach((flipped) => {
        candidates.push(
          createFitCandidate({
            analysis,
            slot,
            zone: safeZone,
            fill: config.solo.fill,
            maxCrop: config.solo.maxCrop,
            scaleFactor,
            flipped,
            xBias,
            yBias: yBias + config.solo.yBias,
          }),
        )
      })
    })
  })
  return candidates
}

const getDuoZones = (safeZone, config, primaryOnRight) => {
  const primaryWidth = safeZone.width * config.duoPrimary.width
  const secondaryWidth = safeZone.width * config.duoSecondary.width
  const overlap = safeZone.width * config.duoOverlap
  const primary = {
    x: primaryOnRight
      ? safeZone.x + secondaryWidth - overlap
      : safeZone.x,
    y: safeZone.y,
    width: primaryWidth,
    height: safeZone.height,
  }
  const secondary = {
    x: primaryOnRight
      ? safeZone.x
      : safeZone.x + primaryWidth - overlap,
    y: safeZone.y,
    width: secondaryWidth,
    height: safeZone.height,
  }
  return { primary, secondary }
}

const createDuoCandidates = ({
  primaryAnalysis,
  secondaryAnalysis,
  slot,
  safeZone,
  config,
}) => {
  const candidates = []
  const scalePairs = [[1, 1], [1.06, 0.96], [0.96, 1.02]]
  const offsetPairs = [
    [[0, 0], [0, 0]],
    [[0.035, 0.025], [-0.035, -0.025]],
    [[-0.03, 0.04], [0.045, -0.04]],
  ]

  ;[false, true].forEach((primaryOnRight) => {
    const zones = getDuoZones(safeZone, config, primaryOnRight)
    const direction = primaryOnRight ? 1 : -1
    scalePairs.forEach(([primaryScaleFactor, secondaryScaleFactor]) => {
      offsetPairs.forEach(([[primaryX, primaryY], [secondaryX, secondaryY]]) => {
        ;[[false, false], [true, true], [false, true], [true, false]].forEach(
          ([primaryFlipped, secondaryFlipped]) => {
            const primary = createFitCandidate({
              analysis: primaryAnalysis,
              slot,
              zone: zones.primary,
              fill: config.duoPrimary.fill,
              maxCrop: config.duoPrimary.maxCrop,
              scaleFactor: primaryScaleFactor,
              flipped: primaryFlipped,
              xBias: primaryX * direction,
              yBias: primaryY + config.duoPrimary.yBias,
            })
            const secondary = createFitCandidate({
              analysis: secondaryAnalysis,
              slot,
              zone: zones.secondary,
              fill: config.duoSecondary.fill,
              maxCrop: config.duoSecondary.maxCrop,
              scaleFactor: secondaryScaleFactor,
              flipped: secondaryFlipped,
              xBias: secondaryX * direction,
              yBias: secondaryY + config.duoSecondary.yBias,
            })
            candidates.push({ primary, secondary, zones })
          },
        )
      })
    })
  })
  return candidates
}

const createDebugData = ({ safeZone, primary, secondary, score }) => ({
  safeZone,
  primaryBounds: primary?.bounds,
  secondaryBounds: secondary?.bounds,
  primaryCenter: primary
    ? { x: primary.bounds.centerX, y: primary.bounds.centerY }
    : null,
  secondaryCenter: secondary
    ? { x: secondary.bounds.centerX, y: secondary.bounds.centerY }
    : null,
  score: round(score, 1),
})

const toStateTransforms = (primary, secondary, debug) => ({
  x: round(primary.x, 1),
  y: round(primary.y, 1),
  scale: roundScale(primary.scale),
  flipped: primary.flipped,
  ...(secondary
    ? {
        secondaryX: round(secondary.x, 1),
        secondaryY: round(secondary.y, 1),
        secondaryScale: roundScale(secondary.scale),
        secondaryFlipped: secondary.flipped,
      }
    : {}),
  autoPlacementDebug: debug,
})

export const calculateAutoPlacement = async ({
  slot,
  template,
  primaryRender,
  secondaryRender = '',
  primaryCharacter = '',
  secondaryCharacter = '',
  protectedZones = [],
}) => {
  const fallbackPreset = getImportedRenderTransforms(
    primaryCharacter,
    secondaryCharacter,
  )
  const fallback = toStateTransforms(
    fallbackPreset,
    secondaryRender
      ? {
          x: fallbackPreset.secondaryX,
          y: fallbackPreset.secondaryY,
          scale: fallbackPreset.secondaryScale,
          flipped: fallbackPreset.secondaryFlipped,
        }
      : null,
    null,
  )
  if (!slot || !template || !primaryRender) return fallback

  try {
    const [primaryAnalysis, secondaryAnalysis] = await Promise.all([
      analyzeRender(primaryRender),
      analyzeRender(secondaryRender),
    ])
    if (!primaryAnalysis) return fallback

    const config = getAutoPlacementConfig(slot)
    const safeZone = getSafeZone(config)
    const polygon = getSlotPolygon(slot)
    const zones = getProtectedZones(slot, template, protectedZones)
    const maskCellCount = getMaskCellCount(slot, polygon)

    if (!secondaryAnalysis) {
      let best = null
      createSoloCandidates({
        analysis: primaryAnalysis,
        slot,
        safeZone,
        config,
      }).forEach((candidate) => {
        const evaluation = evaluateRender({
          analysis: primaryAnalysis,
          candidate,
          slot,
          polygon,
          safeZone,
          targetZone: safeZone,
          protectedZones: zones,
        })
        const score = scoreSolo(evaluation, config.solo.fill, maskCellCount)
        if (!best || score > best.score) best = { candidate, evaluation, score }
      })
      return best
        ? toStateTransforms(
            best.candidate,
            null,
            createDebugData({
              safeZone,
              primary: best.evaluation,
              score: best.score,
            }),
          )
        : fallback
    }

    let best = null
    createDuoCandidates({
      primaryAnalysis,
      secondaryAnalysis,
      slot,
      safeZone,
      config,
    }).forEach((candidate) => {
      const primary = evaluateRender({
        analysis: primaryAnalysis,
        candidate: candidate.primary,
        slot,
        polygon,
        safeZone,
        targetZone: candidate.zones.primary,
        protectedZones: zones,
      })
      const secondary = evaluateRender({
        analysis: secondaryAnalysis,
        candidate: candidate.secondary,
        slot,
        polygon,
        safeZone,
        targetZone: candidate.zones.secondary,
        protectedZones: zones,
      })
      const score = scoreDuo({
        primary,
        secondary,
        maskCellCount,
        slot,
      })
      if (!best || score > best.score) {
        best = { candidate, primary, secondary, score }
      }
    })

    return best
      ? toStateTransforms(
          best.candidate.primary,
          best.candidate.secondary,
          createDebugData({
            safeZone,
            primary: best.primary,
            secondary: best.secondary,
            score: best.score,
          }),
        )
      : fallback
  } catch {
    return fallback
  }
}
