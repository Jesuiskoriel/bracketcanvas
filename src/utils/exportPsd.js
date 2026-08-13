import { toCanvas } from 'html-to-image'
import { createExportFilename } from './exportPng.js'

const PAINT_SELECTOR = '[data-psd-key]'
const EXPORT_FONT_SELECTOR = '.template-text, .player-name, .placement-number'

const waitForImage = async (image) => {
  if (!image.complete) {
    await new Promise((resolve, reject) => {
      image.addEventListener('load', resolve, { once: true })
      image.addEventListener('error', reject, { once: true })
    })
  }
  if (typeof image.decode === 'function') await image.decode()
}

const applyLogicalFontSizes = (node) => {
  node.querySelectorAll(EXPORT_FONT_SELECTOR).forEach((element) => {
    const maximumSize = element.style.fontSize.match(/,\s*([\d.]+px)\)$/)?.[1]
    if (maximumSize) element.style.fontSize = maximumSize
  })
}

const createRasterContext = async (canvasNode, width, height) => {
  const wrapper = document.createElement('div')
  const exportNode = canvasNode.cloneNode(true)
  Object.assign(wrapper.style, {
    position: 'fixed', left: '-10000px', top: '0', width: `${width}px`,
    height: `${height}px`, overflow: 'hidden', pointerEvents: 'none',
  })
  Object.assign(exportNode.style, {
    width: `${width}px`, height: `${height}px`, aspectRatio: 'auto',
  })
  applyLogicalFontSizes(exportNode)
  exportNode.querySelectorAll('[data-export-ignore="true"]').forEach((node) => node.remove())
  wrapper.append(exportNode)
  document.body.append(wrapper)
  await Promise.all([...exportNode.querySelectorAll('img')].map(waitForImage))
  return { exportNode, wrapper }
}

const cropTransparentCanvas = (source) => {
  const context = source.getContext('2d', { willReadFrequently: true })
  const { width, height } = source
  const pixels = context.getImageData(0, 0, width, height).data
  let left = width
  let top = height
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue
      if (x < left) left = x
      if (x > right) right = x
      if (y < top) top = y
      if (y > bottom) bottom = y
    }
  }

  if (right < left || bottom < top) {
    source.width = 1
    source.height = 1
    return null
  }

  const cropped = document.createElement('canvas')
  cropped.width = right - left + 1
  cropped.height = bottom - top + 1
  cropped.getContext('2d').drawImage(
    source, left, top, cropped.width, cropped.height,
    0, 0, cropped.width, cropped.height,
  )
  source.width = 1
  source.height = 1
  return { canvas: cropped, left, top }
}

const createSlotMask = (slot, scale) => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(slot.width * scale))
  canvas.height = Math.max(1, Math.round(slot.height * scale))
  const context = canvas.getContext('2d')
  context.fillStyle = '#000'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.beginPath()
  const points = slot.points?.length
    ? slot.points
    : (slot.clipPath?.match(/[\d.-]+%\s+[\d.-]+%/g) || []).map((pair) => {
        const [x, y] = pair.match(/[\d.-]+/g).map(Number)
        return [slot.x + (x / 100) * slot.width, slot.y + (y / 100) * slot.height]
      })
  const maskPoints = points.length >= 3
    ? points
    : [[slot.x, slot.y], [slot.x + slot.width, slot.y], [slot.x + slot.width, slot.y + slot.height], [slot.x, slot.y + slot.height]]
  maskPoints.forEach(([x, y], index) => {
    const localX = (x - slot.x) * scale
    const localY = (y - slot.y) * scale
    if (index === 0) context.moveTo(localX, localY)
    else context.lineTo(localX, localY)
  })
  context.closePath()
  context.fillStyle = '#fff'
  context.fill()
  return {
    canvas,
    top: Math.round(slot.y * scale),
    left: Math.round(slot.x * scale),
    defaultColor: 0,
    positionRelativeToLayer: false,
    fromVectorData: false,
  }
}

