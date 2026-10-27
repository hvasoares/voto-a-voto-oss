/** SVG -> PNG File in the browser (canvas). Browser only; the drawing itself is the pure shareCardSvg. */
import { SHARE_CARD_SIZE } from './share-card'

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('the picture could not be decoded'))
    img.src = url
  })

/** `size` is the picture's own pixel size (the viewBox): the share card's by default, the stat card's for the generator (#25). */
export async function svgToPng(svg: string, filename: string, size: { width: number; height: number } = SHARE_CARD_SIZE): Promise<File> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = size.width
    canvas.height = size.height
    const g = canvas.getContext('2d')
    if (!g) throw new Error('no canvas')
    g.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('the picture could not be encoded')
    return new File([blob], filename, { type: 'image/png' })
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Offers a file to the visitor as a download (no navigation, no request). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.hidden = true
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}