import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  EXPECTED_PLACEMENTS,
  SLOT_IDS,
} from './constants.js'
import { clamp, round } from './random.js'
import { contrastRatio } from '../palette.js'

const isFiniteNumber = (value) => Number.isFinite(Number(value))

const polygonArea = (points = []) => {
  if (points.length < 3) return 0
  let total = 0
  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index]
    const [x2, y2] = points[(index + 1) % points.length]
    total += x1 * y2 - x2 * y1
  }
  return Math.abs(total) / 2
}

const orientation = (first, second, third) =>
  (second[1] - first[1]) * (third[0] - second[0]) -
  (second[0] - first[0]) * (third[1] - second[1])

const onSegment = (first, second, point) =>
  point[0] <= Math.max(first[0], second[0]) + .01 &&
  point[0] >= Math.min(first[0], second[0]) - .01 &&
  point[1] <= Math.max(first[1], second[1]) + .01 &&
  point[1] >= Math.min(first[1], second[1]) - .01

const segmentsIntersect = (a1, a2, b1, b2) => {
  const first = orientation(a1, a2, b1)
  const second = orientation(a1, a2, b2)
  const third = orientation(b1, b2, a1)
  const fourth = orientation(b1, b2, a2)
  if ((first > 0 && second < 0 || first < 0 && second > 0) &&
    (third > 0 && fourth < 0 || third < 0 && fourth > 0)) return true
  if (Math.abs(first) < .01 && onSegment(a1, a2, b1)) return true
  if (Math.abs(second) < .01 && onSegment(a1, a2, b2)) return true
  if (Math.abs(third) < .01 && onSegment(b1, b2, a1)) return true
  if (Math.abs(fourth) < .01 && onSegment(b1, b2, a2)) return true
  return false
}

const isSimplePolygon = (points) => {
  for (let firstIndex = 0; firstIndex < points.length; firstIndex += 1) {
    const firstStart = points[firstIndex]
    const firstEnd = points[(firstIndex + 1) % points.length]
    for (let secondIndex = firstIndex + 1; secondIndex < points.length; secondIndex += 1) {
      if (Math.abs(firstIndex - secondIndex) <= 1) continue
      if (firstIndex === 0 && secondIndex === points.length - 1) continue
      const secondStart = points[secondIndex]
      const secondEnd = points[(secondIndex + 1) % points.length]
      if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) return false
    }
  }
  return true
}

const pointInPolygon = ([x, y], points = []) => {
  let inside = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const [x1, y1] = points[index]
    const [x2, y2] = points[previous]
    const crosses = ((y1 > y) !== (y2 > y)) &&
      (x < ((x2 - x1) * (y - y1)) / ((y2 - y1) || Number.EPSILON) + x1)
    if (crosses) inside = !inside
  }
  return inside
}

const rectangleCoverage = (zone, points, localOffset = { x: 0, y: 0 }) => {
  const samples = []
  for (const xRatio of [.1, .5, .9]) {
    for (const yRatio of [.1, .5, .9]) {
      samples.push([
        localOffset.x + zone.x + zone.width * xRatio,
        localOffset.y + zone.y + zone.height * yRatio,
      ])
    }
  }
  return samples.filter((point) => pointInPolygon(point, points)).length / samples.length
}

const overlapArea = (first, second) => {
  const width = Math.max(0, Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x))
  const height = Math.max(0, Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y))
  return width * height
}

const fieldWithinCanvas = (field) =>
  isFiniteNumber(field.x) && isFiniteNumber(field.y) &&
  isFiniteNumber(field.width) && isFiniteNumber(field.height) &&
  field.x >= 0 && field.y >= 0 &&
  field.x + field.width <= CANVAS_WIDTH + .5 &&
  field.y + field.height <= CANVAS_HEIGHT + .5

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const legacyTemplateIsUsable = (template) => {
  if (!template || template.width !== CANVAS_WIDTH || template.height !== CANVAS_HEIGHT) return false
  if (!Array.isArray(template.slots) || template.slots.length !== 8) return false
  const ids = new Set(template.slots.map(({ id }) => id))
  if (SLOT_IDS.some((id) => !ids.has(id))) return false
  return template.slots.every((slot) =>
    fieldWithinCanvas(slot) &&
    Array.isArray(slot.points) && slot.points.length >= 3 &&
    Boolean(slot.clipPath && slot.nameZone && slot.rank && slot.autoPlacement),
  )
}

