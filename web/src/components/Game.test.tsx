// @vitest-environment jsdom
/**
 * data-ready of the daily game (#122): no while adivinhe/dados.json is on the way (the loading line carries
 * it), yes once the daily city is on screen; the file that cannot be read is the failed of the island, with
 * the reason and the one console line.
 */
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameData } from '@/lib/game'
import Game from './Game'

// cmdk (the picker) needs this.
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

const DATA: GameData = {
  edition: '2026-10-26',
  cities: [
    ['rj', 'cidade-exemplo', 'Cidade Exemplo', -22.9, -43.2, 1000, 80.1, 5, 'Sudeste'],
    ['sp', 'cidade-exemplo-paulista', 'Cidade Exemplo Paulista', -23.5, -46.6, 2000, 79.9, 4, 'Sudeste'],
  ],
  daily: [0, 1],
  states: { rj: 'Rio de Janeiro', sp: 'São Paulo' },
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  history.replaceState(null, '', '/adivinhe/')
})

describe('the game island', () => {
  it('data-ready: no on the server and while the file is on the way, yes with the daily city', async () => {
    expect(renderToStaticMarkup(<Game base="/" origin="https://o.exemplo.br" />)).toContain('data-ready="no"')
    let answer!: (r: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (answer = r))))
    render(<Game base="/" origin="https://o.exemplo.br" />)
    await vi.waitFor(() => expect(document.querySelector('[data-status]')?.getAttribute('data-ready')).toBe('no'))
    answer(new Response(JSON.stringify(DATA)))
    await vi.waitFor(() => expect(document.querySelector('[data-game]')?.getAttribute('data-ready')).toBe('yes'))
    expect(document.querySelector('[data-game]')!.getAttribute('data-error')).toBeNull()
  })

  it('adivinhe/dados.json that cannot be read is the failed of the island', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    render(<Game base="/" origin="https://o.exemplo.br" />)
    await vi.waitFor(() => expect(document.querySelector('[data-status]')?.getAttribute('data-ready')).toBe('failed'))
    expect(document.querySelector('[data-status]')!.getAttribute('data-error')).toBe('adivinhe/dados.json')
    expect(spy).toHaveBeenCalledWith('game: adivinhe/dados.json')
    spy.mockRestore()
  })
})
