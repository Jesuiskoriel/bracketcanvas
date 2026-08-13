const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(reader.result))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(blob)
  })

export const fileToDataUrl = (file) => blobToDataUrl(file)

export const persistImageSource = async (source) => {
  if (!source || !source.startsWith('blob:')) return source || ''
  const response = await fetch(source)
  if (!response.ok) throw new Error("L'image importée n'est plus disponible.")
  return blobToDataUrl(await response.blob())
}
