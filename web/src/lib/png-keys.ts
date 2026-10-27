/**
 * The keys of a card inside its PNG (#38), PURE over bytes: one `tEXt` chunk named `voto-a-voto` right after the header,
 * holding JSON with the keys (`card-keys.ts`) and `check`, a digest of what the card said when it was made.
 *
 * Chat apps re-encode pictures and usually drop this chunk; that is expected. What always survives is what is printed on the
 * picture, the short address. A PNG that still has the chunk reopens the card exactly like the SVG; one that does not says so.
 */
import { keysProblem, type CardKeys } from './card-keys'

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
export const PNG_KEY_CHUNK = 'voto-a-voto'

export interface PngPayload extends CardKeys {
  check: string
}

let table: Uint32Array | undefined
function crc32(bytes: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const b of bytes) crc = table[(crc ^ b) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const isPng = (b: Uint8Array) => SIGNATURE.every((v, i) => b[i] === v)
const u32 = (b: Uint8Array, at: number) => ((b[at]! << 24) | (b[at + 1]! << 16) | (b[at + 2]! << 8) | b[at + 3]!) >>> 0

/** `png` with the chunk added after IHDR (any chunk of ours already there is replaced). Throws when `png` is not a PNG. */
export function embedPngKeys(png: Uint8Array, payload: PngPayload): Uint8Array {
  if (!isPng(png)) throw new Error('not a PNG')
  const body = new TextEncoder().encode(`${PNG_KEY_CHUNK}\0${JSON.stringify(payload)}`)
  const chunk = new Uint8Array(12 + body.length)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, body.length)
  chunk.set([0x74, 0x45, 0x58, 0x74], 4) // "tEXt"
  chunk.set(body, 8)
  view.setUint32(8 + body.length, crc32(chunk.subarray(4, 8 + body.length)))
  const ihdrEnd = 8 + 12 + u32(png, 8)
  const rest = stripChunk(png.subarray(ihdrEnd))
  const out = new Uint8Array(ihdrEnd + chunk.length + rest.length)
  out.set(png.subarray(0, ihdrEnd))
  out.set(chunk, ihdrEnd)
  out.set(rest, ihdrEnd + chunk.length)
  return out
}

function* chunks(bytes: Uint8Array, from: number): Generator<{ type: string; start: number; end: number; data: Uint8Array }> {
  let at = from
  while (at + 12 <= bytes.length) {
    const length = u32(bytes, at)
    const end = at + 12 + length
    if (end > bytes.length) return
    yield { type: String.fromCharCode(...bytes.subarray(at + 4, at + 8)), start: at, end, data: bytes.subarray(at + 8, at + 8 + length) }
    at = end
  }
}

function stripChunk(rest: Uint8Array): Uint8Array {
  const keep: Uint8Array[] = []
  for (const c of chunks(rest, 0)) if (!(c.type === 'tEXt' && startsWithKeyword(c.data))) keep.push(rest.subarray(c.start, c.end))
  const out = new Uint8Array(keep.reduce((n, k) => n + k.length, 0))
  let at = 0
  for (const k of keep) (out.set(k, at), (at += k.length))
  return out
}
const startsWithKeyword = (data: Uint8Array) => new TextDecoder().decode(data.subarray(0, PNG_KEY_CHUNK.length + 1)) === `${PNG_KEY_CHUNK}\0`

export type ReadPng = { ok: true; payload: PngPayload } | { ok: false; reason: 'not-png' | 'no-keys' | 'bad-keys' }

/** The keys chunk of a PNG; never throws on a damaged file. */
export function readPngKeys(png: Uint8Array): ReadPng {
  if (!isPng(png)) return { ok: false, reason: 'not-png' }
  for (const c of chunks(png, 8)) {
    if (c.type !== 'tEXt' || !startsWithKeyword(c.data)) continue
    try {
      const payload = JSON.parse(new TextDecoder().decode(c.data.subarray(PNG_KEY_CHUNK.length + 1))) as PngPayload
      return keysProblem(payload) === undefined && typeof payload.check === 'string' && /^[0-9a-f]{16}$/.test(payload.check) ? { ok: true, payload } : { ok: false, reason: 'bad-keys' }
    } catch {
      return { ok: false, reason: 'bad-keys' }
    }
  }
  return { ok: false, reason: 'no-keys' }
}
