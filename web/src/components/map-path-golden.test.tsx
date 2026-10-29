// @vitest-environment jsdom
/**
 * Golden of the SVG path data the three map islands draw (#140). The path string of a shape is
 * the output of the one `toPath` the islands share; the golden was captured BEFORE the helper
 * existed, on the three private copies, and must stay byte-identical afterwards.
 * City: a small synthetic mesh with two closed rings (first point repeated; the mesh parser rejects open ones).
 * State and Ficaram em casa: the real UF shapes (the same table in both).
 */
import { render, waitFor } from '@testing-library/react'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics } from '@/analytics'
import CityMapMap from './CityMapMap'
import StateMapMap from './StateMapMap'
import StayHomeMap from './StayHomeMap'
import { stayHomeModel } from '@/lib/stay-home-view'
import { UF_SHAPES } from '@/lib/uf-polygons'
import type { CityMapData } from '@/lib/city-map-data'
import type { MunicipalityMesh } from '@/lib/municipality-geo'
import type { StateMapData } from '@/lib/state-map-data'

const MESH: MunicipalityMesh = {
  fonte: 'teste sintético',
  metodo: 'teste sintético',
  uf: 'rj',
  cdUf: '33',
  largura: 10,
  altura: 10,
  formas: {
    // closed ring: the first point comes back at the end
    '3399001': { p: [[0, 0], [4, 0], [8, 0], [8, 4], [8, 8], [4, 8], [0, 8], [0, 0]], c: [4, 4] },
    // a second closed ring with fractional coordinates (the mesh parser rejects open rings, so the City input is always closed)
    '3399002': { p: [[8.5, 8.25], [10, 8.25], [10, 10], [8.5, 10.125], [8.5, 8.25]], c: [9, 9] },
  },
}
const CITY: CityMapData = {
  ano: 2026,
  uf: 'rj',
  ladoANome: 'Maria',
  ladoBNome: 'João',
  ladoANomeCompleto: 'Maria Souza',
  ladoBNomeCompleto: 'João Costa',
  rows: [
    { cdMunicipio: '01', cdIbge: '3399001', nome: 'UM', slug: 'um', validos1: 90, validos2: 100, votosA1: 50, votosB1: 40, votosA2: 60, votosB2: 30, margin1: 10, margin2: 50, swing: 40 },
  ],
}
const ALL = UF_SHAPES.map((s, i) => ({ uf: s.uf, i }))
const STATE: StateMapData = {
  ano: 2026,
  ladoANome: 'Maria',
  ladoBNome: 'João',
  ladoANomeCompleto: 'Maria Souza',
  ladoBNomeCompleto: 'João Costa',
  national: { validos1: 380, validos2: 350, margin1: 30.4, margin2: 21.4, swing: -9 },
  rows: ALL.map(({ uf, i }) => ({ uf, validos1: 100 + i, validos2: 200 + i, margin1: i - 13, margin2: 13 - i, swing: 2 * (i - 13) })),
}
const views = [{ ano: 2026, turno: 1 as const }]
const STAY = stayHomeModel({ view: views[0]!, views, rows: ALL.map(({ uf, i }) => ({ uf, aptos: 1000 + i, naoVotaram: 100 + i, share: 10 + i / 2 })), claim: { cities: 10, greater: 6, tenths: 600 } })

/** Every filled shape path (not the hit targets, not the selection outline), in document order. */
const drawn = (root: ParentNode) => [...root.querySelectorAll('svg a path:not([fill="none"])')].map((p) => p.getAttribute('d')!)
const sha = (ds: string[]) => createHash('sha256').update(ds.join('\n')).digest('hex').slice(0, 16)

afterEach(() => {
  setAnalytics(noopAnalytics)
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('map path golden (#140)', () => {
  it('City map: the closed rings of the synthetic mesh', async () => {
    window.history.replaceState(null, '', '/s/rj/?vista=mapa')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MESH) }))
    render(<CityMapMap base="/s/" geoUrl="/s/geo/municipios-rj.json" ufNome="Rio de Janeiro" semContorno={0} data={CITY} />)
    await waitFor(() => expect(document.querySelector('[data-slot="mapa-municipios"]')).toBeTruthy())
    expect(drawn(document.body)).toEqual(GOLDEN_CITY)
  })

  it.each([
    ['State map', () => render(<StateMapMap kind="margin" data={STATE} base="/s/" />)],
    ['Ficaram em casa map', () => render(<StayHomeMap model={STAY} base="/s/" viewPaths={{ '2026-1': '/mapa/ficaram-em-casa/' }} />)],
  ])('%s: the real UF shapes (rj path in full, all 27 by hash)', (_name, mount) => {
    window.history.replaceState(null, '', '/s/mapa/?vista=mapa')
    mount()
    const ds = drawn(document.querySelector('svg')!)
    expect(ds).toHaveLength(UF_SHAPES.length)
    expect(ds[UF_SHAPES.findIndex((s) => s.uf === 'rj')]).toBe(GOLDEN_RJ)
    expect(sha(ds)).toBe(GOLDEN_HASH)
  })
})

const GOLDEN_CITY = ['M0 0L4 0L8 0L8 4L8 8L4 8L0 8L0 0Z', 'M8.5 8.25L10 8.25L10 10L8.5 10.125L8.5 8.25Z']
const GOLDEN_RJ =
  'M284.43 281.86L282.07 284.75L283.61 286.39L285.43 285.64L283.63 284.74L284.14 283.26L287.28 281.94L287.26 283.02L291.78 281.88L294.87 283.25L297.55 282.87L298.75 281.77L298.24 280L299.94 279.64L299.25 282.25L309.65 282.05L310.21 278.34L313.02 275.72L319.67 272.93L319.04 267.69L320.08 265.73L312.76 263.77L311.23 260.38L308.55 262.46L309.23 263.02L306.59 268.64L307.43 269.86L298.94 273.76L296.96 272.76L292.91 273.35L282.84 276.65L284.36 278.76L289.02 279.45L287.54 281.17L284.43 281.86Z'
const GOLDEN_HASH = '0c9e0488ded0ccbd'
