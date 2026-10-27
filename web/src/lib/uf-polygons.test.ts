import { describe, expect, it } from 'vitest'
import { CALLOUT_LEFT, CALLOUT_RIGHT, MAP_HEIGHT, MAP_WIDTH, UF_SHAPES } from './uf-polygons'

describe('uf-polygons (committed geometry fixture of ticket #11)', () => {
  it('has exactly the 27 federative units, once each, no overseas code', () => {
    const ufs = UF_SHAPES.map((s) => s.uf)
    expect(ufs).toHaveLength(27)
    expect(new Set(ufs).size).toBe(27)
    expect(ufs).not.toContain('zz')
    expect(new Set(ufs)).toEqual(new Set(['ac', 'al', 'am', 'ap', 'ba', 'ce', 'df', 'es', 'go', 'ma', 'mg', 'ms', 'mt', 'pa', 'pb', 'pe', 'pi', 'pr', 'rj', 'rn', 'ro', 'rr', 'rs', 'sc', 'se', 'sp', 'to']))
  })

  it('stays inside the declared viewBox with positive coordinates, each ring closed', () => {
    for (const s of UF_SHAPES) {
      expect(s.pts.length, s.uf).toBeGreaterThanOrEqual(6) // even the smallest (df) keeps its shape
      expect(s.pts[0]![0], s.uf).toEqual(s.pts[s.pts.length - 1]![0])
      expect(s.pts[0]![1], s.uf).toEqual(s.pts[s.pts.length - 1]![1])
      for (const [x, y] of s.pts) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(MAP_WIDTH)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(MAP_HEIGHT)
      }
    }
  })

  it('pins the relative geography of the tiles the frames label first (north on top, RS at the bottom)', () => {
    const byUf = new Map(UF_SHAPES.map((s) => [s.uf, s]))
    expect(byUf.get('rr')!.cy).toBeLessThan(byUf.get('am')!.cy) // north on top
    expect(byUf.get('pa')!.cy).toBeLessThan(byUf.get('mt')!.cy)
    expect(byUf.get('rs')!.cy).toBeGreaterThan(byUf.get('sc')!.cy) // RS at the bottom
    expect(byUf.get('sp')!.cx).toBeGreaterThan(byUf.get('mt')!.cx) // coast to the east
    expect(byUf.get('ac')!.cx).toBeLessThan(byUf.get('am')!.cx) // far west
  })

  it('labels the small and narrow UFs outside the map (callouts), the rest inline', () => {
    for (const uf of [...CALLOUT_LEFT, ...CALLOUT_RIGHT]) {
      const shape = UF_SHAPES.find((s) => s.uf === uf)
      expect(shape, uf).toBeDefined()
      // Their projected extents are small relative to the map: labels would not fit inside.
      expect(shape!.w, `${uf} width`).toBeLessThan(MAP_WIDTH / 3)
    }
    const inline = UF_SHAPES.filter((s) => !CALLOUT_RIGHT.includes(s.uf) && !CALLOUT_LEFT.includes(s.uf)).map((s) => s.uf)
    expect(inline).toEqual(expect.arrayContaining(['am', 'pa', 'ba', 'mt', 'sp', 'mg']))
  })

  it('keeps the centroid of every state inside its own bbox (label anchors valid)', () => {
    for (const s of UF_SHAPES) {
      const xs = s.pts.map((p) => p[0])
      const ys = s.pts.map((p) => p[1])
      expect(s.cx, s.uf).toBeGreaterThanOrEqual(Math.min(...xs) - 0.05)
      expect(s.cx, s.uf).toBeLessThanOrEqual(Math.max(...xs) + 0.05)
      expect(s.cy, s.uf).toBeGreaterThanOrEqual(Math.min(...ys) - 0.05)
      expect(s.cy, s.uf).toBeLessThanOrEqual(Math.max(...ys) + 0.05)
    }
  })
})