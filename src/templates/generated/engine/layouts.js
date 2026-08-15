import { CANVAS_WIDTH } from './constants.js'
import { clamp, pick } from './random.js'

const mirrorBoxes = (boxes) => boxes.map(([x, y, width, height]) => [
  CANVAS_WIDTH - x - width,
  y,
  width,
  height,
])

const layout = (id, label, boxes, options = {}) => ({ id, label, boxes, ...options })

export const layoutFamilies = [
  layout('podium', 'Podium central', [[181, 62, 324, 196], [0, 62, 177, 128], [509, 62, 177, 128], [181, 262, 324, 124], [0, 194, 177, 94], [0, 292, 177, 94], [509, 194, 177, 94], [509, 292, 177, 94]]),
  layout('hero-left', 'Top 1 monumental à gauche', [[0, 62, 332, 324], [336, 62, 174, 126], [514, 62, 172, 126], [336, 192, 350, 82], [336, 278, 172, 108], [512, 278, 174, 108], [0, 62, 0, 0], [0, 62, 0, 0]], { customVariants: [
    [[0, 62, 332, 324], [336, 62, 174, 126], [514, 62, 172, 126], [336, 192, 350, 82], [336, 278, 84, 108], [424, 278, 84, 108], [512, 278, 84, 108], [600, 278, 86, 108]],
    [[0, 62, 356, 324], [360, 62, 162, 110], [526, 62, 160, 110], [360, 176, 326, 92], [360, 272, 159, 114], [523, 272, 163, 114], [360, 272, 0, 0], [360, 272, 0, 0]],
  ] }),
  layout('hero-right', 'Top 1 monumental à droite', mirrorBoxes([[0, 62, 332, 324], [336, 62, 174, 126], [514, 62, 172, 126], [336, 192, 350, 82], [336, 278, 84, 108], [424, 278, 84, 108], [512, 278, 84, 108], [600, 278, 86, 108]])),
  layout('hero-top', 'Top 1 en bande supérieure', [[0, 62, 686, 142], [0, 208, 226, 86], [230, 208, 226, 86], [460, 208, 226, 86], [0, 298, 134, 88], [138, 298, 134, 88], [276, 298, 202, 88], [482, 298, 204, 88]]),
  layout('hero-bottom', 'Top 1 dominant en bas', [[0, 222, 686, 164], [0, 62, 226, 76], [230, 62, 226, 76], [460, 62, 226, 76], [0, 142, 134, 76], [138, 142, 134, 76], [276, 142, 202, 76], [482, 142, 204, 76]]),
  layout('diagonal', 'Diagonale ascendante', [[156, 62, 374, 178], [0, 62, 152, 116], [534, 62, 152, 116], [156, 244, 374, 142], [0, 182, 152, 100], [0, 286, 152, 100], [534, 182, 152, 100], [534, 286, 152, 100]]),
  layout('reverse-diagonal', 'Diagonale descendante', mirrorBoxes([[156, 62, 374, 178], [0, 62, 152, 116], [534, 62, 152, 116], [156, 244, 374, 142], [0, 182, 152, 100], [0, 286, 152, 100], [534, 182, 152, 100], [534, 286, 152, 100]])),
  layout('radial', 'Composition radiale', [[218, 126, 250, 176], [0, 62, 224, 60], [228, 62, 226, 60], [458, 62, 228, 60], [0, 126, 214, 176], [472, 126, 214, 176], [0, 306, 341, 80], [345, 306, 341, 80]]),
  layout('manga-panels', 'Page manga', [[200, 62, 286, 210], [0, 62, 196, 132], [490, 62, 196, 132], [200, 276, 286, 110], [0, 198, 196, 90], [0, 292, 196, 94], [490, 198, 196, 90], [490, 292, 196, 94]]),
  layout('comic-splash', 'Splash page comic', [[0, 62, 430, 220], [434, 62, 252, 108], [434, 174, 252, 108], [0, 286, 134, 100], [138, 286, 134, 100], [276, 286, 134, 100], [414, 286, 134, 100], [552, 286, 134, 100]]),
  layout('editorial', 'Éditorial asymétrique', [[0, 62, 360, 210], [364, 62, 322, 102], [364, 168, 322, 104], [0, 276, 220, 110], [224, 276, 112, 110], [340, 276, 112, 110], [456, 276, 112, 110], [572, 276, 114, 110]]),
  layout('magazine', 'Colonnes magazine', [[230, 62, 278, 214], [0, 62, 226, 104], [0, 170, 226, 106], [512, 62, 174, 104], [512, 170, 174, 106], [0, 280, 168, 106], [172, 280, 340, 106], [516, 280, 170, 106]]),
  layout('swiss-grid', 'Grille suisse', [[0, 62, 342, 162], [346, 62, 168, 162], [518, 62, 168, 162], [0, 228, 134, 158], [138, 228, 134, 158], [276, 228, 134, 158], [414, 228, 134, 158], [552, 228, 134, 158]]),
  layout('brutalist', 'Blocs brutalistes', [[0, 62, 392, 180], [396, 62, 290, 92], [396, 158, 290, 84], [0, 246, 170, 140], [174, 246, 218, 140], [396, 246, 90, 140], [490, 246, 92, 140], [586, 246, 100, 140]]),
  layout('cascade', 'Cascade', [[0, 62, 320, 208], [324, 62, 220, 150], [548, 62, 138, 150], [324, 216, 362, 80], [0, 300, 156, 86], [160, 300, 156, 86], [320, 300, 176, 86], [500, 300, 186, 86]]),
  layout('staircase', 'Escalier', [[0, 62, 310, 210], [314, 62, 230, 136], [548, 62, 138, 136], [314, 202, 372, 92], [0, 276, 152, 110], [156, 276, 152, 110], [312, 298, 184, 88], [500, 298, 186, 88]]),
  layout('split', 'Écran partagé', [[0, 62, 344, 324], [348, 62, 168, 102], [520, 62, 166, 102], [348, 168, 338, 70], [348, 242, 81, 144], [433, 242, 81, 144], [518, 242, 81, 144], [603, 242, 83, 144]]),
  layout('cross', 'Composition en croix', [[218, 130, 250, 166], [0, 62, 214, 100], [472, 62, 214, 100], [218, 62, 250, 64], [0, 166, 214, 130], [472, 166, 214, 130], [0, 300, 341, 86], [345, 300, 341, 86]]),
  layout('horizontal-strips', 'Bandes horizontales', [[0, 62, 400, 78], [404, 62, 282, 78], [0, 144, 400, 78], [404, 144, 282, 78], [0, 226, 400, 78], [404, 226, 282, 78], [0, 308, 400, 78], [404, 308, 282, 78]]),
  layout('vertical-strips', 'Bandes verticales', [[0, 62, 140, 324], [144, 62, 74, 324], [222, 62, 74, 324], [300, 62, 74, 324], [378, 62, 74, 324], [456, 62, 74, 324], [534, 62, 74, 324], [612, 62, 74, 324]]),
  layout('mosaic', 'Mosaïque irrégulière', [[180, 62, 326, 176], [0, 62, 176, 104], [510, 62, 176, 104], [0, 170, 176, 148], [510, 170, 176, 148], [180, 242, 160, 144], [344, 242, 162, 144], [510, 322, 176, 64]]),
  layout('corner-hero', 'Champion dans un coin', [[0, 62, 382, 218], [386, 62, 148, 106], [538, 62, 148, 106], [386, 172, 300, 108], [0, 284, 134, 102], [138, 284, 134, 102], [276, 284, 202, 102], [482, 284, 204, 102]], { allowMirror: true }),
  layout('center-void', 'Branding central', [[0, 62, 250, 96], [254, 62, 142, 96], [400, 62, 140, 96], [544, 62, 142, 96], [0, 290, 142, 96], [146, 290, 140, 96], [290, 290, 142, 96], [436, 290, 250, 96]]),
  layout('poster', 'Affiche centrale', [[190, 62, 306, 218], [0, 62, 186, 106], [500, 62, 186, 106], [0, 172, 186, 108], [500, 172, 186, 108], [0, 284, 220, 102], [224, 284, 238, 102], [466, 284, 220, 102]]),
  layout('broadcast', 'Habillage broadcast', [[0, 62, 410, 220], [414, 62, 272, 108], [414, 174, 272, 108], [0, 286, 170, 100], [174, 286, 124, 100], [302, 286, 124, 100], [430, 286, 124, 100], [558, 286, 128, 100]]),
]

