/**
 * The QR glyph of the Mostrar QR screen and printable poster (ticket #9), PURE: the module matrix and the
 * serialized `<svg>`. No DOM, no fetch, no state. This is the ENCODER half and runs at build time only: the matrix it returns is packed into
 * the city's data file (`integrations/qr-pages.ts`) and the browser draws it with the encoder-free `qr-glyph.ts` (private#208), which this file re-exports.
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
import { glyphSvg, glyphPath, QR_QUIET_ZONE, type QrGlyph, type QrSvgOptions } from './qr-glyph'

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

export { glyphPath, glyphSvg, QR_QUIET_ZONE, type QrGlyph, type QrSvgOptions }
