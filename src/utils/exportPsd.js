import { t } from '../i18n.js'
import { toCanvas } from 'html-to-image'
import { createExportFilename, downloadBlob } from './exportPng.js'

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

export const exportTop8AsPsd = async ({
  canvasNode,
  eventName,
  scale,
  width,
  height,
  template,
  players,
}) => {
  if (!canvasNode) throw new Error(t("Le canvas est introuvable."))
  if (![1, 2, 4].includes(scale)) throw new Error(t("La qualité d'export PSD est invalide."))

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
      eventName: t('Nom de l’événement'), subtitle: t('Sous-titre / édition'), date: t("Date"),
      participantCount: t('Nombre de participants'),
    }
    const tournamentChildren = []
    for (const field of template.metadata) {
      tournamentChildren.push(await makeLayer(
        metadataLabels[field.id] || field.id,
        `metadata-${field.id}`,
      ))
    }
    if (exportNode.querySelector('[data-psd-key="tournament-logo"]')) {
      tournamentChildren.push(await makeLayer(t('Logo du tournoi'), 'tournament-logo'))
    }

    const foregroundKeys = template.layers
      .filter((layer) => layer.zIndex >= 20)
      .map((layer) => `template-layer-${layer.id}`)
    const foregroundChildren = [
      await makeLayer(t('Décorations de premier plan'), template.decorations.map(({ id }) => `decoration-${id}`)),
      await makeLayer(t('Cadres des cases'), foregroundKeys),
    ].filter(Boolean)

    const playerGroups = []
    const orderedSlots = [...template.slots].sort((a, b) => b.zIndex - a.zIndex)
    for (const slot of orderedSlots) {
      const player = players.find(({ id }) => id === slot.id)
      if (!player) continue
      const prefix = `player-${player.id}`
      const children = []
      if (player.rankLayer === 'front') children.push(await makeLayer(t('Placement'), `${prefix}-placement`))
      children.push(await makeLayer(t("Pseudo"), `${prefix}-pseudo`))
      if (player.teamLogo) children.push(await makeLayer(t('Logo d’équipe'), `${prefix}-team-logo`))
      children.push(await makeLayer(t('Ombre de la case'), `${prefix}-shade`))

      if (player.render) {
        const character = await makeLayer(t('Personnage 1'), `${prefix}-character-1`, {
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
        const character = await makeLayer(t('Personnage 2'), `${prefix}-character-2`, {
          unclipPlayer: player.id,
          normalizeOpacity: true,
        })
        if (character) {
          character.mask = createSlotMask(slot, scale)
          character.opacity = player.secondaryOpacity / 100
        }
        children.push(character)
      }
      if (player.rankLayer === 'back') children.push(await makeLayer(t('Placement'), `${prefix}-placement`))

      playerGroups.push({
        name: t('Joueur {0} — Place {1}', {
          0: template.slots.findIndex(({ id }) => id === slot.id) + 1,
          1: player.placement,
        }),
        opened: false,
        children: children.filter(Boolean),
      })
    }

    const backgroundKeys = template.layers
      .filter((layer) => layer.zIndex < 20)
      .map((layer) => `template-layer-${layer.id}`)
    const backgroundChildren = [
      await makeLayer(t('Textures des cases'), template.slots.map(({ id }) => `slot-texture-${id}`)),
      await makeLayer(t('Arrière-plan'), backgroundKeys),
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
        { name: t('Tournoi'), opened: true, children: tournamentChildren.filter(Boolean) },
        { name: t('Modèle — Premier plan'), opened: true, children: foregroundChildren },
        { name: t('Joueurs'), opened: true, children: playerGroups },
        { name: t('Modèle — Arrière-plan'), opened: true, children: backgroundChildren },
      ],
    }

    const { writePsd } = await import('ag-psd')
    const buffer = writePsd(psd, { compress: true, generateThumbnail: true })
    downloadBlob(
      new Blob([buffer], { type: 'image/vnd.adobe.photoshop' }),
      createExportFilename(eventName, 'psd'),
    )
  } catch (error) {
    if (scale === 4) {
      throw new Error(t("La création du PSD x4 a manqué de mémoire. Réessaie en x2."), { cause: error })
    }
    throw error
  } finally {
    wrapper.remove()
  }
}