const legacyAliases = {
  'podium-central': 'podium',
  'grille-asymetrique': 'swiss-grid',
  asymmetric: 'mosaic',
  diagonale: 'diagonal',
  'panneaux-manga': 'manga-panels',
  'split-screen': 'split',
  experimental: 'mosaic',
  'champion-left': 'hero-left',
  'center-stage': 'podium',
}

const validBoxes = (boxes) => boxes.length === 8 && boxes.every((box) => box[2] > 0 && box[3] > 0)

export const getLayoutFamily = (id) => {
  const normalized = legacyAliases[id] || id
  return layoutFamilies.find((candidate) => candidate.id === normalized)
}

const warpCoordinate = (value, maximum, exponent) =>
  maximum * ((value / maximum) ** exponent)

const varyProportions = (boxes, random, variation) => {
  const amplitude = variation === 'wild' ? .24 : variation === 'creative' ? .15 : .065
  let xExponent = 1 + (random() * 2 - 1) * amplitude
  let yExponent = 1 + (random() * 2 - 1) * amplitude * .72
  const contentTop = Math.min(...boxes.map(([, y]) => y))
  const contentHeight = 386 - contentTop
  const measure = ([x, y, width, height]) => {
    const warpedX = warpCoordinate(x, CANVAS_WIDTH, xExponent)
    const warpedRight = warpCoordinate(x + width, CANVAS_WIDTH, xExponent)
    const localTop = y - contentTop
    const localBottom = y + height - contentTop
    const warpedY = contentTop + warpCoordinate(localTop, contentHeight, yExponent)
    const warpedBottom = contentTop + warpCoordinate(localBottom, contentHeight, yExponent)
    return { warpedX, warpedRight, warpedY, warpedBottom }
  }
  if (boxes.some((box) => {
    const { warpedX, warpedRight } = measure(box)
    return warpedRight - warpedX < 56
  })) xExponent = 1
  if (boxes.some((box) => {
    const { warpedY, warpedBottom } = measure(box)
    return warpedBottom - warpedY < 52
  })) yExponent = 1
  return boxes.map((box) => {
    const { warpedX, warpedRight, warpedY, warpedBottom } = measure(box)
    return [
      Math.round(warpedX),
      Math.round(warpedY),
      Math.round(warpedRight - warpedX),
      Math.round(warpedBottom - warpedY),
    ]
  })
}

