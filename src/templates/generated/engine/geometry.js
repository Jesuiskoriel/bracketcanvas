import { clamp, pick, round } from './random.js'

const rectangle = [[0, 0], [100, 0], [100, 100], [0, 100]]

export const geometryFamilies = [
  { id: 'rectangle', label: 'Rectangle', variants: [rectangle] },
  { id: 'soft-rectangle', label: 'Rectangle adouci', variants: [
    [[5, 0], [95, 0], [100, 5], [100, 95], [95, 100], [5, 100], [0, 95], [0, 5]],
    [[8, 0], [92, 0], [98, 3], [100, 10], [100, 90], [98, 97], [92, 100], [8, 100], [2, 97], [0, 90], [0, 10], [2, 3]],
  ] },
  { id: 'trapezoid', label: 'Trapèze', variants: [
    [[8, 0], [92, 0], [100, 100], [0, 100]],
    [[0, 0], [92, 0], [100, 100], [8, 100]],
  ] },
  { id: 'reverse-trapezoid', label: 'Trapèze inversé', variants: [
    [[0, 0], [100, 0], [92, 100], [8, 100]],
    [[8, 0], [100, 0], [100, 100], [0, 100]],
  ] },
  { id: 'parallelogram', label: 'Parallélogramme', variants: [
    [[10, 0], [100, 0], [90, 100], [0, 100]],
    [[0, 0], [90, 0], [100, 100], [10, 100]],
  ] },
  { id: 'clipped-triangle', label: 'Triangle tronqué', variants: [
    [[0, 0], [100, 9], [88, 100], [18, 100]],
    [[12, 0], [100, 0], [100, 82], [0, 100]],
    [[0, 18], [100, 0], [88, 100], [0, 92]],
  ] },
  { id: 'pentagon', label: 'Pentagone', variants: [
    [[12, 0], [100, 0], [100, 82], [50, 100], [0, 82], [0, 10]],
    [[0, 0], [88, 0], [100, 50], [88, 100], [0, 100]],
  ] },
  { id: 'hexagon', label: 'Hexagone', variants: [
    [[9, 0], [91, 0], [100, 50], [91, 100], [9, 100], [0, 50]],
    [[0, 12], [50, 0], [100, 12], [100, 88], [50, 100], [0, 88]],
  ] },
  { id: 'manga-panel', label: 'Panneau manga', variants: [
    [[0, 7], [93, 0], [100, 100], [0, 94]],
    [[0, 0], [100, 6], [94, 100], [5, 100]],
    [[7, 0], [100, 0], [100, 92], [0, 100]],
    [[0, 10], [100, 0], [92, 100], [0, 88]],
  ], jitter: 2.2 },
  { id: 'diagonal-band', label: 'Bande diagonale', variants: [
    [[14, 0], [100, 0], [86, 100], [0, 100]],
    [[0, 0], [86, 0], [100, 100], [14, 100]],
  ] },
  { id: 'vertical-block', label: 'Bloc vertical', variants: [
    [[0, 0], [100, 5], [94, 100], [6, 100]],
    [[5, 0], [100, 0], [100, 94], [0, 100]],
  ] },
  { id: 'horizontal-block', label: 'Bloc horizontal', variants: [
    [[0, 4], [96, 0], [100, 96], [4, 100]],
    [[4, 0], [100, 4], [96, 100], [0, 96]],
  ] },
  { id: 'asymmetric', label: 'Asymétrique', variants: [
    [[0, 9], [72, 0], [100, 18], [93, 100], [11, 92]],
    [[8, 0], [100, 12], [90, 92], [38, 100], [0, 81]],
    [[0, 0], [90, 7], [100, 70], [77, 100], [7, 91]],
  ], jitter: 2.8 },
  { id: 'cut-corners', label: 'Coins coupés', variants: [
    [[7, 0], [94, 0], [100, 8], [100, 93], [92, 100], [0, 100], [0, 9]],
    [[0, 0], [92, 0], [100, 10], [100, 100], [8, 100], [0, 91]],
    [[9, 0], [100, 0], [100, 91], [92, 100], [7, 100], [0, 91], [0, 8]],
  ] },
  { id: 'ticket', label: 'Ticket', variants: [
    [[0, 0], [100, 0], [100, 36], [94, 42], [100, 48], [100, 100], [0, 100], [0, 48], [6, 42], [0, 36]],
    [[7, 0], [93, 0], [100, 8], [100, 92], [93, 100], [7, 100], [0, 92], [0, 62], [6, 54], [0, 46], [0, 8]],
  ] },
  { id: 'card', label: 'Carte', variants: [
    [[4, 0], [96, 0], [100, 4], [100, 96], [96, 100], [4, 100], [0, 96], [0, 4]],
    [[0, 0], [92, 0], [100, 8], [100, 100], [0, 100]],
  ] },
  { id: 'capsule', label: 'Capsule', variants: [
    [[12, 0], [88, 0], [96, 5], [100, 18], [100, 82], [96, 95], [88, 100], [12, 100], [4, 95], [0, 82], [0, 18], [4, 5]],
    [[18, 0], [82, 0], [94, 7], [100, 25], [100, 75], [94, 93], [82, 100], [18, 100], [6, 93], [0, 75], [0, 25], [6, 7]],
  ] },
  { id: 'organic', label: 'Organique contrôlée', variants: [
    [[11, 2], [39, 0], [72, 5], [96, 18], [100, 57], [91, 91], [61, 100], [24, 95], [2, 76], [0, 32]],
    [[5, 18], [22, 2], [61, 0], [91, 10], [100, 42], [94, 78], [75, 98], [34, 100], [4, 83], [0, 49]],
  ], jitter: 1.8 },
]

const legacyGeometryAliases = {
  clean: 'rectangle',
  irregular: 'manga-panel',
  diagonal: 'parallelogram',
}

export const getGeometryFamily = (id) => geometryFamilies.find(
  (family) => family.id === (legacyGeometryAliases[id] || id),
)

const keepOnBoundary = (value) => value === 0 || value === 100

export const createSlotPoints = ({
  family,
  box,
  index,
  random,
  symmetry = 50,
  intensity = 50,
}) => {
  const variant = family.variants[index % family.variants.length] || pick(family.variants, random)
  const randomVariant = family.variants.length > 1 && random() > 0.45
    ? pick(family.variants, random)
    : variant
  const asymmetry = 1 - clamp(Number(symmetry), 0, 100) / 100
  const jitter = (family.jitter || 0) * asymmetry * (0.5 + clamp(intensity, 0, 100) / 200)
  return randomVariant.map(([localX, localY]) => {
    const jitterX = keepOnBoundary(localX) ? 0 : (random() * 2 - 1) * jitter
    const jitterY = keepOnBoundary(localY) ? 0 : (random() * 2 - 1) * jitter
    return [
      round(box.x + (clamp(localX + jitterX, 0, 100) / 100) * box.width),
      round(box.y + (clamp(localY + jitterY, 0, 100) / 100) * box.height),
    ]
  })
}

export const clipPathFromPoints = (points, box) => `polygon(${points.map(([x, y]) => {
  const localX = ((x - box.x) / box.width) * 100
  const localY = ((y - box.y) / box.height) * 100
  return `${localX.toFixed(2)}% ${localY.toFixed(2)}%`
}).join(', ')})`

export const getGeometryLabel = (id) => getGeometryFamily(id)?.label || id
