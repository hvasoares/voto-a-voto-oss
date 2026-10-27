// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { setAnalytics, noopAnalytics, type Analytics } from '@/analytics'
import CitySearch from './CitySearch'

const SEARCH_ROWDATA: [string, string, string][] = [
  ['Cidade Exemplo', 'cidade-exemplo', 'rj'],
  ['Cidade Exemplo Paulista', 'cidade-exemplo-paulista', 'sp'],
  ...Array.from({ length: 30 }, (_, i) => [`SANTA LUZIA ${i}`, `santa-luzia-${i}`, 'mg'] as [string, string, string]),
]
const SEARCH = JSON.stringify(SEARCH_ROWDATA)

const events: [string, unknown][] = []

beforeAll(() => {
  // cmdk needs these in jsdom
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as never
  Element.prototype.scrollIntoView = () => {}
})

afterEach(() => {
  cleanup()
  setAnalytics(noopAnalytics)
  events.length = 0
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

function setup() {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(SEARCH)))
  const analytics: Analytics = { pageView() {}, event: (n, p) => void events.push([n, p]) }
  setAnalytics(analytics)
  render(<CitySearch base="/voto-a-voto/" />)
  return userEvent.setup()
}

describe('CitySearch island', () => {
  it('lists name and UF as links under the project base path', async () => {
    const user = setup()
    await user.type(screen.getByRole('combobox', { name: 'Busque sua cidade' }), 'cidade exemplo')
    const link = await screen.findByRole('link', { name: /Cidade Exemplo Paulista/ })
    expect(link.getAttribute('href')).toBe('/voto-a-voto/sp/cidade-exemplo-paulista/')
    expect(link.textContent).toContain('SP')
  })

  it('says "Mostrando 20 de N" when the list is cut at 20', async () => {
    const user = setup()
    await user.type(screen.getByRole('combobox'), 'santa luzia')
    expect(await screen.findByText(/Mostrando 20 de 30/)).toBeTruthy()
    expect(screen.getAllByRole('link')).toHaveLength(20)
  })

  it('reports one search with result count and query length, never the typed text', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(SEARCH)))
    setAnalytics({ pageView() {}, event: (n, p) => void events.push([n, p]) })
    render(<CitySearch base="/" />)
    await user.type(screen.getByRole('combobox'), 'cidade exemplo')
    await screen.findByRole('link', { name: /Cidade Exemplo Paulista/ })
    await vi.advanceTimersByTimeAsync(700)
    expect(events).toEqual([['search', { results: 2, query_length: 14 }]])
    expect(JSON.stringify(events)).not.toMatch(/cidade|exemplo/i)
  })

  it('reports a result tap with its position and UF', async () => {
    const user = setup()
    await user.type(screen.getByRole('combobox'), 'cidade exemplo')
    const link = await screen.findByRole('link', { name: /Cidade Exemplo Paulista/ })
    link.addEventListener('click', (e) => e.preventDefault())
    await user.click(link)
    expect(events).toContainEqual(['search_result_tap', { position: 2, uf: 'sp' }])
  })

  it('does not search below 2 characters', async () => {
    const user = setup()
    await user.type(screen.getByRole('combobox'), 'c')
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByText(/Nenhuma cidade/)).toBeNull()
  })
})
