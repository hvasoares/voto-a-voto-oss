/**
 * The QR glyph of the Mostrar QR screen and printable poster (ticket #9), PURE: the module matrix and the
 * serialized `<svg>`. No DOM, no fetch, no state — the same function runs in Node at build time (the page is
 * pre-rendered; nothing in the browser parses data or draws the QR again).
 *
 * - Encoder: `src/lib/vendor/qrcodegen.ts`, a vendored copy of Nayuki's MIT QR Code generator (no runtime
 *   dependency, no network; the file documents where it came from). `qrGlyph` encodes the text in byte mode at
 *   error correction "M" (scan-tolerant, smallest version; the library picks the smallest version that fits).
 * - The content is the city's full address, exactly what the recipient taps (the share card and the message
 *   share the same value through share-url/share-text; the QR screen shows the short one for reading).
 * - `qrSvg` draws every dark module as one subpath of a single `<path>`, crisp edges, with an ISO quiet zone
 *   (default 4 modules) and the token colours only (ink on paper): legible printed in black and white, no
 *   colour-only encoding anywhere.
 * - Determinism: same text -> same segments -> same mask choice -> same matrix; the tests pin the matrix by
 *   sha-256 and round the glyph through a decoder (jsQR, dev dependency) to assert it scans back to the text.
 */
import { qrcodegen } from './vendor/qrcodegen'
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

/** Error correction "M": recovers up to ~15% damage. Same level for screen and poster (one glyph, one content). */
const ECC = qrcodegen.QrCode.Ecc.MEDIUM

/** The matrix of dark modules for `text`; throws when the text is too long for even version 40. */
export function qrGlyph(text: string): QrGlyph {
  const qr = qrcodegen.QrCode.encodeText(text, ECC)
  const modules: boolean[][] = []
  for (let y = 0; y < qr.size; y++) {
    const row: boolean[] = []
    for (let x = 0; x < qr.size; x++) row.push(qr.getModule(x, y))
    modules.push(row)
  }
  return { text, version: qr.version, size: qr.size, modules }
}

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