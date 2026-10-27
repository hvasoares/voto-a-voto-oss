/**
 * Tests of the QR glyph (ticket #9). The content is pinned the way a phone reads it: the matrix renders to
 * pixels and a decoder (jsQR, dev dependency only) round-trips it back to the exact city URL. Structure and
 * geometry are pinned by sha-256 so no encoder update can silently change what the glyph encodes.
 */
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import jsQR from 'jsqr'
import { cityUrl, DEFAULT_SITE_ORIGIN } from './share-url'
import { shortAddress } from './share-text'
import { glyphPath, glyphSvg, QR_QUIET_ZONE, qrGlyph } from './qr-code'

const URL = cityUrl(DEFAULT_SITE_ORIGIN, '/', 'rj', 'cidade-exemplo')
const ADDRESS = shortAddress(URL)

const sha = (s: string) => createHash('sha256').update(s).digest('hex')
const bits = (g: ReturnType<typeof qrGlyph>) => {
  let s = ''
  for (const row of g.modules) for (const m of row) s += m ? '1' : '0'
  return s
}

/** Renders the glyph into an RGBA buffer a decoder reads (scale 8, quiet zone included), like a phone photo. */
function render(g: ReturnType<typeof qrGlyph>, scale = 8) {
  const dim = (g.size + QR_QUIET_ZONE * 2) * scale
  const data = new Uint8ClampedArray(dim * dim * 4)
  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const row = Math.floor(y / scale) - QR_QUIET_ZONE
      const col = Math.floor(x / scale) - QR_QUIET_ZONE
      const dark = row < 0 || col < 0 || row >= g.size || col >= g.size ? false : g.modules[row]![col]!
      const i = (y * dim + x) * 4
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 255
      if (!dark) data[i] = data[i + 1] = data[i + 2] = 255
    }
  }
  return { data, dim }
}

describe('qrGlyph: the encoded content', () => {
  it('encodes the fixture city address at error correction M (version 4, 33 modules)', () => {
    const g = qrGlyph(URL)
    expect(g.text).toBe('https://votoavoto.exemplo.br/rj/cidade-exemplo/')
    expect(ADDRESS).toBe('votoavoto.exemplo.br/rj/cidade-exemplo')
    expect(g.version).toBe(4)
    expect(g.size).toBe(33)
  })

  it('is deterministic: same text, same matrix (pinned sha-256 of the bit matrix, and of the drawing path)', () => {
    expect(sha(bits(qrGlyph(URL)))).toBe('5aa9b9810380d8bd7e828d8c2783a37ade31a83b08b5a0721f918af1d4dfd1ca')
    expect(sha(glyphPath(qrGlyph(URL)))).toBe('0c2b43cc16eeac3f1802e5af7d4eb562b11bc0ea3311de4764dff321daddff38')
  })

  it('scans back to the exact city URL (the ticket acceptance test, automated with a decoder)', () => {
    const { data, dim } = render(qrGlyph(URL))
    expect(jsQR(data, dim, dim)?.data).toBe('https://votoavoto.exemplo.br/rj/cidade-exemplo/')
  })

  it('scans a URL with a base path too (project-pages build, SITE_BASE=/voto-a-voto/)', () => {
    const url = cityUrl(DEFAULT_SITE_ORIGIN, '/voto-a-voto/', 'rj', 'cidade-exemplo')
    const { data, dim } = render(qrGlyph(url))
    expect(jsQR(data, dim, dim)?.data).toBe(url)
  })

  it('scans a different city differently (sp/sao-paulo, version 3, its own pinned matrix)', () => {
    const url = cityUrl(DEFAULT_SITE_ORIGIN, '/', 'sp', 'sao-paulo')
    const g = qrGlyph(url)
    expect(g.version).toBe(3)
    expect(sha(bits(g))).toBe('e091e54a9063c134765c98323497e783bd8a93fbffc0e705582ec730f22682b4')
    const { data, dim } = render(g)
    expect(jsQR(data, dim, dim)?.data).toBe(url)
  })

  it('throws on a text no QR can encode, never silently truncates', () => {
    expect(() => qrGlyph('https://votoavoto.exemplo.br/' + 'a'.repeat(5000) + '/')).toThrowError()
  })
})

