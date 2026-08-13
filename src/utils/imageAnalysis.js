const analysisCache = new Map()
const ALPHA_THRESHOLD = 24
const MAX_ANALYSIS_SIZE = 192
const MAX_SAMPLE_POINTS = 2400
const MAX_CACHE_ENTRIES = 64

const FALLBACK_ANALYSIS = Object.freeze({
  width: 1,
  height: 1,
  aspectRatio: 1,
  bounds: {
    left: 0.08,
    top: 0.04,
    right: 0.92,
    bottom: 0.98,
    width: 0.84,
    height: 0.94,
  },
  focusBounds: {
    left: 0.12,
    top: 0.06,
    right: 0.88,
    bottom: 0.96,
    width: 0.76,
    height: 0.9,
  },
  headCenterX: 0.5,
  points: [
    { x: 0.25, y: 0.1 },
    { x: 0.5, y: 0.08 },
    { x: 0.75, y: 0.1 },
    { x: 0.15, y: 0.45 },
    { x: 0.5, y: 0.45 },
    { x: 0.85, y: 0.45 },
    { x: 0.25, y: 0.9 },
    { x: 0.5, y: 0.92 },
    { x: 0.75, y: 0.9 },
  ],
  usedFallback: true,
})

const loadImage = (source) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Le render n'a pas pu être analysé."))
    image.src = source
  })

const createAnalysis = async (source) => {
  const image = await loadImage(source)
  const sourceWidth = image.naturalWidth || image.width
  const sourceHeight = image.naturalHeight || image.height
  if (!sourceWidth || !sourceHeight) return FALLBACK_ANALYSIS

  const ratio = Math.min(1, MAX_ANALYSIS_SIZE / Math.max(sourceWidth, sourceHeight))
  const width = Math.max(1, Math.round(sourceWidth * ratio))
  const height = Math.max(1, Math.round(sourceHeight * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return FALLBACK_ANALYSIS

  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height).data
  let left = width
  let right = -1
  let top = height
  let bottom = -1
  const visiblePixels = []

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] < ALPHA_THRESHOLD) continue
      left = Math.min(left, x)
      right = Math.max(right, x)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
      visiblePixels.push({ x, y })
    }
  }

  if (!visiblePixels.length) return FALLBACK_ANALYSIS

  const sampleStep = Math.max(1, Math.ceil(visiblePixels.length / MAX_SAMPLE_POINTS))
  const points = visiblePixels
    .filter((_, index) => index % sampleStep === 0)
    .map(({ x, y }) => ({ x: (x + 0.5) / width, y: (y + 0.5) / height }))
  const headLimit = top + (bottom - top) * 0.34
  const headPixels = visiblePixels.filter(({ y }) => y <= headLimit)
  const sortedX = visiblePixels.map(({ x }) => x).sort((a, b) => a - b)
  const sortedY = visiblePixels.map(({ y }) => y).sort((a, b) => a - b)
  const percentile = (values, ratio) =>
    values[Math.min(values.length - 1, Math.floor(values.length * ratio))]
  const focusLeft = percentile(sortedX, 0.06)
  const focusRight = percentile(sortedX, 0.94)
  const focusTop = percentile(sortedY, 0.025)
  const focusBottom = percentile(sortedY, 0.975)
  const headCenterX = headPixels.length
    ? headPixels.reduce((total, point) => total + point.x, 0) /
      headPixels.length /
      width
    : (left + right) / 2 / width

  return {
    width: sourceWidth,
    height: sourceHeight,
    aspectRatio: sourceWidth / sourceHeight,
    bounds: {
      left: left / width,
      top: top / height,
      right: (right + 1) / width,
      bottom: (bottom + 1) / height,
      width: (right + 1 - left) / width,
      height: (bottom + 1 - top) / height,
    },
    focusBounds: {
      left: focusLeft / width,
      top: focusTop / height,
      right: (focusRight + 1) / width,
      bottom: (focusBottom + 1) / height,
      width: (focusRight + 1 - focusLeft) / width,
      height: (focusBottom + 1 - focusTop) / height,
    },
    headCenterX,
    points,
    usedFallback: false,
  }
}

export const analyzeRender = (source) => {
  if (!source) return Promise.resolve(null)
  if (!analysisCache.has(source)) {
    if (analysisCache.size >= MAX_CACHE_ENTRIES) {
      analysisCache.delete(analysisCache.keys().next().value)
    }
    analysisCache.set(
      source,
      createAnalysis(source).catch(() => FALLBACK_ANALYSIS),
    )
  }
  return analysisCache.get(source)
}

export const clearImageAnalysisCache = () => analysisCache.clear()