export const analyzeGeneratedTemplate = (template, intent = template?.generationBrief) => {
  const hardErrors = []
  const warnings = []
  const metrics = {
    slotAreas: [],
    polygonAreas: [],
    safeZoneCoverage: [],
    nameZoneCoverage: [],
    overlaps: [],
    contrastRatios: [],
    hierarchyRatio: 0,
  }

  if (!template || template.width !== CANVAS_WIDTH || template.height !== CANVAS_HEIGHT) {
    hardErrors.push('Le canvas doit mesurer exactement 686 × 386 px.')
  }
  if (!Array.isArray(template?.slots) || template.slots.length !== 8) {
    hardErrors.push('Le template doit contenir exactement huit cases.')
    return { valid: false, score: 0, hardErrors, warnings, metrics }
  }
  template.slots.forEach((slot, index) => {
    if (slot.id !== SLOT_IDS[index]) hardErrors.push(`Identifiant inattendu pour la case ${index + 1}.`)
    if (slot.placement !== EXPECTED_PLACEMENTS[index]) hardErrors.push(`Placement inattendu pour la case ${slot.id}.`)
    if (!fieldWithinCanvas(slot)) hardErrors.push(`La case ${slot.id} dépasse du canvas.`)
    if (slot.width < 44 || slot.height < 44) hardErrors.push(`La case ${slot.id} est trop étroite pour rester exploitable.`)
    if (!Array.isArray(slot.points) || slot.points.length < 3) {
      hardErrors.push(`Le masque vectoriel de ${slot.id} est absent.`)
      return
    }
    if (slot.points.some(([x, y]) =>
      !isFiniteNumber(x) || !isFiniteNumber(y) ||
      x < slot.x - .5 || x > slot.x + slot.width + .5 ||
      y < slot.y - .5 || y > slot.y + slot.height + .5)) {
      hardErrors.push(`Le masque de ${slot.id} sort de sa boîte.`)
    }
    if (!isSimplePolygon(slot.points)) hardErrors.push(`Le masque de ${slot.id} s’auto-intersecte.`)
    const area = polygonArea(slot.points)
    metrics.slotAreas.push(slot.width * slot.height)
    metrics.polygonAreas.push(area)
    if (area < 3600) hardErrors.push(`La surface utile de ${slot.id} est insuffisante.`)
    if (!slot.clipPath) hardErrors.push(`Le clip-path de ${slot.id} est absent.`)

    const nameZone = slot.nameZone
    if (!nameZone || !fieldWithinCanvas(nameZone)) {
      hardErrors.push(`La zone de pseudo de ${slot.id} est invalide.`)
    } else {
      if (nameZone.width < 44 || nameZone.height < 14 || Number(nameZone.fontSize) < 8) {
        hardErrors.push(`La zone de pseudo de ${slot.id} est trop petite.`)
      }
      if (nameZone.x < slot.x || nameZone.y < slot.y ||
        nameZone.x + nameZone.width > slot.x + slot.width + .5 ||
        nameZone.y + nameZone.height > slot.y + slot.height + .5) {
        hardErrors.push(`La zone de pseudo de ${slot.id} sort de sa case.`)
      }
      const coverage = rectangleCoverage(nameZone, slot.points)
      metrics.nameZoneCoverage.push(coverage)
      if (coverage < .55) hardErrors.push(`Le pseudo de ${slot.id} est trop coupé par le masque.`)
      else if (coverage < .78) warnings.push(`Le pseudo de ${slot.id} est proche du bord.`)
      if (nameZone.background && nameZone.color) {
        metrics.contrastRatios.push(contrastRatio(nameZone.color, nameZone.background))
      }
    }

    const safe = slot.autoPlacement
    if (!safe || [safe.safeX, safe.safeY, safe.safeWidth, safe.safeHeight].some((value) => !isFiniteNumber(value))) {
      hardErrors.push(`La zone d’auto-placement de ${slot.id} est absente.`)
    } else {
      if (safe.safeX < 0 || safe.safeY < 0 || safe.safeWidth < 44 || safe.safeHeight < 32 ||
        safe.safeX + safe.safeWidth > slot.width + .5 ||
        safe.safeY + safe.safeHeight > slot.height + .5) {
        hardErrors.push(`La zone d’auto-placement de ${slot.id} est invalide.`)
      }
      const coverage = rectangleCoverage(
        { x: safe.safeX, y: safe.safeY, width: safe.safeWidth, height: safe.safeHeight },
        slot.points,
        { x: slot.x, y: slot.y },
      )
      metrics.safeZoneCoverage.push(coverage)
      if (coverage < .52) hardErrors.push(`La zone render de ${slot.id} est trop coupée.`)
      else if (coverage < .72) warnings.push(`La zone render de ${slot.id} est serrée.`)
    }

    if (!slot.rank || !isFiniteNumber(slot.rank.x) || !isFiniteNumber(slot.rank.y) ||
      !isFiniteNumber(slot.rank.size) || slot.rank.size < 8 || slot.rank.size > 80) {
      hardErrors.push(`Le numéro de ${slot.id} est invalide.`)
    } else if (!pointInPolygon([slot.rank.x, slot.rank.y], slot.points)) {
      warnings.push(`Le numéro de ${slot.id} frôle le masque.`)
    }
  })

  for (let firstIndex = 0; firstIndex < template.slots.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < template.slots.length; secondIndex += 1) {
      const overlap = overlapArea(template.slots[firstIndex], template.slots[secondIndex])
      if (overlap > 0) metrics.overlaps.push({ firstIndex, secondIndex, area: overlap })
      if (overlap > 9) hardErrors.push(`Les cases ${template.slots[firstIndex].id} et ${template.slots[secondIndex].id} se chevauchent.`)
    }
  }

  const requiredMetadata = ['eventName', 'date', 'participantCount']
  for (const id of requiredMetadata) {
    const field = template.metadata?.find((candidate) => candidate.id === id)
    if (!field || !fieldWithinCanvas(field)) hardErrors.push(`La zone ${id} du bandeau est absente ou hors canvas.`)
    if (field && (Number(field.fontSize) < (id === 'eventName' ? 16 : 8))) {
      hardErrors.push(`La zone ${id} n’est pas assez lisible.`)
    }
  }
  if (!Array.isArray(template.layers) || !template.layers.some((layer) => layer.zIndex < 20 && layer.src)) {
    hardErrors.push('Le fond exportable est absent.')
  }
  if (!template.layers?.some((layer) => layer.zIndex >= 20 && layer.src)) {
    hardErrors.push('Le calque de cadres exportable est absent.')
  }

  const otherAreas = metrics.polygonAreas.slice(1)
  const otherMedian = median(otherAreas) || 1
  const rankMedian = median(template.slots.slice(1).map((slot) => Number(slot.rank?.size) || 0)) || 1
  const areaRatio = (metrics.polygonAreas[0] || 0) / otherMedian
  const rankRatio = (Number(template.slots[0].rank?.size) || 0) / rankMedian
  metrics.hierarchyRatio = round(Math.max(areaRatio, rankRatio), 3)
  if (areaRatio < 1.12 && rankRatio < 1.2 && template.slots[0].rank?.color === template.slots[1].rank?.color) {
    hardErrors.push('Le Top 1 ne se distingue pas assez du reste du classement.')
  }

  const average = (values, fallback = 0) => values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : fallback
  const areaQuality = average(metrics.polygonAreas.map((area, index) =>
    clamp(area / Math.max(3600, metrics.slotAreas[index] * .72), 0, 1)), 0)
  const safeQuality = average(metrics.safeZoneCoverage.map((value) => clamp((value - .45) / .45, 0, 1)), 0)
  const geometryScore = 30 * (areaQuality * .48 + safeQuality * .52)
  const nameQuality = average(metrics.nameZoneCoverage.map((value) => clamp((value - .5) / .5, 0, 1)), 0)
  const metadataQuality = requiredMetadata.filter((id) =>
    template.metadata?.some((field) => field.id === id && fieldWithinCanvas(field))).length / requiredMetadata.length
  const textScore = 20 * (nameQuality * .7 + metadataQuality * .3)
  const hierarchyScore = 15 * clamp((Math.max(areaRatio, rankRatio) - 1) / .55, .45, 1)
  const overlapPenalty = metrics.overlaps.reduce((sum, overlap) => sum + overlap.area, 0)
  const collisionScore = 15 * clamp(1 - overlapPenalty / 120, 0, 1)
  const contrastQuality = average(metrics.contrastRatios.map((ratio) => clamp(ratio / 4.5, 0, 1)), .8)
  const contrastScore = 10 * contrastQuality
  const requestedDominance = clamp(Number(intent?.composition?.winnerDominance ?? 70), 0, 100)
  const observedDominance = clamp((Math.max(areaRatio, rankRatio) - 1) * 100, 0, 100)
  const intentScore = 10 * clamp(1 - Math.abs(observedDominance - requestedDominance * .55) / 100, .45, 1)
  const score = Math.round(geometryScore + textScore + hierarchyScore + collisionScore + contrastScore + intentScore)
  if (metrics.contrastRatios.some((ratio) => ratio < 4.5)) warnings.push('Certaines zones de texte ont un contraste inférieur à 4,5:1.')
  if (score < 78) warnings.push(`Score de composition insuffisant (${score}/100).`)

  return {
    valid: hardErrors.length === 0 && score >= 78,
    score,
    hardErrors,
    warnings,
    metrics: {
      ...metrics,
      geometryScore: round(geometryScore),
      textScore: round(textScore),
      hierarchyScore: round(hierarchyScore),
      collisionScore: round(collisionScore),
      contrastScore: round(contrastScore),
      intentScore: round(intentScore),
      areaRatio: round(areaRatio, 3),
      rankRatio: round(rankRatio, 3),
    },
  }
}

export const validateGeneratedTemplate = (template) => {
  if (!template?.generated) return false
  if (!template.generatorVersion || template.generatorVersion < 4) return legacyTemplateIsUsable(template)
  return analyzeGeneratedTemplate(template).valid
}

export const validateLegacyGeneratedTemplate = legacyTemplateIsUsable
