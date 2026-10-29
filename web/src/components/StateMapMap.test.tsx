// @vitest-environment jsdom
/**
 * Island behaviour, cheapest layer first (the pages' static HTML is exercised by the e2e suite).
 * Synthetic numbers on three real UF codes (so the mosaic grid shows them): rj moved from
 * -13.6 to -6.2 (+7.4 swing), sp +12 -> -18 (-30), mg -4.9 -> +0.9 (+5.8).
 */
import { render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@/analytics'
import StateMapMap, { type StateMapProps } from './StateMapMap'
import type { StateMapData } from '@/lib/state-map-data'
import { UF_SHAPES } from '@/lib/uf-polygons'
import { selectedState } from '@/test/selected-state'

const DATA: StateMapData = {
  ano: 2026,
  ladoANome: 'Maria',
  ladoBNome: 'João',
  ladoANomeCompleto: 'Maria Souza',
  ladoBNomeCompleto: 'João Costa',
  national: { validos1: 380, validos2: 350, margin1: 30.4, margin2: 21.4, swing: -9 },
  rows: [
    { uf: 'rj', validos1: 100, validos2: 120, margin1: -13.6, margin2: -6.2, swing: 7.4 },
    { uf: 'sp', validos1: 200, validos2: 150, margin1: 12, margin2: -18, swing: -30 },
    { uf: 'mg', validos1: 80, validos2: 80, margin1: -4.9, margin2: 0.9, swing: 5.8 },
  ],
}

const events: [string, unknown][] = []

function setup(kind: StateMapProps['kind'], base = '/s/') {
  const analytics: Analytics = { pageView() {}, event: (n, p) => void events.push([n, p]) }
  setAnalytics(analytics)
  return { user: userEvent.setup(), ...render(<StateMapMap kind={kind} data={DATA} base={base} />) }
}

afterEach(() => {
  setAnalytics(noopAnalytics)
  events.length = 0
  window.history.replaceState(null, '', '/')
})

describe('StateMapMap island (mosaico)', () => {
  it('data-ready (#122): no on the server, yes once the island runs, and the pre-hydration tap is applied first', () => {
    expect(renderToStaticMarkup(<StateMapMap kind="margin" data={DATA} base="/s/" />)).toContain('data-ready="no"')
    const host = document.createElement('astro-island')
    host.setAttribute('data-pending-uf', 'mg')
    document.body.appendChild(host)
    const analytics: Analytics = { pageView() {}, event: (n, p) => void events.push([n, p]) }
    setAnalytics(analytics)
    render(<StateMapMap kind="margin" data={DATA} base="/s/" />, { container: host })
    const section = host.querySelector('[data-slot="state-map"]')!
    expect(section.getAttribute('data-ready')).toBe('yes')
    // The tap the page script kept arrived before the readiness did: mg is the selection the visitor tapped.
    expect(selectedState('MG')).toBeTruthy()
    expect(events).toEqual([['map_state_tap', { uf: 'mg' }]])
    expect(host.getAttribute('data-pending-uf')).toBeNull()
    host.remove()
  })

  it('renders one tile link per row under the base, named from content (state name + value, not a bare code)', () => {
    setup('margin')
    // The accessible name is the content: visible bits plus the sr-only sentence (issue #19).
    const rj = screen.getByRole('link', { name: /Rio de Janeiro: -6,2 pp, João à frente; 120 votos válidos/ })
    expect(rj.getAttribute('href')).toBe('/s/rj/')
    expect(rj.textContent).toContain('RJ')
    expect(rj.textContent).toContain('-6,2')
    expect(rj.getAttribute('aria-label')).toBeNull()
  })

  it('selects the state with most valid votes by default and shows its details', () => {
    setup('margin')
    expect(selectedState('SP')).toBeTruthy()
    expect(screen.getAllByText(/Votos válidos \(2º turno\): 150/)[0]).toBeTruthy()
    expect(screen.getAllByText(/Margem \(Maria Souza − João Costa\): -18,0 pp\. Na eleição anterior: \+12,0 pp/)[0]).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Abrir estado' }).getAttribute('href')).toBe('/s/sp/')
  })

  it('a hydrated tap selects the state and fires map_state_tap, staying on the page', async () => {
    const { user } = setup('margin')
    await user.click(screen.getByRole('link', { name: /Rio de Janeiro: -6,2 pp, João à frente; 120 votos válidos/ }))
    expect(selectedState('RJ')).toBeTruthy()
    expect(events).toContainEqual(['map_state_tap', { uf: 'rj' }])
    expect(screen.getByRole('link', { name: 'Abrir estado' }).getAttribute('href')).toBe('/s/rj/')
  })

  it('the tabs are plain links between the two routes under the base', () => {
    setup('margin')
    const margem = screen.getByRole('link', { name: 'Margem (2º turno)' })
    const virada = screen.getByRole('link', { name: 'Virada (1º→2º)' })
    expect(margem.getAttribute('href')).toBe('/s/mapa/')
    expect(virada.getAttribute('href')).toBe('/s/mapa/virada/')
    expect(margem.getAttribute('aria-current')).toBe('page')
  })

  it('switches to the map presentation and back (?vista=mapa in the URL)', async () => {
    const { user } = setup('margin')
    expect(screen.queryByRole('img', { name: /^Mapa do Brasil por estado/ })).toBeNull()
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    expect(screen.getByRole('img', { name: /^Mapa do Brasil por estado/ })).toBeTruthy()
    expect(events).toContainEqual(['map_view', { view: 'mapa' }])
    expect(window.location.search).toContain('vista=mapa')
    await user.click(screen.getByRole('link', { name: 'Mosaico' }))
    expect(window.location.search).not.toContain('vista=mapa')
    expect(screen.getByRole('link', { name: /Rio de Janeiro: -6,2 pp, João à frente; 120 votos válidos/ })).toBeTruthy()
  })
})

describe('StateMapMap island (virada)', () => {
  it('labels tiles with the swing and its direction', () => {
    setup('swing')
    const mg = screen.getByRole('link', { name: /Minas Gerais: \+5,8 pp, variação para Maria/ })
    expect(mg.getAttribute('href')).toBe('/s/mg/')
  })

  it('shows negative-swing entries in the legend when they exist', () => {
    setup('swing')
    expect(screen.getByText('-2,5')).toBeTruthy()
    expect(screen.queryByText('Sem estados com variação negativa')).toBeNull()
    expect(screen.getByText(/positivo: a margem se moveu para Maria/i)).toBeTruthy()
  })

  it('the default selection is again the biggest round-2 turnout, with both margins in the panel', () => {
    setup('swing')
    expect(screen.getAllByText(/A margem de Maria Souza sobre João Costa era de \+12,0 pp e passou para -18,0 pp\. Variação: -30,0 pp/)[0]).toBeTruthy()
    expect(selectedState('SP')).toBeTruthy()
  })
})

describe('StateMapMap island (virada, no negative swing)', () => {
  it('shows the frame note and drops the negative edge from the legend', () => {
    const flat: StateMapData = {
      ...DATA,
      rows: DATA.rows.map((r) => ({ ...r, swing: r.uf === 'sp' ? 30 : r.swing })),
    }
    render(<StateMapMap kind="swing" data={flat} base="/" />)
    expect(screen.getByText('Sem estados com variação negativa')).toBeTruthy()
    expect(screen.queryByText('-2,5')).toBeNull()
  })
})

describe('island respects ?vista=mapa on hydration', () => {
  it('starts in the map presentation when the URL asks for it', () => {
    window.history.replaceState(null, '', '/s/mapa/?vista=mapa')
    setup('margin')
    expect(screen.getByRole('img', { name: /^Mapa do Brasil por estado/ })).toBeTruthy()
  })
})

describe('state map touch targets (#88)', () => {
  /** All 27 states, so the callouts and every hit path are drawn (the fixture has three). */
  const full: StateMapData = {
    ...DATA,
    rows: UF_SHAPES.map((s, i) => ({ uf: s.uf, validos1: 100 + i, validos2: 200 + i, margin1: i - 13, margin2: 13 - i, swing: 2 * (i - 13) })),
  }
  const mapView = () => {
    window.history.replaceState(null, '', '/s/mapa/?vista=mapa')
    const analytics: Analytics = { pageView() {}, event: (n, p) => void events.push([n, p]) }
    setAnalytics(analytics)
    const view = render(<StateMapMap kind="margin" data={full} base="/s/" />)
    return { user: userEvent.setup(), svg: screen.getByRole('img', { name: /^Mapa do Brasil por estado/ }) as unknown as SVGSVGElement, ...view }
  }

  it('the invisible hit paths come BEFORE every drawn shape and callout, so they never take a neighbour\'s drawn area', () => {
    const { svg } = mapView()
    const all = [...svg.querySelectorAll('path[data-hit], a[data-uf]')]
    const lastHit = all.map((e) => e.matches('path[data-hit]')).lastIndexOf(true)
    const firstDrawn = all.findIndex((e) => e.matches('a[data-uf]'))
    expect(lastHit).toBeGreaterThanOrEqual(0)
    expect(lastHit).toBeLessThan(firstDrawn)
  })

  it('the hit paths are transparent and not reachable by keyboard or screen reader; the anchors stay the only links', () => {
    const { svg } = mapView()
    for (const p of svg.querySelectorAll('path[data-hit]')) {
      expect(p.getAttribute('aria-hidden')).toBe('true')
      expect(p.getAttribute('stroke')).toBe('transparent')
      expect(p.closest('a')).toBeNull()
      expect(p.hasAttribute('tabindex') || p.hasAttribute('href')).toBe(false)
    }
    expect(svg.querySelectorAll('a[data-uf]').length).toBe(27 + 11) // shapes plus the callout rows
  })

  it('every state outside the 44 px size has a hit path with a stroke, and the callout rows are 62 units (44 px) tall', () => {
    const { svg } = mapView()
    const withHit = [...svg.querySelectorAll('path[data-hit]')].map((p) => p.getAttribute('data-hit')!)
    expect(withHit).toContain('df')
    expect(withHit).toContain('rj')
    expect(withHit).not.toContain('mt')
    expect(withHit).not.toContain('pa')
    for (const r of svg.querySelectorAll('rect[data-hit]')) expect(Number(r.getAttribute('height'))).toBeGreaterThanOrEqual(62)
  })

  it('a tap on a hit path selects its state (hydrated: no navigation); a tap on a callout row margin does too', async () => {
    const { user, svg } = mapView()
    await user.click(svg.querySelector('path[data-hit="al"]')!)
    expect(selectedState('AL')).toBeTruthy()
    await user.click(svg.querySelector('rect[data-hit="se"]')!)
    expect(selectedState('SE')).toBeTruthy()
    expect(events.filter(([n]) => n === 'map_state_tap').map(([, p]) => (p as { uf: string }).uf)).toEqual(['al', 'se'])
  })
})
