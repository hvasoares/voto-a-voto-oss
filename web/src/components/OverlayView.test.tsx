// @vitest-environment jsdom
/**
 * data-ready of the overlay view (#122): no while the answer is not known; an address without a city has
 * already answered (the status says so) and reports yes; a shard that cannot be read is the failed of the
 * island, with the short reason and the one console line.
 */
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadCityShard } from '@/lib/shard-files'
import OverlayView from './OverlayView'

const shard = (await loadCityShard('rj', 'cidade-exemplo'))!

afterEach(() => {
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/overlay/tela/')
})

const draw = (q: string) => {
  history.replaceState(null, '', `/overlay/tela/${q}`)
  render(<OverlayView base="/" origin="https://votoavoto.exemplo.br" edition="26/10/2026" fixture={true} />)
  return document.querySelector('[data-overlay]')!
}

describe('the overlay view island', () => {
  it('data-ready: no on the server; an address without a city answers yes right away', async () => {
    expect(renderToStaticMarkup(<OverlayView base="/" origin="https://o.exemplo.br" edition="26/10/2026" fixture={true} />)).toContain('data-ready="no"')
    const root = draw('')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(root.querySelector('[data-status]')!.textContent!.length).toBeGreaterThan(0)
  })

  it('the city of the address draws: yes once its shard answered', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/city/rj/cidade-exemplo.json') ? new Response(JSON.stringify(shard)) : new Response('', { status: 404 }))))
    const root = draw('?c=rj/cidade-exemplo&m=comparecimento&a=2026&t=2')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(root.querySelector('[data-big]')!.textContent).not.toBe('—')
  })

  it('a shard that cannot be read is the failed of the island, with the reason and the one console line', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const root = draw('?c=rj/cidade-exemplo')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('failed'))
    expect(root.getAttribute('data-error')).toBe('city shard')
    expect(spy).toHaveBeenCalledWith('overlay-view: city shard')
    spy.mockRestore()
  })
})
