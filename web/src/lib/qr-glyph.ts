/**
 * The drawing half of the QR glyph (private#208), PURE and encoder-free: the module matrix as a type, the matrix packed to a short text and back,
 * and the serialized `<svg>`. `lib/qr-code.ts` encodes a text into a matrix at build time (it carries the vendored encoder); this module only draws
 * and packs one, so the page script of the QR family imports it without the encoder. `qr-code.ts` re-exports the drawing names.
 */
import { colors } from '@/shared/tokens'

export interface QrGlyph {
  /** The encoded text, verbatim (what a phone opens when it scans). */
  text: string
  /** QR version 1..40 (`size === version * 4 + 17`). */
  version: number
  /** Side length in modules, quiet zone not included. */
  size: number
  /** Dark modules, `modules[row][column]`. */
  modules: boolean[][]
}

/** ISO quiet zone in modules around the glyph: white border with nothing inside it. */
export const QR_QUIET_ZONE = 4

/** `M0 0h1v1h-1z` per dark module: the glyph's drawable geometry, deterministic by construction. */
export function glyphPath(g: QrGlyph): string {
  const parts: string[] = []
  for (let y = 0; y < g.size; y++) {
    for (let x = 0; x < g.size; x++) if (g.modules[y]![x]) parts.push(`M${x} ${y}h1v1h-1z`)
  }
  return parts.join('')
}

export interface QrSvgOptions {
  /** Aria label and <title> (default: "QR de <short address>" — the address a reader sees). */
  label?: string
  /** Quiet zone in modules (default QR_QUIET_ZONE). */
  margin?: number
  /** The light fill behind the modules (default colors.paper; the /qr/ card draws #ffffff, the frame's white). */
  paper?: string
}

/** The glyph as a serialized `<svg>` string, viewBox sized to include the quiet zone. */
export function glyphSvg(g: QrGlyph, o: QrSvgOptions = {}): string {
  const m = o.margin ?? QR_QUIET_ZONE
  const side = g.size + m * 2
  const paper = o.paper ?? colors.paper
  const label = o.label ?? `QR de ${g.text}`
  const safe = label.replace(/[\u0000-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}"` +
    ` shape-rendering="crispEdges" role="img" aria-label="${safe}">` +
    `<title>${safe}</title>` +
    `<rect width="${side}" height="${side}" fill="${paper}"/>` +
    `<path transform="translate(${m} ${m})" d="${glyphPath(g)}" fill="${colors.ink}"/>` +
    `</svg>`
  )
}

/** The matrix as hex text, row by row, 4 modules per digit (the last digit of the matrix is padded with light modules): a version-4 glyph is about 280 characters. */
export function packModules(modules: readonly (readonly boolean[])[]): string {
  const bits = modules.flatMap((row) => row.map((m) => (m ? 1 : 0)))
  let out = ''
  for (let i = 0; i < bits.length; i += 4) out += ((bits[i]! << 3) | ((bits[i + 1] ?? 0) << 2) | ((bits[i + 2] ?? 0) << 1) | (bits[i + 3] ?? 0)).toString(16)
  return out
}

/** Inverse of `packModules` for a matrix `size` modules wide. */
export function unpackModules(size: number, hex: string): boolean[][] {
  if (hex.length !== Math.ceil((size * size) / 4) || !/^[0-9a-f]*$/.test(hex)) throw new Error('qr matrix: wrong size or characters')
  const bit = (i: number) => (parseInt(hex[i >> 2]!, 16) >> (3 - (i & 3))) & 1
  return Array.from({ length: size }, (_, y) => Array.from({ length: size }, (_, x) => bit(y * size + x) === 1))
}
