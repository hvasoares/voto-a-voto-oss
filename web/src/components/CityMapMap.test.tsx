// @vitest-environment jsdom
/**
 * Island behaviour, cheapest layer first (the static HTML is exercised by the e2e suite). A
 * synthetic dataset of one state (uf "rj", three municipalities) plus a synthetic mesh with the
 * three joined shapes and one the dataset does not list: the fixtures pin the interaction, the
 * fetch of the mesh file, the notes and the analytics, never election numbers.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@/analytics'
import CityMapMap, { placeLabels, type CityMapProps } from './CityMapMap'
import type { CityMapData } from '@/lib/city-map-data'
import type { CityMarginRow } from '@/lib/margins-city'
import type { JoinedShape, MunicipalityMesh } from '@/lib/municipality-geo'
import { fgOf } from '@/lib/scale'

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
    ...render(<CityMapMap base="/s/" geoUrl="/s/geo/municipios-rj.json" ufNome="Rio de Janeiro" semContorno={0} data={DATA} {...props} />),
  }
}

afterEach(() => {
  setAnalytics(noopAnalytics)
  events.length = 0
  vi.unstubAllGlobals()
  fetchFail = false
  window.history.replaceState(null, '', '/')
  document.querySelector('astro-island')?.remove()
})

describe('CityMapMap island (lista)', () => {
  it('data-ready (#122): no on the server, yes once the island runs, and the pre-hydration taps are applied first', async () => {
    expect(renderToStaticMarkup(<CityMapMap base="/s/" geoUrl="/s/geo/municipios-rj.json" ufNome="Rio de Janeiro" semContorno={0} data={DATA} />)).toContain('data-ready="no"')
    // The page script kept a tap on the Mapa toggle and a tap on Carmo from before hydration.
    const host = document.createElement('astro-island')
    host.setAttribute('data-pending-vista', 'mapa')
    host.setAttribute('data-pending-cd', '02')
    document.body.appendChild(host)
    const analytics: Analytics = { pageView() {}, event: (n, p) => void events.push([n, p]) }
    setAnalytics(analytics)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(MESH) }))
    render(<CityMapMap base="/s/" geoUrl="/s/geo/municipios-rj.json" ufNome="Rio de Janeiro" semContorno={0} data={DATA} />, { container: host })
    const section = host.querySelector('[data-slot="city-map"]')!
    expect(section.getAttribute('data-ready')).toBe('yes')
    expect(section.getAttribute('data-error')).toBeNull()
    await vi.waitFor(() => expect(document.querySelector('[data-slot="mapa-selecionado"]')?.textContent).toContain('Carmo'))
    expect(new URLSearchParams(location.search).get('vista')).toBe('mapa')
    expect(host.getAttribute('data-pending-cd')).toBeNull()
    expect(host.getAttribute('data-pending-vista')).toBeNull()
  })

  it('renders one row per municipality under the base, ordered by round-2 valid votes', () => {
    setup()
    const rows = screen.getByRole('navigation', { name: 'Municípios' }).querySelectorAll('a[data-cd]')
    expect([...rows].map((r) => r.getAttribute('data-cd'))).toEqual(['01', '03', '02'])
    const primeiro = rows[0] as HTMLAnchorElement
    expect(primeiro.getAttribute('href')).toBe('/s/rj/rio-de-janeiro/')
    expect(primeiro.textContent).toContain('Rio de Janeiro')
    expect(primeiro.textContent).toContain('+50,0 pp')
    expect(primeiro.textContent).toContain('Maria à frente')
    expect(primeiro.textContent).toContain('200 votos válidos')
  })

  it('a city without a round-2 pairing renders without fill and without a value', () => {
    setup()
    const paraty = screen.getByRole('link', { name: /Paraty/ })
    expect(paraty.textContent).toContain('sem dados')
    expect(paraty.querySelector('span[aria-hidden="true"]')!.getAttribute('style')).toContain('var(--muted)')
    expect(paraty.textContent).toContain('sem dados do 2º turno')
  })

  it('the list view has no selection panel: a row is only a link', () => {
    setup()
    expect(document.querySelector('[data-slot="mapa-selecionado"]')).toBeNull()
  })

  it('selects the city with most round-2 valid votes by default and shows its details (map view)', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    const panel = document.querySelector('[data-slot="mapa-selecionado"]') as HTMLElement
    expect(panel.textContent).toContain('Rio de Janeiro · selecionado')
    expect(panel.textContent).toContain('+50,0 pp')
    expect(panel.textContent).toContain('Votos válidos (2º turno): 200')
    expect(panel.textContent).toContain('Margem (Maria Souza − João Costa): +50,0 pp')
    expect(panel.textContent).toContain('Na eleição anterior: +10,0 pp. Variação: +40,0 pp.')
    // the big figure never wraps: number and unit stay together even under a two-line title
    expect(panel.querySelector<HTMLElement>('.whitespace-nowrap')!.textContent).toContain('+50,0 pp')
    expect((screen.getByRole('link', { name: 'Abrir cidade' }) as HTMLAnchorElement).getAttribute('href')).toBe('/s/rj/rio-de-janeiro/')
  })

  it('the legend carries the numeric bin edges and the count of the cities without a pairing', () => {
    setup()
    const esc = document.querySelector('[data-slot="mapa-escala"]') as HTMLElement
    expect(esc.textContent).toContain('-30')
    expect(esc.textContent).toContain('+30')
    expect(esc.textContent).toContain('Sem cor: 1 município sem dados do 2º turno.')
  })

  it('a tap on a row is a plain link: nothing stops it and no selection event fires (#83)', async () => {
    setup()
    const row = screen.getByRole('link', { name: /Carmo/ })
    expect(row.getAttribute('href')).toBe('/s/rj/carmo/')
    const click = new MouseEvent('click', { bubbles: true, cancelable: true })
    row.dispatchEvent(click)
    expect(click.defaultPrevented).toBe(false)
    expect(events.find(([n]) => n === 'map_municipio_tap')).toBeUndefined()
  })

  it('announces itself on every mount so the page search can filter the fresh rows', async () => {
    const mounted = vi.fn()
    document.addEventListener('city-list:mounted', mounted)
    const { user } = setup()
    expect(mounted).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    await user.click(screen.getByRole('link', { name: 'Lista' }))
    expect(mounted).toHaveBeenCalledTimes(2)
    document.removeEventListener('city-list:mounted', mounted)
  })

  it('typing in the state page search while the map shows brings the list back', async () => {
    document.body.insertAdjacentHTML('beforeend', '<div data-state-search><input type="search"></div>')
    const { user } = setup()
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    expect(document.querySelector('[data-slot="mapa-municipios"]')).toBeTruthy()
    await user.type(document.querySelector('[data-state-search] input')!, 'c')
    expect(document.querySelector('[data-slot="mapa-municipios"]')).toBeNull()
    expect(screen.getByRole('navigation', { name: 'Municípios' })).toBeTruthy()
    expect(window.location.search).not.toContain('vista=mapa')
    document.querySelector('[data-state-search]')!.remove()
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
    window.history.replaceState(null, '', '/s/rj/?vista=mapa')
    document.body.appendChild(island)
    render(
      <CityMapMap base="/s/" geoUrl="/s/geo/municipios-rj.json" ufNome="Rio de Janeiro" semContorno={0} data={DATA} />,
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

describe('CityMapMap: the label placement pass (placeLabels)', () => {
  const WIN = { x: 0, y: 0, w: 100, h: 60 }
  /** A ≥7-point ring with an exact bbox and centroid, in viewBox units (largura 100 => pxUnit 3.5). */
  const SH = (codarea: string, cx: number, cy: number, w = 15, h = 10): JoinedShape => ({
    codarea,
    pts: [
      [cx - w / 2, cy - h / 2],
      [cx + w / 2, cy - h / 2],
      [cx + w / 2, cy],
      [cx + w / 2, cy + h / 2],
      [cx, cy + h / 2],
      [cx - w / 2, cy + h / 2],
      [cx - w / 2, cy],
    ],
    cx,
    cy,
  })
  const rowWith = (cdIbge: string, margin2: number): [string, CityMarginRow] => [
    cdIbge,
    { ...rj('RIO DE JANEIRO', '01', cdIbge, 'rio-de-janeiro', 200), margin2 },
  ]

  it('a colliding neighbour loses its inline value (the bigger one claims it first)', () => {
    // '+50,0' and '+8,0' at cx 30 / 34: the two value boxes (13 px bold, 8 px a character, 3.5 px a unit) overlap
    const labels = placeLabels([SH('3390001', 30, 15, 20), SH('3390002', 34, 15, 20)], new Map([rowWith('3390001', 50), rowWith('3390002', 8)]), WIN)
    expect(labels.get('3390001')).toMatchObject({ value: true })
    expect(labels.get('3390002')).toMatchObject({ value: false })
  })

  it('no label crosses the container: boxes past the edge are dropped, not clipped', () => {
    const labels = placeLabels([SH('3390001', 98, 15, 20)], new Map([rowWith('3390001', 50)]), WIN)
    expect(labels.get('3390001')).toMatchObject({ value: false, nome: false })
  })

  it('a lone big shape shows its value above its name (no numbers under the name)', () => {
    const labels = placeLabels([SH('3390001', 50, 35, 60, 30)], new Map([rowWith('3390001', 50)]), WIN)
    expect(labels.get('3390001')).toMatchObject({ value: true, nome: true })
  })

  it('the island renders exactly the admitted labels: value above the name', async () => {
    fetchJson = {
      fonte: 'teste', metodo: 'teste', uf: 'rj', cdUf: '33', largura: 100, altura: 80,
      formas: {
        '3399001': { p: [[20, 20], [80, 20], [80, 35], [80, 50], [50, 50], [20, 50], [20, 35], [20, 20]], c: [50, 35] },
        '3399002': { p: [[12.5, 67], [27.5, 67], [27.5, 72], [27.5, 77], [20, 77], [12.5, 77], [12.5, 72], [12.5, 67]], c: [20, 72] },
      },
    }
    try {
      const { user } = setup()
      await user.click(screen.getByRole('link', { name: 'Mapa' }))
      await waitFor(() => expect(document.querySelector('[data-slot="mapa-municipios"]')?.querySelectorAll('a[data-cd-ibge]')).toHaveLength(2))
      // Rio, the bigger shape: both labels — the value above the name, paper ink on the dark pos3 fill
      // (labels live in a SECOND pass, above every fill: a neighbour's fill never overprints a text)
      const map = document.querySelector('[data-slot="mapa-municipios"] svg')!
      const kids = [...map.children].map((el) => el.tagName.toLowerCase())
      expect(kids.filter((t) => t === 'a')).toHaveLength(2) // shapes first
      expect(kids.indexOf('g')).toBeGreaterThan(kids.lastIndexOf('a')) // labels after every fill
      const texts = [...map.querySelectorAll('g[data-cd-ibge="3399001"] text')]
      expect(texts).toHaveLength(2)
      expect(Number(texts[0]!.getAttribute('y'))).toBeCloseTo(35 - 2 / 3.5, 2) // shape.cy - 2 px, in viewBox units
      expect(texts[0]!.textContent).toBe('+50,0')
      expect(texts[0]!.getAttribute('fill')).toBe('var(--background)')
      expect(Number(texts[1]!.getAttribute('y'))).toBeCloseTo(35 + 16 / 3.5, 2) // the name never prints under the value
      expect(Number(texts[1]!.getAttribute('font-size'))).toBeCloseTo(13 / 3.5, 2) // 13 px (step 1) as drawn
      expect(texts[1]!.textContent).toBe('Rio de Janeiro')
      // Carmo's own name falls past the container edge; its value still prints, the text stays
      expect(map.querySelectorAll('g[data-cd-ibge="3399002"] text')).toHaveLength(1)
      expect(document.querySelector('a[data-cd-ibge="3399002"]')!.getAttribute('aria-label')).toContain('+50,0 pp')
    } finally {
      fetchJson = MESH
    }
  })
})

