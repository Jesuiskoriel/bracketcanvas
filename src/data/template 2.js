import background from '../assets/templates/zero/background.png'
import frames from '../assets/templates/zero/frames-base.svg'
import framesOverlay from '../assets/templates/zero/frames-overlay.svg'
import parchmentTexture from '../assets/templates/zero/parchment-texture.png'
import fairyBlue from '../assets/templates/zero/props/fairy-blue.png'
import fairyDark from '../assets/templates/zero/props/fairy-dark.png'
import fairyGreen from '../assets/templates/zero/props/fairy-green.png'
import fairyRed from '../assets/templates/zero/props/fairy-red.png'

const clipPathFromCanvasPoints = (points, box) => {
  const values = points.map(([x, y]) => {
    const localX = ((x - box.x) / box.width) * 100
    const localY = ((y - box.y) / box.height) * 100
    return `${localX.toFixed(2)}% ${localY.toFixed(2)}%`
  })

  return `polygon(${values.join(', ')})`
}

const pointsFromShape = (shape, box) =>
  shape.map(([x, y]) => [
    box.x + (x / 100) * box.width,
    box.y + (y / 100) * box.height,
  ])

const createSlot = ({ shape, ...slot }) => {
  const points = pointsFromShape(shape, slot)
  return {
    ...slot,
    clipPath: clipPathFromCanvasPoints(points, slot),
  }
}

// Chaque silhouette est définie dans son propre repère 0–100.
// Les ex æquo partagent volontairement exactement la même forme.
const FIRST_SHAPE = [[2,16],[12,8],[24,10],[32,3],[43,8],[50,0],[58,8],[70,3],[80,9],[98,16],[94,31],[100,42],[95,55],[99,70],[94,84],[91,98],[76,94],[64,100],[51,95],[39,100],[25,94],[7,92],[9,76],[1,66],[6,52],[0,39],[6,28]]
const SECOND_SHAPE = [[0,11],[17,2],[34,7],[51,0],[68,7],[100,14],[94,33],[100,47],[92,61],[98,82],[84,98],[62,91],[45,100],[26,93],[5,98],[9,76],[0,61],[7,44]]
const THIRD_SHAPE = [[7,7],[29,2],[43,8],[57,0],[72,7],[94,3],[97,24],[100,37],[94,50],[100,65],[96,87],[82,98],[61,91],[48,100],[32,91],[9,96],[5,77],[0,61],[7,48],[0,33]]
const FOURTH_SHAPE = [[2,11],[18,1],[37,7],[51,0],[68,8],[88,3],[98,14],[94,31],[100,44],[94,60],[98,76],[87,90],[69,87],[52,100],[36,90],[15,96],[3,81],[8,63],[0,49],[7,32]]
const FIFTH_SHAPE = [[2,13],[18,2],[35,7],[51,0],[68,7],[88,3],[98,16],[93,36],[100,50],[93,65],[98,84],[82,98],[61,92],[50,100],[31,92],[11,98],[2,83],[7,62],[0,47],[8,30]]
const SEVENTH_SHAPE = [[0,18],[13,5],[30,9],[47,0],[64,8],[84,4],[100,17],[94,35],[100,52],[92,69],[98,87],[82,97],[65,91],[50,100],[33,92],[13,98],[2,84],[8,67],[0,51],[7,34]]

