import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMunicipalityMesh, meshShapes, type MunicipalityMesh } from './municipality-geo'
import { parseCities } from '@site/data/csv'

/**
 * The committed mesh file of the RJ municipalities (the data half of ticket #16): structural checks,
 * provenance and the join to the real dataset (cities.csv carries the 7-digit IBGE code): every
 * polygon joins a city and every city joins a polygon -- no unmatched side, ever.
 */
const meshFile = resolve(import.meta.dirname, '../../public/geo/municipios-rj.json')

describe('public/geo/municipios-rj.json (committed geometry, IBGE malhas, ticket #16)', () => {
  const mesh = JSON.parse(readFileSync(meshFile, 'utf8')) as MunicipalityMesh
  const parsed = parseMunicipalityMesh(mesh)
  const shapes = meshShapes(parsed)

  it('carries the provenance of the generation (source, date, method) in the artifact', () => {
    expect(parsed.fonte).toContain('IBGE')
    expect(parsed.fonte).toContain('2026-10-26')
    expect(parsed.metodo).toContain('Douglas-Peucker')
    expect(parsed.uf).toBe('rj')
    expect(parsed.cdUf).toBe('33')
  })

  it('has exactly the 92 municipalities of RJ, once each, keyed by 7-digit IBGE code', () => {
    expect(shapes).toHaveLength(92)
    expect(new Set(shapes.map((s) => s.codarea)).size).toBe(92)
  })

  it('joins the real dataset with no unmatched polygons and no unmatched cities', () => {
    const cities = parseCities(readFileSync(resolve(import.meta.dirname, '../../../data/cities.csv'), 'utf8')).filter((c) => c.uf === 'rj')
    expect(cities).toHaveLength(92)
    expect(new Set(cities.map((c) => c.cdIbge))).toEqual(new Set(shapes.map((s) => s.codarea)))
  })

  it('fits its declared viewBox with positive coordinates; rings closed and long enough to draw', () => {
    for (const s of shapes) {
      expect(s.pts.length, s.codarea).toBeGreaterThanOrEqual(7)
      expect(s.pts[0]!.join(','), s.codarea).toBe(s.pts[s.pts.length - 1]!.join(','))
      for (const [x, y] of s.pts) {
        expect(x, `${s.codarea} x`).toBeGreaterThanOrEqual(0)
        expect(x, `${s.codarea} x`).toBeLessThanOrEqual(parsed.largura)
        expect(y, `${s.codarea} y`).toBeGreaterThanOrEqual(0)
        expect(y, `${s.codarea} y`).toBeLessThanOrEqual(parsed.altura)
      }
    }
  })

  it('keeps the centroid of every municipality inside its own bbox (label anchors valid)', () => {
    for (const s of shapes) {
      const xs = s.pts.map((p) => p[0])
      const ys = s.pts.map((p) => p[1])
      expect(s.cx, s.codarea).toBeGreaterThanOrEqual(Math.min(...xs) - 0.05)
      expect(s.cx, s.codarea).toBeLessThanOrEqual(Math.max(...xs) + 0.05)
      expect(s.cy, s.codarea).toBeGreaterThanOrEqual(Math.min(...ys) - 0.05)
      expect(s.cy, s.codarea).toBeLessThanOrEqual(Math.max(...ys) + 0.05)
    }
  })

  it('pins the relative geography of the fixtures the page opens with (north on top, capital south-east)', () => {
    // Paraty (3303807) sits at the SW corner; Natividade (3303104) is in the far northwest.
    const byCd = new Map(shapes.map((s) => [s.codarea, s]))
    expect(byCd.get('3303807')!.cy).toBeGreaterThan(byCd.get('3304557')!.cy) // Paraty below Rio
    expect(byCd.get('3303104')!.cy).toBeLessThan(byCd.get('3304557')!.cy) // Natividade above Rio
    // Campos dos Goytacazes is the big northeast piece.
    expect(byCd.get('3301009')!.cx).toBeGreaterThan(byCd.get('3304557')!.cx)
  })

  it('rejects a broken mesh file (bad ring, bad code, wrong provenance)', () => {
    const good = structuredClone(mesh)
    expect(() => parseMunicipalityMesh({ ...good, formas: { ...good.formas, '3304557': { p: [[0, 0]], c: [0, 0] } } })).toThrow(/anel/)
    expect(() => parseMunicipalityMesh({ ...good, cdUf: 33 })).toThrow(/cdUf/)
    expect(() => parseMunicipalityMesh({ ...good, largura: 0 })).toThrow(/largura/)
    expect(() => parseMunicipalityMesh(null)).toThrow()
  })
})