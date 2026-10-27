import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseMunicipalityMesh, meshShapes, type MunicipalityMesh } from './municipality-geo'
import { parseCities } from '@/data/csv'
import { semContornoOf } from './city-map-data'
import type { CityMarginRow } from './margins-city'

const emptyRow = (): CityMarginRow => ({
  cdMunicipio: '', cdIbge: '', nome: '', slug: '', validos1: 0, validos2: 0,
  votosA1: 0, votosB1: 0, votosA2: 0, votosB2: 0, margin1: null, margin2: null, swing: null,
})
import { IBGE_CODE, meshOutput } from '../../scripts/generate-municipality-polygons'

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

/*
 * The 27 state meshes (ticket #17): the committed mesh files ARE the manifest the acceptance
 * speaks of (the geo files are static assets, not shards, so they stay out of the dataset's
 * manifest.json -- this suite is instead the checked listing). Every file is parsed, budgeted and
 * joined to the dataset. Sizes measured with the October 2026 generation; the budget leaves ~1.3x
 * headroom over the largest measured file (MG) -- the meshes are fetched on demand, one per map
 * view, the same one-asset-per-view rule as the shard budgets of web/docs/shards.md.
 */
const GEO_DIR = resolve(import.meta.dirname, '../../public/geo')
const REAL_CITIES = readFileSync(resolve(import.meta.dirname, '../../../data/cities.csv'), 'utf8')
const BUDGET_RAW = 400 * 1024
const BUDGET_GZIP = 120 * 1024

const meshFiles = readdirSync(GEO_DIR)
  .filter((f) => /^municipios-[a-z]{2}\.json$/.test(f))
  .sort()

const meshes = new Map<string, MunicipalityMesh>(
  meshFiles.map((f) => {
    const json = JSON.parse(readFileSync(resolve(GEO_DIR, f), 'utf8')) as MunicipalityMesh
    return [json.uf as string, json] as const
  }),
)

/** The dataset's 7-digit IBGE codes per UF (the join side), overseas excluded. */
const ibgePerUf = new Map<string, Set<string>>()
for (const c of parseCities(REAL_CITIES)) {
  if (c.uf === 'zz') continue
  const set = ibgePerUf.get(c.uf) ?? new Set()
  set.add(c.cdIbge)
  ibgePerUf.set(c.uf, set)
}

