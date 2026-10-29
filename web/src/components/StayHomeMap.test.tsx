// @vitest-environment jsdom
/** The island of "Ficaram em casa" (#32): numbers come from the model, a tap selects, the toggle keeps the address, no candidate anywhere. */
import { cleanup, render, screen, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@/analytics'
import StayHomeMap from './StayHomeMap'
import { stayHomeModel } from '@/lib/stay-home-view'

const rows = [
  { uf: 'rj', aptos: 1000, naoVotaram: 250, share: 25 },
  { uf: 'sp', aptos: 3000, naoVotaram: 633, share: 21.1 },
  { uf: 'mg', aptos: 800, naoVotaram: 240, share: 30 },
]
const views = [{ ano: 2026, turno: 1 as const }, { ano: 2022, turno: 2 as const }]
const model = stayHomeModel({ view: views[0]!, views, rows, claim: { cities: 10, greater: 6, tenths: 600 } })
const viewPaths = { '2026-1': '/mapa/ficaram-em-casa/', '2022-2': '/mapa/ficaram-em-casa/2022-2/' }
const events: [string, unknown][] = []

function setup(base = '/s/') {
  setAnalytics({ pageView() {}, event: (n, p) => void events.push([n, p]) } satisfies Analytics)
  return { user: userEvent.setup(), ...render(<StayHomeMap model={model} base={base} viewPaths={viewPaths} />) }
}
afterEach(() => {
  cleanup()
  setAnalytics(noopAnalytics)
  events.length = 0
  window.history.replaceState(null, '', '/')
})

describe('StayHomeMap', () => {
  it('data-ready (#122): no on the server, yes once the island runs, and the pre-hydration tap selects first', () => {
    expect(renderToStaticMarkup(<StayHomeMap model={model} base="/s/" viewPaths={viewPaths} />)).toContain('data-ready="no"')
    const host = document.createElement('astro-island')
    host.setAttribute('data-pending-uf', 'rj')
    document.body.appendChild(host)
    setAnalytics({ pageView() {}, event: (n, p) => void events.push([n, p]) } satisfies Analytics)
    render(<StayHomeMap model={model} base="/s/" viewPaths={viewPaths} />, { container: host })
    expect(host.querySelector('[data-slot="state-map"]')!.getAttribute('data-ready')).toBe('yes')
    expect(screen.getByText('RJ · selecionado')).toBeTruthy()
    expect(events).toEqual([['map_state_tap', { uf: 'rj' }]])
    host.remove()
  })

  it('prints the percentage on every tile and links each state under the base', () => {
    setup()
    for (const [uf, pct] of [['rj', '25,0%'], ['sp', '21,1%'], ['mg', '30,0%']] as const) {
      const tile = document.querySelector(`a[data-uf="${uf}"]`)!
      expect(tile.textContent).toContain(pct)
      expect(tile.getAttribute('href')).toBe(`/s/${uf}/`)
      expect(tile.getAttribute('aria-label')).toBeNull()
    }
  })

  it('names a tile from its content: the state name, the share and the counts', () => {
    setup()
    const tile = within(screen.getByRole('navigation', { name: 'Estados' })).getByRole('link', { name: /Rio de Janeiro: 25,0% do eleitorado não votou em ninguém; 250 de 1.000 eleitores aptos/ })
    expect(tile.getAttribute('data-uf')).toBe('rj')
  })

  it('starts on the largest electorate and a tap selects another state, with map_state_tap', async () => {
    const { user } = setup()
    expect(screen.getByText('SP · selecionado')).toBeTruthy()
    await user.click(document.querySelector('a[data-uf="mg"]')!)
    expect(screen.getByText('MG · selecionado')).toBeTruthy()
    expect(screen.getByText('Eleitores aptos: 800 · não votaram: 240')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Abrir estado' }).getAttribute('href')).toBe('/s/mg/')
    expect(events).toEqual([['map_state_tap', { uf: 'mg' }]])
  })

  it('the cycle and round links keep their own addresses and mark the current one', () => {
    setup()
    const nav = screen.getByRole('navigation', { name: 'Ciclo e turno' })
    expect(nav.querySelector('[aria-current="page"]')!.textContent).toContain('2026')
    expect(screen.getByRole('link', { name: /2022\s*·?\s*2º turno/ }).getAttribute('href')).toBe('/s/mapa/ficaram-em-casa/2022-2/')
  })

  it('has the three options of the Mapa por estado, this one current', () => {
    setup()
    const tabs = screen.getByRole('navigation', { name: 'Margem, virada ou ficaram em casa' })
    expect([...tabs.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')])).toEqual([
      ['Margem', '/s/mapa/', null],
      ['Virada', '/s/mapa/virada/', null],
      ['Ficaram em casa', '/s/mapa/ficaram-em-casa/', 'page'],
    ])
  })

  it('Mapa draws the shapes with their percentage and the map note, keeps vista in the address and counts map_view', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('link', { name: 'Mapa' }))
    const svg = screen.getByRole('img', { name: /^Parcela dos eleitores/ })
    expect(svg.textContent).toContain('25,0%')
    expect(screen.getByText('O mapa mostra área, não eleitores. O mosaico é a visão padrão.')).toBeTruthy()
    expect(new URLSearchParams(window.location.search).get('vista')).toBe('mapa')
    expect(events).toEqual([['map_view', { view: 'mapa' }]])
    await user.click(screen.getByRole('link', { name: 'Mosaico' }))
    expect(window.location.search).toBe('')
  })

  it('applies a toggle tap the page script kept while the island hydrated (data-pending-vista), address included', () => {
    const host = document.createElement('astro-island')
    host.dataset.pendingVista = 'mapa'
    document.body.append(host)
    render(<StayHomeMap model={model} base="/s/" viewPaths={viewPaths} />, { container: host.appendChild(document.createElement('div')) })
    expect(screen.getByRole('img', { name: /^Parcela dos eleitores/ })).toBeTruthy()
    expect(new URLSearchParams(window.location.search).get('vista')).toBe('mapa')
    expect(host.dataset.pendingVista).toBeUndefined()
    host.remove()
  })

  it('shows the claim with its limits and the table of every state; no candidate is named', () => {
    setup()
    expect(screen.getByText(/Em 60,0% das cidades/)).toBeTruthy()
    expect(screen.getByText(/Não diz quem são essas pessoas/)).toBeTruthy()
    expect(document.querySelectorAll('[data-slot="mapa-tabela"] tbody tr')).toHaveLength(3)
    expect(document.body.textContent).not.toMatch(/Lula|Flavio|Candidato/)
  })
})
