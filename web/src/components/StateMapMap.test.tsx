// @vitest-environment jsdom
/**
 * Island behaviour, cheapest layer first (the pages' static HTML is exercised by the e2e suite).
 * Synthetic numbers on three real UF codes (so the mosaic grid shows them): rj moved from
 * -13.6 to -6.2 (+7.4 swing), sp +12 -> -18 (-30), mg -4.9 -> +0.9 (+5.8).
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@site/analytics'
import StateMapMap, { type StateMapProps } from './StateMapMap'
import type { StateMapData } from '@/lib/state-map-data'

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
  cleanup()
  setAnalytics(noopAnalytics)
  events.length = 0
  window.history.replaceState(null, '', '/')
})

describe('StateMapMap island (mosaico)', () => {
  it('renders one tile link per row under the base, value and UF written on the tile', () => {
    setup('margin')
    const rj = screen.getByRole('link', { name: /RJ: -6/ })
    expect(rj.getAttribute('href')).toBe('/s/rj/')
    expect(rj.textContent).toContain('-6,2')
    expect(rj.textContent).toContain('RJ')
    expect(rj.getAttribute('aria-label')).toContain('João à frente')
    expect(rj.getAttribute('aria-label')).toContain('120 votos válidos')
  })

  it('selects the state with most valid votes by default and shows its details', () => {
    setup('margin')
    expect(screen.getAllByText(/SP · selecionado/)[0]).toBeTruthy()
    expect(screen.getAllByText(/Votos válidos \(2º turno\): 150/)[0]).toBeTruthy()
    expect(screen.getAllByText(/Margem \(Maria Souza − João Costa\): -18,0 pp\. Na eleição anterior: \+12,0 pp/)[0]).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Abrir estado' }).getAttribute('href')).toBe('/s/sp/')
  })

  it('a hydrated tap selects the state and fires map_state_tap, staying on the page', async () => {
    const { user } = setup('margin')
    await user.click(screen.getByRole('link', { name: /RJ: -6/ }))
    expect(screen.getAllByText(/RJ · selecionado/)[0]).toBeTruthy()
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
    expect(screen.getByRole('link', { name: /RJ: -6/ })).toBeTruthy()
  })
})

describe('StateMapMap island (virada)', () => {
  it('labels tiles with the swing and its direction', () => {
    setup('swing')
    const mg = screen.getByRole('link', { name: /MG: \+5,8 pp, variação para Maria/ })
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
    expect(screen.getAllByText(/SP · selecionado/)[0]).toBeTruthy()
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