describe('public/geo/municipios-<uf>.json, all 27 states (ticket #17)', () => {
  it('has exactly one committed mesh per state of the dataset (the checked manifest)', () => {
    expect(meshFiles).toHaveLength(27)
    expect(new Set([...meshes.keys()])).toEqual(new Set(Object.keys(IBGE_CODE)))
  })

  it('every file parses and carries its provenance (source, download date, method, tolerance)', () => {
    for (const [uf, json] of meshes) {
      const parsed = parseMunicipalityMesh(json)
      expect(parsed.uf, uf).toBe(uf)
      expect(parsed.cdUf, uf).toBe(IBGE_CODE[uf])
      expect(parsed.fonte, uf).toContain('IBGE "malhas" API v3')
      expect(parsed.fonte, uf).toMatch(/downloaded 2026-10-\d{2}/)
      expect(parsed.metodo, uf).toContain('Douglas-Peucker')
      expect(parsed.largura, uf).toBeGreaterThan(0)
      expect(parsed.altura, uf).toBeGreaterThan(0)
      // per-state tolerance: the default 0.008 (#16), or the documented large-state value (issue-17.md)
      const tolerance = Number(/Douglas-Peucker at ([\d.]+) degrees/.exec(parsed.metodo)![1])
      expect(tolerance, `${uf} tolerance`).toBe(uf === 'mg' ? 0.012 : 0.008)
    }
  })

  it('stays within the size budget (largest: MG, 297 kB raw / 110 kB gzip, October 2026)', () => {
    let worst = { uf: '', raw: 0, gzip: 0 }
    for (const uf of meshes.keys()) {
      const bytes = readFileSync(resolve(GEO_DIR, `municipios-${uf}.json`))
      const raw = bytes.length
      const gzip = gzipSync(bytes).length
      if (raw > worst.raw) worst = { uf, raw, gzip }
      expect(raw, `municipios-${uf}.json raw`).toBeLessThanOrEqual(BUDGET_RAW)
      expect(gzip, `municipios-${uf}.json gzip`).toBeLessThanOrEqual(BUDGET_GZIP)
    }
    // the recorded largest mesh is still the largest (issue-17.md pins the measurement)
    expect(worst.uf).toBe('mg')
    expect(worst.raw).toBe(304_400)
  })

  it('every dataset municipality joins its mesh, except the documented post-mesh municipality', () => {
    expect([...ibgePerUf.keys()]).toEqual([...meshes.keys()])
    for (const [uf, wanted] of ibgePerUf) {
      const have = new Set(Object.keys(meshes.get(uf)!.formas))
      const missing = [...wanted].filter((cd) => !have.has(cd))
      const extra = [...have].filter((cd) => !wanted.has(cd))
      // The only deliberate mismatch: MT's Boa Esperança do Norte (TSE 73709, IBGE 5101837), a
      // 2026-only municipality the current IBGE mesh does not draw yet -- noted in the UI.
      expect(missing, `${uf}: municipalities without a mesh shape`).toEqual(uf === 'mt' ? ['5101837'] : [])
      expect(extra, `${uf}: mesh shapes without a dataset row`).toEqual([])
    }
  })

  it('semContornoOf (the build-time prop the pages pass) agrees with the join: 0 everywhere but MT', () => {
    for (const [uf, wanted] of ibgePerUf) {
      const rows = [...wanted].map((cdIbge) => ({ ...emptyRow(), cdIbge }))
      expect(semContornoOf(uf, rows), `${uf} sem contorno`).toBe(uf === 'mt' ? 1 : 0)
    }
    // a state whose mesh is missing entirely falls back to "every row is list-only" (no map page is built for it)
    expect(semContornoOf('xx', [{ ...emptyRow(), cdIbge: '9900100' }])).toBe(1)
  })

  it('every ring of every shape is closed, long enough to draw, and inside the declared viewBox', () => {
    for (const [uf, json] of meshes) {
      const parsed = parseMunicipalityMesh(json)
      for (const s of meshShapes(parsed)) {
        expect(s.pts.length, `${uf} ${s.codarea}`).toBeGreaterThanOrEqual(5)
        expect(s.pts[0]!.join(','), `${uf} ${s.codarea}`).toBe(s.pts[s.pts.length - 1]!.join(','))
        for (const [x, y] of s.pts) {
          expect(x, `${uf} ${s.codarea} x`).toBeGreaterThanOrEqual(0)
          expect(x, `${uf} ${s.codarea} x`).toBeLessThanOrEqual(parsed.largura)
          expect(y, `${uf} ${s.codarea} y`).toBeGreaterThanOrEqual(0)
          expect(y, `${uf} ${s.codarea} y`).toBeLessThanOrEqual(parsed.altura)
        }
      }
    }
  })
})

/** Determinism of the generator core: same mesh in, byte-identical output out (vitest pins it). */
describe('scripts/generate-municipality-polygons (meshOutput, ticket #17)', () => {
  const SYNTHETIC = {
    features: [
      { properties: { codarea: '5399901' }, geometry: { type: 'Polygon', coordinates: [[[-47.9, -15.7], [-47.8, -15.7], [-47.8, -15.8], [-47.9, -15.8], [-47.9, -15.7]]] } },
      { properties: { codarea: '5399902' }, geometry: { type: 'MultiPolygon', coordinates: [[[[-48.0, -15.6], [-47.7, -15.6], [-47.7, -15.9], [-48.0, -15.9], [-48.0, -15.6]]], [[[-47.5, -15.5], [-47.4, -15.5], [-47.4, -15.6], [-47.5, -15.6], [-47.5, -15.5]]]] } },
    ],
  }

  it('two runs over the same input produce the identical object (the same file bytes)', () => {
    const a = meshOutput(SYNTHETIC, { uf: 'df', cdUf: '53', tolerance: 0.008, downloaded: '2026-10-27' })
    const b = meshOutput(SYNTHETIC, { uf: 'df', cdUf: '53', tolerance: 0.008, downloaded: '2026-10-27' })
    expect(b).toEqual(a)
    expect(JSON.stringify(b)).toBe(JSON.stringify(a))
    // largest ring only: the second feature keeps the big ring, drops the island
    expect(Object.keys(a.formas).sort()).toEqual(['5399901', '5399902'])
    expect(a.formas['5399902']!.p.length).toBeLessThanOrEqual(5)
    expect(a.fonte).toContain('/malhas/estados/53?')
    expect(a.fonte).toContain('downloaded 2026-10-27')
  })

  it('the committed files keep the exact file shape the generator writes (trailing newline)', () => {
    // The byte-identity proof is the manual cmp run recorded in web/docs/checkpoints/issue-17.md
    // (the test cannot re-download the 27 meshes); here the written file format is pinned instead.
    const raw = readFileSync(meshFile, 'utf8')
    expect(existsSync(meshFile)).toBe(true)
    expect(raw.endsWith('\n')).toBe(true)
    expect(raw.startsWith('{"fonte"')).toBe(true)
  })
})