import background from '../assets/templates/comic/background.svg'
import framesOverlay from '../assets/templates/comic/frames-overlay.svg'
import panelDots from '../assets/templates/comic/panel-dots.svg'
import panelGrid from '../assets/templates/comic/panel-grid.svg'
import panelInverse from '../assets/templates/comic/panel-inverse.svg'
import panelRays from '../assets/templates/comic/panel-rays.svg'
import panelRings from '../assets/templates/comic/panel-rings.svg'
import panelSpeed from '../assets/templates/comic/panel-speed.svg'
import panelVortex from '../assets/templates/comic/panel-vortex.svg'
import panelZigzag from '../assets/templates/comic/panel-zigzag.svg'

const clipPathFromCanvasPoints = (points, box) => {
  const values = points.map(([x, y]) => {
    const localX = ((x - box.x) / box.width) * 100
    const localY = ((y - box.y) / box.height) * 100
    return `${localX.toFixed(2)}% ${localY.toFixed(2)}%`
  })

  return `polygon(${values.join(', ')})`
}

const createSlot = ({ points, ...slot }) => ({
  ...slot,
  points,
  clipPath: clipPathFromCanvasPoints(points, slot),
})

const nameZone = (x, y, width, height, align = 'center', rotation = 0) => ({
  x,
  y,
  width,
  height,
  align,
  fontSize: 11,
  background: '#a8f6ff',
  color: '#020817',
  rotation,
})

// Coordonnées locales au slot. Ces zones évitent les cartouches de pseudo et
// tiennent compte de la largeur réellement exploitable de chaque polygone.
const autoPlacement = (
  safeX,
  safeY,
  safeWidth,
  safeHeight,
  options = {},
) => ({
  safeX,
  safeY,
  safeWidth,
  safeHeight,
  solo: { fill: 1.02, maxCrop: 1.55, yBias: 0, ...options.solo },
  duoPrimary: { fill: 1.08, maxCrop: 1.5, width: 0.62, yBias: 0.02, ...options.duoPrimary },
  duoSecondary: { fill: 0.94, maxCrop: 1.45, width: 0.5, yBias: -0.02, ...options.duoSecondary },
  duoOverlap: options.duoOverlap ?? 0.12,
})

