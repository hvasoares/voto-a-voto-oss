// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@/analytics'
import { loadCityShard } from '@/lib/shard-files'
import MeuBrasil from './MeuBrasil'

vi.mock('@/lib/share-raster', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/share-raster')>()
  return { ...mod, svgToPng: vi.fn(async (_s: string, name: string) => new File(['png'], name, { type: 'image/png' })), saveBlob: vi.fn() }
})
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView = () => {}

const events: [string, unknown][] = []
const shards = { 'rj/cidade-exemplo': (await loadCityShard('rj', 'cidade-exemplo'))!, 'sp/cidade-exemplo-paulista': (await loadCityShard('sp', 'cidade-exemplo-paulista'))! }
beforeEach(() => {
  setAnalytics({ pageView() {}, event: (n, p) => void events.push([n, p]) } satisfies Analytics)
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('search.json')) return new Response(JSON.stringify([['Cidade Exemplo', 'cidade-exemplo', 'rj'], ['Cidade Exemplo Paulista', 'cidade-exemplo-paulista', 'sp']]))
    const hit = Object.entries(shards).find(([k]) => String(url).includes(`/city/${k}.json`))
    return hit ? new Response(JSON.stringify(hit[1])) : new Response('', { status: 404 })
  }))
})
afterEach(() => {
  cleanup()
  setAnalytics(noopAnalytics)
  events.length = 0
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/')
})

const open = (q: string) => {
  history.replaceState(null, '', `/meu-brasil/${q}`)
  const { container } = render(<MeuBrasil base="/" origin="https://votoavoto.exemplo.br" fixture={true} edition="2026-10-26" />)
  return container.querySelector<HTMLElement>('[data-meu-brasil]')!
}
const title = (root: HTMLElement) => root.querySelector('[data-card-picture] svg title')?.textContent

describe('Meu Brasil', () => {
  it('reads the places of the address and draws one card with the generated headline as its text alternative', async () => {
    const root = open('?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(root.getAttribute('data-places')).toBe('2')
    expect(title(root)).toMatch(/^No 2º turno de 2026, a parcela do eleitorado que não votou foi de \d+% em Cidade Exemplo e \d+% em Cidade Exemplo Paulista\.$/)
    expect(root.querySelectorAll('[data-place-column]')).toHaveLength(2)
    expect(events.filter(([n]) => n.startsWith('meu_brasil'))).toEqual([])
  })

  it('counts a place added, with its role and how many places there are now, never its name', async () => {
    const root = open('?mora=rj/cidade-exemplo')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    const user = userEvent.setup()
    await user.type(screen.getByRole('combobox', { name: 'Onde vota' }), 'exemplo paulista')
    await user.click(await screen.findByText('Cidade Exemplo Paulista', { selector: '[data-place-option] span' }))
    await vi.waitFor(() => expect(root.getAttribute('data-places')).toBe('2'))
    expect(events.filter(([n]) => n.startsWith('meu_brasil'))).toEqual([['meu_brasil_place_added', { role: 'vota', places: 2 }]])
    expect(location.search).toBe('?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista')
  })

  it('removing a place updates the address and the card; the last removal asks for a place', async () => {
    const root = open('?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    fireEvent.click(screen.getByRole('button', { name: 'Remover onde vota' }))
    await vi.waitFor(() => expect(root.getAttribute('data-places')).toBe('1'))
    expect(location.search).toBe('?mora=rj/cidade-exemplo')
    fireEvent.click(screen.getByRole('button', { name: 'Remover onde mora' }))
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('no'))
    expect(screen.getByText('Escolha ao menos um lugar para ver o cartão.')).toBeTruthy()
    expect(location.search).toBe('')
  })

  it('counts a completed share, with how many places the card had', async () => {
    vi.stubGlobal('navigator', { canShare: (d: ShareData) => !!d.files, share: async () => {} })
    const root = open('?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    await vi.waitFor(() => expect(root.querySelector('[data-share-actions]')!.getAttribute('data-png')).toBe('ready'))
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar o cartão' }))
    await vi.waitFor(() => expect(events.some(([n]) => n === 'meu_brasil_shared')).toBe(true))
    expect(events.filter(([n]) => n === 'meu_brasil_shared')).toEqual([['meu_brasil_shared', { places: 2 }]])
    expect(events.filter(([n]) => n === 'share_opened')).toHaveLength(1)
  })
})
