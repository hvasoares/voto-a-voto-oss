// @vitest-environment jsdom
/**
 * Island behaviour, cheapest layer first (the static HTML is exercised by the e2e suite). A
 * synthetic dataset of one state (uf "rj", three municipalities) plus a synthetic mesh with the
 * three joined shapes and one the dataset does not list: the fixtures pin the interaction, the
 * fetch of the mesh file, the notes and the analytics, never election numbers.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@site/analytics'
import CityMapMap, { type CityMapProps } from './CityMapMap'
import type { CityMapData } from '@/lib/city-map-data'
import type { CityMarginRow } from '@/lib/margins-city'
import type { MunicipalityMesh } from '@/lib/municipality-geo'

const rj = (nome: string, cd: string, ibge: string, slug: string, validos2: number): CityMarginRow => ({
  cdMunicipio: cd,
  cdIbge: ibge,
  nome,
  slug,
  validos1: Math.round(validos2 * 0.9),
  validos2,
  votosA1: Math.round(validos2 * 0.5),
  votosB1: Math.round(validos2 * 0.4),
  votosA2: Math.round(validos2 * 0.6),
  votosB2: Math.round(validos2 * 0.3),
  margin1: 10,
  margin2: 50,
  swing: 40,
})

const ROWS: CityMarginRow[] = [
  rj('RIO DE JANEIRO', '01', '3399001', 'rio-de-janeiro', 200),
  rj('CARMO', '02', '3399002', 'carmo', 60),
  ...(() => {
    const r = rj('PARATY', '03', '3399003', 'paraty', 100)
    return [{ ...r, margin2: null, margin1: null, swing: null, votosA2: 0, votosB2: 0 }]
  })(),
]

const DATA: CityMapData = {
  ano: 2026,
  uf: 'rj',
  ladoANome: 'Maria',
  ladoBNome: 'João',
  ladoANomeCompleto: 'Maria Souza',
  ladoBNomeCompleto: 'João Costa',
  rows: ROWS,
}

/** Rio = the full box; Carmo = a small square SE of it; Paraty = bottom-left; 3399999 = unmatched. */
const MESH: MunicipalityMesh = {
  fonte: 'malhas do IBGE (2026-10-26), teste sintético',
  metodo: 'Douglas-Peucker, teste sintético',
  uf: 'rj',
  cdUf: '33',
  largura: 10,
  altura: 10,
  formas: {
    '3399001': { p: [[0, 0], [4, 0], [8, 0], [8, 4], [8, 8], [4, 8], [0, 8], [0, 0]], c: [4, 4] },
    '3399002': { p: [[8, 8], [8.7, 8], [10, 8], [10, 9], [10, 10], [9, 10], [8, 10], [8, 8]], c: [9, 9] },
    '3399003': { p: [[0, 9], [1, 9], [2, 9], [2, 9.5], [2, 10], [1, 10], [0, 10], [0, 9]], c: [1, 9.5] },
    '3399999': { p: [[4, 9], [5, 9], [6, 9], [6, 9.2], [6, 9.5], [5, 9.5], [4, 9.5], [4, 9]], c: [5, 9.2] },
  },
}

const events: [string, unknown][] = []
let fetchJson: unknown = MESH
let fetchFail = false

function setup(props: Partial<CityMapProps> = {}) {
  const analytics: Analytics = { pageView() {}, event: (n, p) => void events.push([n, p]) }
  setAnalytics(analytics)
  const fetch = vi.fn().mockImplementation(() =>
    fetchFail ? Promise.reject(new TypeError('offline')) : Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(fetchJson) }),
  )
  vi.stubGlobal('fetch', fetch)
  return {
    user: userEvent.setup(),
    fetch,
    ...render(<CityMapMap base="/s/" geoUrl="/s/geo/municipios-rj.json" ufNome="Rio de Janeiro" data={DATA} {...props} />),
  }
}

afterEach(() => {
  cleanup()
  setAnalytics(noopAnalytics)
  events.length = 0
  vi.unstubAllGlobals()
  fetchFail = false
  window.history.replaceState(null, '', '/')
  document.querySelector('astro-island')?.remove()
})

