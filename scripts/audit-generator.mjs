import assert from 'node:assert/strict'
import {
  analyzeGeneratedTemplate,
  createDefaultGenerationBrief,
  generateTemplate,
  getTemplateSignature,
  templateSignatureDistance,
  validateGeneratedTemplate,
} from '../src/templates/generated/generator.js'

const CANVAS_WIDTH = 686
const CANVAS_HEIGHT = 386
const EXPECTED_IDS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth-a',
  'fifth-b',
  'seventh-a',
  'seventh-b',
]
const EXPECTED_PLACEMENTS = [1, 2, 3, 4, 5, 5, 7, 7]
const SAMPLES_PER_BATCH = 36

const batchDefinitions = [
  {
    id: 'surprise-creative',
    label: 'Surprise · créatif',
    family: 'surprise',
    variation: 'creative',
    mode: 'surprise',
    intensity: 62,
    density: 52,
    minimums: { signatures: 28, layouts: 10, geometries: 7, distance: 0.34 },
  },
  {
    id: 'surprise-wild',
    label: 'Surprise · sauvage',
    family: 'surprise',
    variation: 'wild',
    mode: 'surprise',
    intensity: 84,
    density: 68,
    minimums: { signatures: 32, layouts: 14, geometries: 10, distance: 0.4 },
  },
  {
    id: 'manga-creative',
    label: 'Manga · créatif',
    family: 'manga',
    variation: 'creative',
    mode: 'guided',
    intensity: 72,
    density: 58,
    minimums: { signatures: 24, layouts: 6, geometries: 4, distance: 0.28 },
  },
  {
    id: 'editorial-coherent',
    label: 'Editorial · cohérent',
    family: 'editorial',
    variation: 'coherent',
    mode: 'guided',
    intensity: 42,
    density: 38,
    minimums: { signatures: 18, layouts: 4, geometries: 3, distance: 0.2 },
  },
]

const failures = []

const addFailure = (message) => {
  failures.push(message)
}

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  )
}

const signatureKey = (signature) => JSON.stringify(canonicalize(signature))

const clone = (value) => structuredClone(value)

const createBrief = (definition) => {
  const brief = createDefaultGenerationBrief(`Audit ${definition.label}`)
  return {
    ...brief,
    generation: {
      ...(brief.generation || {}),
      mode: definition.mode,
      variation: definition.variation,
    },
    artDirection: {
      ...brief.artDirection,
      family: definition.family,
      intensity: definition.intensity,
    },
    composition: {
      ...brief.composition,
      layoutFamily: 'auto',
      density: definition.density,
      winnerDominance: definition.family === 'editorial' ? 62 : 76,
      symmetry: definition.variation === 'wild' ? 24 : 48,
    },
    colors: {
      ...brief.colors,
      mode: 'auto',
    },
  }
}

const finite = (value) => Number.isFinite(Number(value))