const downloadPsd = (buffer, filename) => {
  const blob = new Blob([buffer], { type: 'image/vnd.adobe.photoshop' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = url
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export const exportTop8AsPsd = async ({
  canvasNode,
  eventName,
  scale,
  width,
  height,
  template,
  players,
}) => {
  if (!canvasNode) throw new Error('Le canvas est introuvable.')
  if (![1, 2, 4].includes(scale)) throw new Error("La qualité d'export PSD est invalide.")

  await document.fonts.load('16px "Hylia Serif"')
  await document.fonts.ready

  const outputWidth = width * scale
  const outputHeight = height * scale
  const { exportNode, wrapper } = await createRasterContext(canvasNode, width, height)
  const paintNodes = [...exportNode.querySelectorAll(PAINT_SELECTOR)]
  const originalDisplays = new Map(paintNodes.map((node) => [node, node.style.display]))

  const rasterize = async (keys, { unclipPlayer = '', normalizeOpacity = false } = {}) => {
    const selectedKeys = new Set(Array.isArray(keys) ? keys : [keys])
    paintNodes.forEach((node) => { node.style.display = 'none' })
    paintNodes.forEach((node) => {
      if (selectedKeys.has(node.dataset.psdKey)) node.style.display = originalDisplays.get(node)
    })
    const selectedNodes = paintNodes.filter((node) => selectedKeys.has(node.dataset.psdKey))
    const originalOpacities = new Map(selectedNodes.map((node) => [node, node.style.opacity]))
    if (normalizeOpacity) selectedNodes.forEach((node) => { node.style.opacity = '1' })

    const playerSlot = unclipPlayer
      ? exportNode.querySelector(`[data-psd-player="${CSS.escape(unclipPlayer)}"]`)
      : null
    const originalSlotStyle = playerSlot?.getAttribute('style')
    if (playerSlot) {
      playerSlot.style.overflow = 'visible'
      playerSlot.style.clipPath = 'none'
    }
    const originalBackground = exportNode.style.background
    exportNode.style.background = 'transparent'

    try {
      const canvas = await toCanvas(exportNode, {
        width,
        height,
        canvasWidth: outputWidth,
        canvasHeight: outputHeight,
        pixelRatio: 1,
        backgroundColor: 'transparent',
        cacheBust: false,
        preferredFontFormat: 'opentype',
        skipAutoScale: true,
      })
      return cropTransparentCanvas(canvas)
    } finally {
      exportNode.style.background = originalBackground
      if (playerSlot) {
        if (originalSlotStyle === null) playerSlot.removeAttribute('style')
        else playerSlot.setAttribute('style', originalSlotStyle)
      }
      if (normalizeOpacity) {
        selectedNodes.forEach((node) => { node.style.opacity = originalOpacities.get(node) })
      }
    }
  }

  const makeLayer = async (name, keys, options) => {
    const raster = await rasterize(keys, options)
    return raster ? { name, canvas: raster.canvas, left: raster.left, top: raster.top } : null
  }

  try {
    paintNodes.forEach((node) => { node.style.display = originalDisplays.get(node) })
    const composite = await toCanvas(exportNode, {
      width,
      height,
      canvasWidth: outputWidth,
      canvasHeight: outputHeight,
      pixelRatio: 1,
      cacheBust: false,
      preferredFontFormat: 'opentype',
      skipAutoScale: true,
    })

    const metadataLabels = {
      eventName: 'Event Name', subtitle: 'Subtitle', date: 'Date',
      participantCount: 'Entrants',
    }
    const tournamentChildren = []
    for (const field of template.metadata) {
      tournamentChildren.push(await makeLayer(
        metadataLabels[field.id] || field.id,
        `metadata-${field.id}`,
      ))
    }
    if (exportNode.querySelector('[data-psd-key="tournament-logo"]')) {
      tournamentChildren.push(await makeLayer('Tournament Logo', 'tournament-logo'))
    }

    const foregroundKeys = template.layers
      .filter((layer) => layer.zIndex >= 20)
      .map((layer) => `template-layer-${layer.id}`)
    const foregroundChildren = [
      await makeLayer('Foreground Decorations', template.decorations.map(({ id }) => `decoration-${id}`)),
      await makeLayer('Slot Frames', foregroundKeys),
    ].filter(Boolean)

    const playerGroups = []
    const orderedSlots = [...template.slots].sort((a, b) => b.zIndex - a.zIndex)
    for (const slot of orderedSlots) {
      const player = players.find(({ id }) => id === slot.id)
      if (!player) continue
      const prefix = `player-${player.id}`
      const children = []
      if (player.rankLayer === 'front') children.push(await makeLayer('Placement', `${prefix}-placement`))
      children.push(await makeLayer('Pseudo', `${prefix}-pseudo`))
      if (player.teamLogo) children.push(await makeLayer('Team Logo', `${prefix}-team-logo`))
      children.push(await makeLayer('Slot Shading', `${prefix}-shade`))

      if (player.render) {
        const character = await makeLayer('Character 1', `${prefix}-character-1`, {
          unclipPlayer: player.id,
          normalizeOpacity: true,
        })
        if (character) {
          character.mask = createSlotMask(slot, scale)
          character.opacity = player.opacity / 100
        }
        children.push(character)
      }
      if (player.secondaryRender) {
        const character = await makeLayer('Character 2', `${prefix}-character-2`, {
          unclipPlayer: player.id,
          normalizeOpacity: true,
        })
        if (character) {
          character.mask = createSlotMask(slot, scale)
          character.opacity = player.secondaryOpacity / 100
        }
        children.push(character)
      }
      if (player.rankLayer === 'back') children.push(await makeLayer('Placement', `${prefix}-placement`))

      playerGroups.push({
        name: `Player ${template.slots.findIndex(({ id }) => id === slot.id) + 1} — Place ${player.placement}`,
        opened: false,
        children: children.filter(Boolean),
      })
    }

    const backgroundKeys = template.layers
      .filter((layer) => layer.zIndex < 20)
      .map((layer) => `template-layer-${layer.id}`)
    const backgroundChildren = [
      await makeLayer('Slot Textures', template.slots.map(({ id }) => `slot-texture-${id}`)),
      await makeLayer('Background', backgroundKeys),
    ].filter(Boolean)

    const psd = {
      width: outputWidth,
      height: outputHeight,
      canvas: composite,
      imageResources: {
        resolutionInfo: {
          horizontalResolution: 72,
          horizontalResolutionUnit: 'PPI',
          widthUnit: 'Inches',
          verticalResolution: 72,
          verticalResolutionUnit: 'PPI',
          heightUnit: 'Inches',
        },
      },
      children: [
        { name: 'Tournament', opened: true, children: tournamentChildren.filter(Boolean) },
        { name: 'Template — Foreground', opened: true, children: foregroundChildren },
        { name: 'Players', opened: true, children: playerGroups },
        { name: 'Template — Background', opened: true, children: backgroundChildren },
      ],
    }

    const { writePsd } = await import('ag-psd')
    const buffer = writePsd(psd, { compress: true, generateThumbnail: true })
    downloadPsd(buffer, createExportFilename(eventName, 'psd'))
  } catch (error) {
    if (scale === 4) {
      throw new Error('La création du PSD x4 a manqué de mémoire. Réessaie en x2.', { cause: error })
    }
    throw error
  } finally {
    wrapper.remove()
  }
}