describe('CityMapMap island (lista)', () => {
  it('renders one row per municipality under the base, ordered by round-2 valid votes', () => {
    setup()
    const rows = screen.getByRole('navigation', { name: 'Municípios' }).querySelectorAll('a[data-cd]')
    expect([...rows].map((r) => r.getAttribute('data-cd'))).toEqual(['01', '03', '02'])
    const primeiro = rows[0] as HTMLAnchorElement
    expect(primeiro.getAttribute('href')).toBe('/s/rj/rio-de-janeiro/')
    expect(primeiro.textContent).toContain('Rio de Janeiro')
    expect(primeiro.textContent).toContain('+50,0 pp')
    expect(primeiro.getAttribute('aria-label')).toContain('Maria à frente')
    expect(primeiro.getAttribute('aria-label')).toContain('200 votos válidos')
  })

  it('a city without a round-2 pairing renders without fill and without a value', () => {
    setup()
    const paraty = screen.getByRole('link', { name: /Paraty/ })
    expect(paraty.textContent).toContain('sem dados')
    expect(paraty.querySelector('span[aria-hidden="true"]')!.getAttribute('style')).toContain('var(--muted)')
    expect(paraty.getAttribute('aria-label')).toContain('sem dados do 2º turno')
  })

  it('selects the city with most round-2 valid votes by default and shows its details', () => {
    setup()
    const panel = document.querySelector('[data-slot="mapa-selecionado"]') as HTMLElement
    expect(panel.textContent).toContain('Rio de Janeiro · selecionado')
    expect(panel.textContent).toContain('+50,0 pp')
    expect(panel.textContent).toContain('Votos válidos (2º turno): 200')
    expect(panel.textContent).toContain('Margem (Maria Souza − João Costa): +50,0 pp')
    expect(panel.textContent).toContain('Na eleição anterior: +10,0 pp. Variação: +40,0 pp.')
    expect((screen.getByRole('link', { name: 'Abrir cidade' }) as HTMLAnchorElement).getAttribute('href')).toBe('/s/rj/rio-de-janeiro/')
  })

  it('the legend carries the numeric bin edges and the count of the cities without a pairing', () => {
    setup()
    const esc = document.querySelector('[data-slot="mapa-escala"]') as HTMLElement
    expect(esc.textContent).toContain('-30')
    expect(esc.textContent).toContain('+30')
    expect(esc.textContent).toContain('Sem cor: 1 município sem dados do 2º turno.')
  })

  it('a hydrated tap selects the city and fires map_municipio_tap, staying on the page', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('link', { name: /Carmo/ }))
    const panel = document.querySelector('[data-slot="mapa-selecionado"]') as HTMLElement
    expect(panel.textContent).toContain('Carmo · selecionado')
    expect(events).toContainEqual(['map_municipio_tap', { cd: '02' }])
    expect((screen.getByRole('link', { name: 'Abrir cidade' }) as HTMLAnchorElement).getAttribute('href')).toBe('/s/rj/carmo/')
  })
})

describe('CityMapMap island (mapa)', () => {
  it('switches to the map view, fetches the mesh once and fires map_view (?vista=mapa in the URL)', async () => {
    const { user, fetch } = setup()
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    await waitFor(() => expect(document.querySelector('[data-slot="mapa-municipios"]')).toBeTruthy())
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch).toHaveBeenCalledWith('/s/geo/municipios-rj.json', expect.objectContaining({ signal: expect.anything() }))
    expect(events).toContainEqual(['map_view', { view: 'mapa' }])
    expect(window.location.search).toContain('vista=mapa')
    // back to the list: the URL drops the parameter and no second fetch happens
    await user.click(screen.getByRole('link', { name: 'Lista' }))
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(window.location.search).not.toContain('vista=mapa')
  })

  it('draws every mesh shape, colouring the joined ones and counting the unmatched in the note', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    const map = await waitFor(() => {
      const el = document.querySelector('[data-slot="mapa-municipios"]')!
      expect(el.querySelectorAll('a[data-cd-ibge]')).toHaveLength(4)
      return el
    })
    // four shapes plus the selection outline of the default selection (Rio, most valid votes)
    expect(map.querySelectorAll('path')).toHaveLength(5)
    expect((map.querySelector('a[data-cd-ibge="3399001"]') as SVGElement).getAttribute('data-cd')).toBe('01')
    expect(map.querySelector('a[data-cd-ibge="3399999"]')).toBeTruthy()
    const note = map.querySelector('[data-slot="malha-sem-dados"]') as HTMLElement
    expect(note.textContent).toContain('1 dos municípios do arquivo de fronteiras não têm dados')
    expect(note.textContent).toContain('ficam em cinza')
  })

  it('a tap on a shape selects the municipality without navigating', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    await waitFor(() => expect(document.querySelector('[data-slot="mapa-municipios"]')).toBeTruthy())
    const shape = document.querySelector('a[data-cd-ibge="3399002"]') as unknown as HTMLElement
    await user.click(shape)
    const panel = document.querySelector('[data-slot="mapa-selecionado"]') as HTMLElement
    expect(panel.textContent).toContain('Carmo · selecionado')
    expect(events).toContainEqual(['map_municipio_tap', { cd: '02' }])
  })

  it('when the mesh file fails, the note tells the visitor and the list stays', async () => {
    fetchFail = true
    const { user } = setup()
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    const note = await waitFor(() => screen.getByText(/O arquivo da malha do estado não carregou/))
    expect(note.textContent).toContain('A lista acima continua funcionando.')
    // the panel and the legend keep working: only the map drawing is gone
    expect(document.querySelector('[data-slot="mapa-selecionado"]')).toBeTruthy()
    expect(document.querySelector('[data-slot="mapa-escala"]')).toBeTruthy()
  })
})

describe('CityMapMap island (pre-hydration tap and deep link)', () => {
  it('honours data-pending-cd left by the page script: the tap is never lost', () => {
    const island = document.createElement('astro-island') as HTMLElement
    island.setAttribute('data-pending-cd', '03')
    document.body.appendChild(island)
    render(
      <CityMapMap base="/s/" geoUrl="/s/geo/municipios-rj.json" ufNome="Rio de Janeiro" data={DATA} />,
      { container: island },
    )
    const panel = island.querySelector('[data-slot="mapa-selecionado"]') as HTMLElement
    expect(panel.textContent).toContain('Paraty · sem dados')
  })

  it('starts in the map view when the URL asks for it (?vista=mapa)', async () => {
    window.history.replaceState(null, '', '/s/rj/?vista=mapa')
    const { fetch } = setup()
    await waitFor(() => expect(fetch).toHaveBeenCalled())
    expect(document.querySelector('[data-slot="mapa-municipios"]')).toBeTruthy()
  })
})