export const resolveLayoutBoxes = (family, random, variation = 'creative') => {
  const variants = [family.boxes, ...(family.customVariants || [])].filter(validBoxes)
  let boxes = pick(variants, random).map((box) => [...box])
  if (family.allowMirror && random() > 0.5) boxes = mirrorBoxes(boxes)
  return varyProportions(boxes, random, variation)
}

export const applyDensityAndDominance = (boxes, composition) => {
  const density = clamp(Number(composition.density), 0, 100)
  const inset = Math.round((100 - density) * 0.075)
  const adjusted = boxes.map(([x, y, width, height]) => {
    const horizontalInset = Math.min(inset, Math.max(0, Math.floor((width - 56) / 2)))
    const verticalInset = Math.min(inset, Math.max(0, Math.floor((height - 52) / 2)))
    return [
      x + horizontalInset,
      y + verticalInset,
      width - horizontalInset * 2,
      height - verticalInset * 2,
    ]
  })
  const [x, y, width, height] = adjusted[0]
  const dominance = clamp(Number(composition.winnerDominance), 0, 100) / 100
  const scale = 0.92 + dominance * 0.08
  const winnerWidth = Math.round(width * scale)
  const winnerHeight = Math.round(height * scale)
  adjusted[0] = [
    x + Math.round((width - winnerWidth) / 2),
    y + Math.round((height - winnerHeight) / 2),
    winnerWidth,
    winnerHeight,
  ]
  return adjusted
}
