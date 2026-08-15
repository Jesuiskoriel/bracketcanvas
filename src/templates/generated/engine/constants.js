export const CANVAS_WIDTH = 686
export const CANVAS_HEIGHT = 386
export const DEFAULT_CONTENT_TOP = 62
export const EXPECTED_PLACEMENTS = [1, 2, 3, 4, 5, 5, 7, 7]
export const SLOT_IDS = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth-a',
  'fifth-b',
  'seventh-a',
  'seventh-b',
]

export const GENERATOR_VERSION = 4

export const svgDataUrl = (content) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(content)}`