export const top8Template = {
  id: 'zero-sanctuary',
  name: 'Zero — Sanctuaire',
  width: 686,
  height: 386,
  slotTexture: parchmentTexture,
  teamLogo: { top: 8, right: 7, width: 21, height: 23 },
  tournamentLogo: { x: 17, y: 320, width: 82, height: 48, zIndex: 5 },
  layers: [
    { id: 'background', src: background, zIndex: 0 },
    { id: 'frames', src: frames, zIndex: 1 },
    { id: 'frames-overlay', src: framesOverlay, zIndex: 20 },
  ],
  decorations: [
    { id: 'fairy-blue-top', src: fairyBlue, x: 150, y: 2, width: 50, height: 48, zIndex: 3, opacity: 0.55, rotation: -12, blendMode: 'multiply' },
    { id: 'fairy-green-top', src: fairyGreen, x: 627, y: 12, width: 38, height: 38, zIndex: 3, opacity: 0.78, rotation: 16 },
    { id: 'fairy-red-right', src: fairyRed, x: 647, y: 138, width: 36, height: 43, zIndex: 3, opacity: 0.72, rotation: 12, flipped: true },
    { id: 'fairy-green-center', src: fairyGreen, x: 388, y: 240, width: 30, height: 30, zIndex: 3, opacity: 0.7, rotation: -18 },
    { id: 'fairy-red-bottom', src: fairyRed, x: 164, y: 323, width: 40, height: 48, zIndex: 3, opacity: 0.75, rotation: -14 },
    { id: 'fairy-dark-bottom', src: fairyDark, x: 629, y: 318, width: 39, height: 47, zIndex: 3, opacity: 0.78, rotation: 14 },
  ],
  metadata: [
    { id: 'eventName', x: 17, y: 17, width: 86, height: 40, zIndex: 5, fontSize: 15, lineHeight: 1.35, align: 'left' },
    { id: 'date', x: 17, y: 75, width: 86, height: 18, zIndex: 5, fontSize: 13, lineHeight: 1, align: 'left' },
    { id: 'participantCount', x: 17, y: 105, width: 88, height: 18, zIndex: 5, fontSize: 12, lineHeight: 1, align: 'left' },
  ],
  slots: [
    createSlot({
      id: 'first', placement: 1, x: 297, y: 22, width: 188, height: 127, zIndex: 10,
      shape: FIRST_SHAPE,
      rank: { x: 327, y: 51, size: 31, color: '#14100a', layer: 'front' },
      nameZone: { x: 326, y: 115, width: 134, height: 24, align: 'center', fontSize: 16 },
    }),
    createSlot({
      id: 'second', placement: 2, x: 136, y: 51, width: 154, height: 91, zIndex: 8,
      shape: SECOND_SHAPE,
      rank: { x: 160, y: 76, size: 25, color: '#14100a', layer: 'front' },
      nameZone: { x: 158, y: 113, width: 108, height: 20, align: 'center', fontSize: 12 },
    }),
    createSlot({
      id: 'third', placement: 3, x: 496, y: 52, width: 170, height: 90, zIndex: 8,
      shape: THIRD_SHAPE,
      rank: { x: 520, y: 75, size: 25, color: '#14100a', layer: 'front' },
      nameZone: { x: 520, y: 113, width: 120, height: 20, align: 'center', fontSize: 12 },
    }),
    createSlot({
      id: 'fourth', placement: 4, x: 137, y: 160, width: 162, height: 88, zIndex: 7,
      shape: FOURTH_SHAPE,
      rank: { x: 160, y: 184, size: 24, color: '#14100a', layer: 'front' },
      nameZone: { x: 159, y: 219, width: 115, height: 20, align: 'center', fontSize: 12 },
    }),
    createSlot({
      id: 'fifth-a', placement: 5, x: 303, y: 160, width: 158, height: 88, zIndex: 7,
      shape: FIFTH_SHAPE,
      rank: { x: 328, y: 184, size: 24, color: '#14100a', layer: 'front' },
      nameZone: { x: 326, y: 219, width: 111, height: 20, align: 'center', fontSize: 12 },
    }),
    createSlot({
      id: 'fifth-b', placement: 5, x: 468, y: 160, width: 189, height: 88, zIndex: 7,
      shape: FIFTH_SHAPE,
      rank: { x: 493, y: 184, size: 24, color: '#14100a', layer: 'front' },
      nameZone: { x: 494, y: 219, width: 133, height: 20, align: 'center', fontSize: 12 },
    }),
    createSlot({
      id: 'seventh-a', placement: 7, x: 223, y: 268, width: 179, height: 85, zIndex: 6,
      shape: SEVENTH_SHAPE,
      rank: { x: 250, y: 292, size: 24, color: '#14100a', layer: 'front' },
      nameZone: { x: 249, y: 325, width: 127, height: 19, align: 'center', fontSize: 12 },
    }),
    createSlot({
      id: 'seventh-b', placement: 7, x: 411, y: 268, width: 197, height: 85, zIndex: 6,
      shape: SEVENTH_SHAPE,
      rank: { x: 438, y: 292, size: 24, color: '#14100a', layer: 'front' },
      nameZone: { x: 439, y: 325, width: 139, height: 19, align: 'center', fontSize: 12 },
    }),
  ],
}