describe('fgOf: the label ink from the fill luminance', () => {
  it('paper (white) only on the saturated steps; dark ink on the mid and light ones', () => {
    expect(fgOf('neg3')).toBe('var(--background)')
    expect(fgOf('pos3')).toBe('var(--background)')
    expect(fgOf('neg2')).toBe('var(--foreground)')
    expect(fgOf('pos2')).toBe('var(--foreground)')
    expect(fgOf('neg1')).toBe('var(--foreground)')
    expect(fgOf('zero')).toBe('var(--foreground)')
    expect(fgOf('pos1')).toBe('var(--foreground)')
  })
})

describe('CityMapMap: municipalities without a mesh shape (ticket #17)', () => {
  it('the build-time count notes the list-only municipalities on the pre-rendered list', () => {
    setup({ semContorno: 1 })
    const note = document.querySelector('[data-slot="escala-sem-contorno"]') as HTMLElement
    expect(note.textContent).toContain('Sem contorno: 1 município não tem fronteira no arquivo do IBGE')
    expect(note.textContent).toContain('só aparece na lista.')
  })

  it('several list-only municipalities get the plural wording', () => {
    setup({ semContorno: 3 })
    const note = document.querySelector('[data-slot="escala-sem-contorno"]') as HTMLElement
    expect(note.textContent).toContain('Sem contorno: 3 municípios não têm')
  })

  it('with the mesh loaded the note keeps counting the same list-only rows (map view)', async () => {
    // a dataset row the synthetic mesh does not carry (Paraty's shape removed)...
    try {
      fetchJson = { ...MESH, formas: { ...MESH.formas } }
      delete (fetchJson as MunicipalityMesh).formas['3399003']
      const { user } = setup({ semContorno: 1 })
      await user.click(screen.getByRole('link', { name: 'Mapa' }))
      await waitFor(() => expect(document.querySelector('[data-slot="mapa-municipios"]')?.querySelectorAll('a[data-cd-ibge]')).toHaveLength(3))
      const note = document.querySelector('[data-slot="escala-sem-contorno"]') as HTMLElement
      expect(note.textContent).toContain('Sem contorno: 1 município')
      // the other direction: mesh shapes without a dataset row still get their own note
      const unmatched = document.querySelector('[data-slot="malha-sem-dados"]') as HTMLElement
      expect(unmatched.textContent).toContain('1 dos municípios do arquivo de fronteiras')
    } finally {
      fetchJson = MESH
    }
  })
})