export const top8Template = {
  id: 'zero-comic-top8',
  revision: 6,
  visualStyle: 'comic',
  name: 'Zero — Comic Top 8',
  width: 686,
  height: 386,
  slotTexture: panelDots,
  teamLogo: { top: 8, right: 7, width: 20, height: 22 },
  tournamentLogo: { x: 621, y: 0, width: 61, height: 61, zIndex: 24 },
  layers: [
    { id: 'background', src: background, zIndex: 0 },
    { id: 'frames-overlay', src: framesOverlay, zIndex: 20 },
  ],
  decorations: [],
  metadata: [
    { id: 'eventName', x: 121, y: 2, width: 486, height: 53, zIndex: 5, fontSize: 34, lineHeight: 1.05, align: 'center' },
    { id: 'date', x: 11, y: 8, width: 99, height: 18, zIndex: 5, fontSize: 11, lineHeight: 1, align: 'left' },
    { id: 'participantCount', x: 11, y: 32, width: 103, height: 18, zIndex: 5, fontSize: 10, lineHeight: 1, align: 'left' },
  ],
  slots: [
    createSlot({
      id: 'first', placement: 1, x: 215, y: 60, width: 275, height: 220, zIndex: 10,
      points: [[240,60],[470,60],[490,170],[470,280],[245,280],[215,170]], texture: panelRays,
      rank: { x: 275, y: 88, size: 45, color: '#ffffff', layer: 'front' },
      nameZone: nameZone(281, 255, 176, 23, 'center', 0),
      autoPlacement: autoPlacement(27, 7, 222, 187, {
        solo: { fill: 1.08, yBias: 0.025 },
        duoPrimary: { fill: 1.12, width: 0.64 },
        duoSecondary: { fill: 0.98, width: 0.52 },
        duoOverlap: 0.15,
      }),
    }),
    createSlot({
      id: 'second', placement: 2, x: 0, y: 60, width: 240, height: 110, zIndex: 8,
      points: [[0,60],[240,60],[215,170],[0,170]], texture: panelDots,
      rank: { x: 190, y: 131, size: 32, color: '#ffffff', layer: 'front' },
      nameZone: nameZone(17, 62, 177, 20, 'center', -1),
      autoPlacement: autoPlacement(7, 23, 209, 81, {
        solo: { fill: 0.96, yBias: 0.04 },
        duoPrimary: { fill: 1.02, width: 0.63 },
        duoSecondary: { fill: 0.9, width: 0.49 },
      }),
    }),
    createSlot({
      id: 'third', placement: 3, x: 470, y: 60, width: 216, height: 110, zIndex: 8,
      points: [[470,60],[686,60],[686,170],[490,170]], texture: panelInverse,
      rank: { x: 510, y: 82, size: 31, color: '#ffffff', layer: 'front' },
      nameZone: nameZone(541, 62, 138, 20, 'center', 1),
      autoPlacement: autoPlacement(22, 23, 187, 81, {
        solo: { fill: 0.96, yBias: 0.04 },
        duoPrimary: { fill: 1.02, width: 0.63 },
        duoSecondary: { fill: 0.9, width: 0.49 },
      }),
    }),
    createSlot({
      id: 'fourth', placement: 4, x: 225, y: 280, width: 285, height: 106, zIndex: 7,
      points: [[245,280],[470,280],[510,386],[225,386]], texture: panelRings,
      rank: { x: 262, y: 299, size: 27, color: '#ffffff', layer: 'front' },
      nameZone: nameZone(277, 364, 168, 20, 'center', 0),
      autoPlacement: autoPlacement(31, 5, 221, 78, {
        solo: { fill: 0.98, yBias: 0.03 },
        duoPrimary: { fill: 1.04, width: 0.63 },
        duoSecondary: { fill: 0.91, width: 0.49 },
      }),
    }),
    createSlot({
      id: 'fifth-a', placement: 5, x: 0, y: 170, width: 245, height: 110, zIndex: 8,
      points: [[0,170],[215,170],[245,280],[0,280]], texture: panelVortex,
      rank: { x: 191, y: 190, size: 31, color: '#ffffff', layer: 'front' },
      nameZone: nameZone(13, 257, 158, 21, 'center', -1),
      autoPlacement: autoPlacement(8, 5, 211, 80, {
        solo: { fill: 0.98, yBias: 0.03 },
        duoPrimary: { fill: 1.04, width: 0.63 },
        duoSecondary: { fill: 0.91, width: 0.49 },
      }),
    }),
    createSlot({
      id: 'fifth-b', placement: 5, x: 0, y: 280, width: 245, height: 106, zIndex: 7,
      points: [[0,280],[245,280],[225,386],[0,386]], texture: panelZigzag,
      rank: { x: 20, y: 299, size: 27, color: '#ffffff', layer: 'front' },
      nameZone: nameZone(126, 282, 105, 20, 'center', 1),
      autoPlacement: autoPlacement(8, 23, 211, 77, {
        solo: { fill: 0.96, yBias: 0.04 },
        duoPrimary: { fill: 1.02, width: 0.63 },
        duoSecondary: { fill: 0.9, width: 0.49 },
      }),
    }),
    createSlot({
      id: 'seventh-a', placement: 7, x: 470, y: 170, width: 216, height: 110, zIndex: 8,
      points: [[490,170],[686,170],[686,280],[470,280]], texture: panelSpeed,
      rank: { x: 646, y: 245, size: 30, color: '#ffffff', layer: 'front' },
      nameZone: nameZone(509, 172, 169, 21, 'center', 0),
      autoPlacement: autoPlacement(24, 23, 184, 80, {
        solo: { fill: 0.96, yBias: 0.04 },
        duoPrimary: { fill: 1.02, width: 0.63 },
        duoSecondary: { fill: 0.9, width: 0.49 },
      }),
    }),
    createSlot({
      id: 'seventh-b', placement: 7, x: 470, y: 280, width: 216, height: 106, zIndex: 7,
      points: [[470,280],[686,280],[686,386],[510,386]], texture: panelGrid,
      rank: { x: 651, y: 299, size: 27, color: '#ffffff', layer: 'front' },
      nameZone: nameZone(570, 282, 108, 20, 'center', -1),
      autoPlacement: autoPlacement(36, 23, 174, 77, {
        solo: { fill: 0.94, yBias: 0.04 },
        duoPrimary: { fill: 1, width: 0.63 },
        duoSecondary: { fill: 0.88, width: 0.49 },
      }),
    }),
  ],
}
