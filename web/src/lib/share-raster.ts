/** SVG -> PNG File in the browser (canvas). Browser only; the drawing itself is the pure shareCardSvg. */
import { readSvgKeys, textDigest } from './card-keys'
import { embedPngKeys } from './png-keys'
import { SHARE_CARD_SIZE } from './share-card'

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('the picture could not be decoded'))
    img.src = url
  })

/** The pixel size a picture is drawn at: its own viewBox (cards are not all the same shape), the share card's when it has none. */
export function pictureSize(svg: string): { width: number; height: number } {
  const m = /^<svg\b[^>]*\sviewBox="0 0 (\d+) (\d+)"/.exec(svg)
  return m ? { width: Number(m[1]), height: Number(m[2]) } : SHARE_CARD_SIZE
}

/** `size` is the picture's own pixel size (the viewBox): the share card's by default, the stat card's for the generator (#25). */
export async function svgToPng(svg: string, filename: string, size: { width: number; height: number } = pictureSize(svg)): Promise<File> {
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
    // A self-describing card (#38) puts its keys and a digest of its words in the PNG, so a dropped PNG can reopen the view.
    const keys = readSvgKeys(svg)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const png = keys.ok ? embedPngKeys(bytes, { ...keys.keys, check: await textDigest(svg) }) : bytes
    return new File([png as Uint8Array<ArrayBuffer>], filename, { type: 'image/png' })
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