const verifyTemplateContract = (template, label) => {
  assert.ok(template && typeof template === 'object', `${label}: sortie absente`)
  assert.equal(template.width, CANVAS_WIDTH, `${label}: largeur incorrecte`)
  assert.equal(template.height, CANVAS_HEIGHT, `${label}: hauteur incorrecte`)
  assert.equal(template.generated, true, `${label}: generated doit valoir true`)
  assert.ok(typeof template.id === 'string' && template.id.startsWith('generated-'), `${label}: id généré invalide`)
  assert.ok(typeof template.seed === 'string' && template.seed.length > 0, `${label}: seed résolue absente`)
  assert.ok(template.generationBrief && typeof template.generationBrief === 'object', `${label}: generationBrief absent`)
  assert.ok(Array.isArray(template.layers) && template.layers.length > 0, `${label}: layers absents`)
  assert.ok(Array.isArray(template.decorations), `${label}: decorations doit être un tableau`)
  assert.ok(Array.isArray(template.metadata) && template.metadata.length > 0, `${label}: metadata absentes`)
  assert.ok(template.palette && typeof template.palette === 'object', `${label}: palette absente`)
  assert.ok(Array.isArray(template.slots), `${label}: slots doit être un tableau`)
  assert.equal(template.slots.length, 8, `${label}: le template doit contenir huit slots`)
  assert.deepEqual(template.slots.map(({ id }) => id), EXPECTED_IDS, `${label}: IDs de slots incompatibles`)
  assert.deepEqual(template.slots.map(({ placement }) => placement), EXPECTED_PLACEMENTS, `${label}: placements incompatibles`)

  template.slots.forEach((slot, index) => {
    const slotLabel = `${label}/${slot.id || index}`
    for (const key of ['x', 'y', 'width', 'height', 'zIndex']) {
      assert.ok(finite(slot[key]), `${slotLabel}: ${key} non numérique`)
    }
    assert.ok(slot.width > 0 && slot.height > 0, `${slotLabel}: dimensions non positives`)
    assert.ok(slot.x >= 0 && slot.y >= 0, `${slotLabel}: origine hors canvas`)
    assert.ok(slot.x + slot.width <= CANVAS_WIDTH + 0.01, `${slotLabel}: dépasse la largeur du canvas`)
    assert.ok(slot.y + slot.height <= CANVAS_HEIGHT + 0.01, `${slotLabel}: dépasse la hauteur du canvas`)
    assert.ok(Array.isArray(slot.points) && slot.points.length >= 3, `${slotLabel}: polygone absent`)
    assert.ok(slot.points.every((point) => Array.isArray(point) && point.length === 2 && point.every(finite)), `${slotLabel}: polygone invalide`)
    assert.ok(typeof slot.clipPath === 'string' && slot.clipPath.startsWith('polygon('), `${slotLabel}: clipPath invalide`)
    assert.ok(slot.nameZone && ['x', 'y', 'width', 'height', 'fontSize'].every((key) => finite(slot.nameZone[key])), `${slotLabel}: nameZone invalide`)
    assert.ok(slot.rank && ['x', 'y', 'size'].every((key) => finite(slot.rank[key])), `${slotLabel}: rank invalide`)
    assert.ok(slot.autoPlacement && ['safeX', 'safeY', 'safeWidth', 'safeHeight'].every((key) => finite(slot.autoPlacement[key])), `${slotLabel}: autoPlacement invalide`)
  })

  assert.equal(validateGeneratedTemplate(template), true, `${label}: rejeté par validateGeneratedTemplate`)
}

const getSignatureField = (signature, template, candidates) => {
  for (const key of candidates) {
    if (signature?.[key] !== undefined && signature[key] !== '') return signature[key]
    if (template?.visualGrammar?.[key] !== undefined && template.visualGrammar[key] !== '') return template.visualGrammar[key]
    if (template?.[key] !== undefined && template[key] !== '') return template[key]
  }
  return undefined
}

const percentile = (values, ratio) => {
  if (!values.length) return 0
  const sorted = [...values].sort((first, second) => first - second)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))]
}

