import { toBlob } from 'html-to-image'

const EXPORT_FONT_SELECTOR =
  '.template-text, .player-name, .placement-number'

export const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const createExportFilename = (eventName, extension = 'png') => {
  const eventSlug = slugify(eventName || '')
  if (eventSlug) return `${eventSlug}-top8.${extension}`

  const date = new Date().toLocaleDateString('sv-SE')
  return `zero-top8-${date}.${extension}`
}

const waitForImage = async (image) => {
  if (!image.complete) {
    await new Promise((resolve, reject) => {
      image.addEventListener('load', resolve, { once: true })
      image.addEventListener('error', reject, { once: true })
    })
  }

  if (typeof image.decode === 'function') {
    await image.decode()
  }
}

const applyLogicalFontSizes = (node) => {
  node.querySelectorAll(EXPORT_FONT_SELECTOR).forEach((element) => {
    const maximumSize = element.style.fontSize.match(/,\s*([\d.]+px)\)$/)?.[1]
    if (maximumSize) element.style.fontSize = maximumSize
  })
}

const createExportNode = (canvasNode, width, height) => {
  const wrapper = document.createElement('div')
  const exportNode = canvasNode.cloneNode(true)

  wrapper.setAttribute('aria-hidden', 'true')
  Object.assign(wrapper.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${width}px`,
    height: `${height}px`,
    overflow: 'hidden',
    pointerEvents: 'none',
  })

  Object.assign(exportNode.style, {
    width: `${width}px`,
    height: `${height}px`,
    aspectRatio: 'auto',
  })

  applyLogicalFontSizes(exportNode)
  exportNode
    .querySelectorAll('[data-export-ignore="true"]')
    .forEach((element) => element.remove())
  wrapper.append(exportNode)
  document.body.append(wrapper)

  return { exportNode, wrapper }
}

export const downloadBlob = (blob, filename) => {
  const downloadUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = filename
  link.href = downloadUrl
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 10_000)
}

export const exportTop8AsPng = async ({
  canvasNode,
  eventName,
  scale,
  width,
  height,
}) => {
  if (!canvasNode) throw new Error('Le canvas est introuvable.')

  await document.fonts.load('16px "Hylia Serif"')
  await document.fonts.ready

  const { exportNode, wrapper } = createExportNode(canvasNode, width, height)

  try {
    await Promise.all([...exportNode.querySelectorAll('img')].map(waitForImage))

    const blob = await toBlob(exportNode, {
      width,
      height,
      canvasWidth: width * scale,
      canvasHeight: height * scale,
      pixelRatio: 1,
      cacheBust: false,
      preferredFontFormat: 'opentype',
      skipAutoScale: true,
    })

    if (!blob) throw new Error("L'image PNG n'a pas pu être créée.")
    downloadBlob(blob, createExportFilename(eventName))
  } finally {
    wrapper.remove()
  }
}