describe('qrGlyph: QR structure invariants (independent of the vendored encoder)', () => {
  const dark = (g: ReturnType<typeof qrGlyph>, x: number, y: number) => g.modules[y]![x]!
  const corners: [number, number][] = [[0, 0], [qrGlyph(URL).size - 7, 0], [0, qrGlyph(URL).size - 7]]

  it('has the three finder patterns (dark ring, light ring, dark 3x3 centre) in the corners', () => {
    const g = qrGlyph(URL)
    for (const [fx, fy] of corners) {
      const wrong: unknown[] = []
      for (let i = 0; i < 7; i++) {
        for (let j = 0; j < 7; j++) {
          const want = i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)
          if (dark(g, fx + i, fy + j) !== want) wrong.push({ x: fx + i, y: fy + j, got: dark(g, fx + i, fy + j), want })
        }
      }
      expect(wrong, `finder at ${fx},${fy}`).toEqual([])
    }
  })

  it('separators around every finder are light (module 8 beside the finder, row and column 6)', () => {
    const g = qrGlyph(URL)
    for (const [fx, fy] of corners) {
      const wrong: unknown[] = []
      for (let k = -1; k <= 7; k++) {
        for (const [x, y] of [[fx + k, fy - 1], [fx + k, fy + 7], [fx - 1, fy + k], [fx + 7, fy + k]] as [number, number][]) {
          if (x >= 0 && y >= 0 && x < g.size && y < g.size && dark(g, x, y)) wrong.push({ x, y })
        }
      }
      expect(wrong, `belt of finder at ${fx},${fy}`).toEqual([])
    }
  })

  it('has an alternating timing pattern on row 6 and column 6', () => {
    const g = qrGlyph(URL)
    for (let i = 8; i < g.size - 8; i++) {
      expect(dark(g, i, 6), `column ${i}`).toBe(i % 2 === 0)
      expect(dark(g, 6, i), `row ${i}`).toBe(i % 2 === 0)
    }
  })

  it('the matrix carries no quiet zone (the drawing adds it)', () => {
    const g = qrGlyph(URL)
    expect(g.size).toBe(g.version * 4 + 17)
    expect(glyphPath(g)).toMatch(/^M\d+ \d+h1v1h-1z/)
  })
})

describe('glyphSvg: the drawing the page and the poster embed', () => {
  it('is the pinned drawing: crispEdges, viewBox includes the quiet zone, the path verbatim', () => {
    const g = qrGlyph(URL)
    const svg = glyphSvg(g)
    expect(svg).toContain(`viewBox="0 0 ${g.size + QR_QUIET_ZONE * 2} ${g.size + QR_QUIET_ZONE * 2}"`)
    expect(sha(svg)).toBe('68d23a84f2ae1289106b6edf3af5d36bec1bca7180e12ce364074d24cbe6de26')
    expect(svg).toContain(`transform="translate(${QR_QUIET_ZONE} ${QR_QUIET_ZONE})"`)
    expect(svg).not.toContain('<image')
  })

  it('uses the token colours only, ink on paper: legible printed in black and white, no colour-only encoding', () => {
    const svg = glyphSvg(qrGlyph(URL))
    expect(svg).toContain('fill="#1c1b18"') // v2/ink, the only dark fill
    expect(svg).toContain('fill="#faf7f0"') // v2/paper, the only background
    expect(svg).not.toContain('opacity')
  })

  it('takes an overridden light fill (the /qr/ card draws #ffffff, the white card of the frame)', () => {
    const svg = glyphSvg(qrGlyph(URL), { paper: '#ffffff' })
    expect(svg).toContain('fill="#ffffff"')
    expect(svg).not.toContain('fill="#faf7f0"')
  })

  it('names the glyph for screen readers (the address it opens, not just "QR")', () => {
    const svg = glyphSvg(qrGlyph(URL))
    expect(svg).toContain('aria-label="QR de https://votoavoto.exemplo.br/rj/cidade-exemplo/"')
    expect(svg).toContain('<title>QR de https://votoavoto.exemplo.br/rj/cidade-exemplo/</title>')
  })
})