const round = (value, precision = 2) => {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

const inspectDistances = (signatures, label) => {
  const distances = []
  for (let firstIndex = 0; firstIndex < signatures.length; firstIndex += 1) {
    const selfDistance = templateSignatureDistance(signatures[firstIndex], signatures[firstIndex])
    assert.ok(finite(selfDistance), `${label}: distance à soi non numérique`)
    assert.ok(Math.abs(Number(selfDistance)) < 1e-9, `${label}: distance à soi différente de zéro`)

    for (let secondIndex = firstIndex + 1; secondIndex < signatures.length; secondIndex += 1) {
      const forward = Number(templateSignatureDistance(signatures[firstIndex], signatures[secondIndex]))
      const backward = Number(templateSignatureDistance(signatures[secondIndex], signatures[firstIndex]))
      assert.ok(Number.isFinite(forward) && forward >= 0, `${label}: distance invalide`)
      assert.ok(Math.abs(forward - backward) < 1e-9, `${label}: distance non symétrique`)
      distances.push(forward)
    }
  }

  const maximum = Math.max(0, ...distances)
  const normalized = maximum > 0 ? distances.map((distance) => distance / maximum) : distances
  return {
    average: normalized.length
      ? normalized.reduce((total, distance) => total + distance, 0) / normalized.length
      : 0,
    p25: percentile(normalized, 0.25),
    maximum,
  }
}

const auditBatch = (definition) => {
  const brief = createBrief(definition)
  const templates = []
  const signatures = []
  const analyses = []

  for (let index = 0; index < SAMPLES_PER_BATCH; index += 1) {
    const seed = `audit-${definition.id}-${String(index + 1).padStart(2, '0')}`
    const label = `${definition.id}/${seed}`

    try {
      const first = generateTemplate({ brief: clone(brief), seed })
      const second = generateTemplate({ brief: clone(brief), seed })
      assert.deepStrictEqual(second, first, `${label}: génération non déterministe`)
      verifyTemplateContract(first, label)

      const firstSignature = getTemplateSignature(first)
      const secondSignature = getTemplateSignature(second)
      assert.ok(firstSignature && typeof firstSignature === 'object' && !Array.isArray(firstSignature), `${label}: signature invalide`)
      assert.deepStrictEqual(secondSignature, firstSignature, `${label}: signature non déterministe`)

      const analysis = analyzeGeneratedTemplate(first, brief)
      assert.ok(analysis && typeof analysis === 'object', `${label}: analyse absente`)
      assert.equal(typeof analysis.valid, 'boolean', `${label}: analysis.valid invalide`)
      assert.ok(finite(analysis.score), `${label}: score non numérique`)
      assert.ok(Array.isArray(analysis.hardErrors), `${label}: hardErrors doit être un tableau`)
      assert.ok(Array.isArray(analysis.warnings), `${label}: warnings doit être un tableau`)
      assert.ok(analysis.metrics && typeof analysis.metrics === 'object', `${label}: metrics absentes`)
      assert.equal(analysis.valid, true, `${label}: analyse invalide (${analysis.hardErrors.join(', ')})`)
      assert.equal(analysis.hardErrors.length, 0, `${label}: erreurs bloquantes présentes`)

      templates.push(first)
      signatures.push(firstSignature)
      analyses.push(analysis)
    } catch (error) {
      addFailure(error instanceof Error ? error.message : String(error))
    }
  }

  if (templates.length !== SAMPLES_PER_BATCH) {
    addFailure(`${definition.id}: ${templates.length}/${SAMPLES_PER_BATCH} templates auditables`)
  }

  const signatureKeys = new Set(signatures.map(signatureKey))
  const layouts = new Set()
  const geometries = new Set()
  templates.forEach((template, index) => {
    const signature = signatures[index]
    const layout = getSignatureField(signature, template, ['layoutFamily', 'layout', 'layoutId'])
    const geometry = getSignatureField(signature, template, ['geometryFamily', 'geometry', 'geometryId'])
    if (layout !== undefined) layouts.add(String(layout))
    if (geometry !== undefined) geometries.add(String(geometry))
  })

  if (!layouts.size) addFailure(`${definition.id}: famille de layout absente des signatures`)
  if (!geometries.size) addFailure(`${definition.id}: famille de géométrie absente des signatures`)

  let distances = { average: 0, p25: 0, maximum: 0 }
  try {
    distances = inspectDistances(signatures, definition.id)
  } catch (error) {
    addFailure(error instanceof Error ? error.message : String(error))
  }

  const scores = analyses.map(({ score }) => Number(score))
  const averageScore = scores.length
    ? scores.reduce((total, score) => total + score, 0) / scores.length
    : 0
  const minimumScore = scores.length ? Math.min(...scores) : 0

  const diversityChecks = [
    ['signatures', signatureKeys.size],
    ['layouts', layouts.size],
    ['geometries', geometries.size],
  ]
  diversityChecks.forEach(([key, actual]) => {
    const expected = definition.minimums[key]
    if (actual < expected) addFailure(`${definition.id}: ${key} ${actual}/${expected} minimum`)
  })
  if (distances.average < definition.minimums.distance) {
    addFailure(`${definition.id}: distance moyenne normalisée ${round(distances.average, 3)}/${definition.minimums.distance} minimum`)
  }

  return {
    Lot: definition.label,
    OK: `${templates.length}/${SAMPLES_PER_BATCH}`,
    Signatures: signatureKeys.size,
    Layouts: layouts.size,
    Géométries: geometries.size,
    'Distance moy.': round(distances.average, 3),
    'Distance p25': round(distances.p25, 3),
    'Score min.': round(minimumScore, 1),
    'Score moy.': round(averageScore, 1),
  }
}

const report = batchDefinitions.map(auditBatch)
const auditedPairs = batchDefinitions.length * SAMPLES_PER_BATCH

console.log(`\nAudit du générateur · ${auditedPairs} couples brief + seed générés deux fois`)
console.table(report)

if (failures.length) {
  const uniqueFailures = [...new Set(failures)]
  console.error(`ÉCHEC · ${uniqueFailures.length} problème${uniqueFailures.length > 1 ? 's' : ''}`)
  uniqueFailures.slice(0, 20).forEach((failure) => console.error(`- ${failure}`))
  if (uniqueFailures.length > 20) console.error(`- … ${uniqueFailures.length - 20} autre(s) problème(s)`)
  process.exitCode = 1
} else {
  console.log('OK · contrat, déterminisme, validation et seuils de diversité respectés.')
}
