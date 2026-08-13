import background from '../assets/templates/comic/background.svg'
import framesOverlay from '../assets/templates/comic/frames-overlay.svg'
import panelDots from '../assets/templates/comic/panel-dots.svg'
import panelInverse from '../assets/templates/comic/panel-inverse.svg'
import panelRays from '../assets/templates/comic/panel-rays.svg'

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

const FIRST_SHAPE = [[3,2],[97,0],[100,17],[96,39],[100,58],[96,100],[2,98],[0,78],[4,58],[0,38]]
const SECOND_SHAPE = [[0,7],[96,0],[100,18],[94,45],[100,64],[92,100],[3,94],[7,72],[0,55],[6,32]]
const THIRD_SHAPE = [[4,0],[100,7],[94,31],[100,49],[94,70],[98,94],[7,100],[0,82],[5,60],[0,40]]
const FOURTH_SHAPE = [[5,0],[96,4],[100,25],[94,50],[100,73],[94,100],[4,96],[0,76],[6,52],[0,27]]
const FIFTH_SHAPE = [[0,3],[96,0],[100,20],[94,46],[100,67],[94,100],[5,96],[0,76],[6,52],[0,29]]
const SEVENTH_SHAPE = [[4,0],[100,4],[94,29],[100,52],[94,75],[98,97],[3,100],[0,78],[6,55],[0,32]]

const podiumNameZone = (x, y, width, height, rotation = 0) => ({
  x,
  y,
  width,
  height,
  align: 'center',
  fontSize: 13,
  background: '#fff36b',
  color: '#090909',
  rotation,
})

const lowerNameZone = (x, width, rotation = 0) => ({
  x,
  y: 356,
  width,
  height: 24,
  align: 'center',
  fontSize: 10,
  background: '#fff36b',
  color: '#090909',
  rotation,
})

export const top8Template = {
  id: 'zero-comic-top8',
  revision: 2,
  visualStyle: 'comic',
  name: 'Zero — Comic Top 8',
  width: 686,
  height: 386,
  slotTexture: panelDots,
  teamLogo: { top: 8, right: 7, width: 20, height: 22 },
  tournamentLogo: { x: 628, y: 11, width: 47, height: 48, zIndex: 5 },
  layers: [
    { id: 'background', src: background, zIndex: 0 },
    { id: 'frames-overlay', src: framesOverlay, zIndex: 20 },
  ],
  decorations: [],
  metadata: [
    { id: 'eventName', x: 119, y: 5, width: 490, height: 55, zIndex: 5, fontSize: 34, lineHeight: 1.05, align: 'center' },
    { id: 'date', x: 13, y: 15, width: 94, height: 17, zIndex: 5, fontSize: 11, lineHeight: 1, align: 'left' },
    { id: 'participantCount', x: 13, y: 42, width: 98, height: 15, zIndex: 5, fontSize: 10, lineHeight: 1, align: 'left' },
  ],
  slots: [
    createSlot({
      id: 'first', placement: 1, x: 173, y: 70, width: 263, height: 164, zIndex: 10,
      shape: FIRST_SHAPE, texture: panelRays, podiumTone: 'gold',
      rank: { x: 196, y: 94, size: 42, color: '#ffffff', layer: 'front' },
      nameZone: podiumNameZone(199, 200, 210, 26, -1),
    }),
    createSlot({
      id: 'second', placement: 2, x: 0, y: 84, width: 190, height: 146, zIndex: 8,
      shape: SECOND_SHAPE, texture: panelDots, podiumTone: 'silver',
      rank: { x: 18, y: 108, size: 34, color: '#ffffff', layer: 'front' },
      nameZone: podiumNameZone(14, 198, 151, 23, -2),
    }),
    createSlot({
      id: 'third', placement: 3, x: 422, y: 84, width: 264, height: 146, zIndex: 8,
      shape: THIRD_SHAPE, texture: panelInverse, podiumTone: 'bronze',
      rank: { x: 447, y: 108, size: 34, color: '#ffffff', layer: 'front' },
      nameZone: podiumNameZone(455, 198, 202, 23, 1.5),
    }),
    createSlot({
      id: 'fourth', placement: 4, x: 270, y: 224, width: 146, height: 162, zIndex: 8,
      shape: FOURTH_SHAPE, texture: panelRays,
      rank: { x: 282, y: 248, size: 27, color: '#ffffff', layer: 'front' },
      nameZone: lowerNameZone(285, 116),
    }),
    createSlot({
      id: 'fifth-a', placement: 5, x: 0, y: 224, width: 143, height: 162, zIndex: 7,
      shape: FIFTH_SHAPE, texture: panelInverse,
      rank: { x: 12, y: 248, size: 25, color: '#ffffff', layer: 'front' },
      nameZone: lowerNameZone(9, 118, -1),
    }),
    createSlot({
      id: 'fifth-b', placement: 5, x: 135, y: 224, width: 143, height: 162, zIndex: 7,
      shape: FIFTH_SHAPE, texture: panelDots,
      rank: { x: 147, y: 248, size: 25, color: '#ffffff', layer: 'front' },
      nameZone: lowerNameZone(145, 118, 1),
    }),
    createSlot({
      id: 'seventh-a', placement: 7, x: 408, y: 224, width: 143, height: 162, zIndex: 7,
      shape: SEVENTH_SHAPE, texture: panelDots,
      rank: { x: 420, y: 248, size: 25, color: '#ffffff', layer: 'front' },
      nameZone: lowerNameZone(418, 119, -1),
    }),
    createSlot({
      id: 'seventh-b', placement: 7, x: 543, y: 224, width: 143, height: 162, zIndex: 7,
      shape: SEVENTH_SHAPE, texture: panelInverse,
      rank: { x: 555, y: 248, size: 25, color: '#ffffff', layer: 'front' },
      nameZone: lowerNameZone(553, 119, 1),
    }),
  ],
}
