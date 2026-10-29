// @vitest-environment jsdom
/**
 * data-ready of the print sheet (#122): no while the shard can still come back; an address without a
 * place IS the answer (yes, data-places stays "0"); a shard that cannot be read is the failed of the
 * island, with the short reason and the one console line.
 */
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCityShard } from '@/lib/shard-files'
import PressSheet from './PressSheet'

const shard = (await loadCityShard('rj', 'cidade-exemplo'))!

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/city/rj/cidade-exemplo.json') ? new Response(JSON.stringify(shard)) : new Response('', { status: 404 }))))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/imprensa/folha/')
})

const open = (q: string) => {
  history.replaceState(null, '', `/imprensa/folha/${q}`)
  render(<PressSheet base="/" origin="https://o.exemplo.br" fixture={true} edition="2026-10-26" example="rj/cidade-exemplo" />)
  return document.querySelector('[data-sheet]')!
}

describe('the print sheet island', () => {
  it('data-ready: no on the server; an address without a place answers yes with data-places="0"', async () => {
    expect(renderToStaticMarkup(<PressSheet base="/" origin="https://o.exemplo.br" fixture={true} edition="2026-10-26" example="rj/cidade-exemplo" />)).toContain('data-ready="no"')
    const root = open('')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(root.getAttribute('data-places')).toBe('0')
  })

  it('with a place: no while the shard is on the way, yes once the sheet is drawn', async () => {
    const root = open('?mora=rj/cidade-exemplo')
    expect(root.getAttribute('data-ready')).toBe('no')
    await vi.waitFor(() => expect(root.querySelector('[data-sheet-page]')).not.toBeNull())
    expect(root.getAttribute('data-ready')).toBe('yes')
    expect(root.getAttribute('data-places')).toBe('1')
  })

  it('a shard that cannot be read is the failed of the island', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const root = open('?mora=rj/cidade-exemplo')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('failed'))
    expect(root.getAttribute('data-error')).toBe('city shard')
    expect(spy).toHaveBeenCalledWith('press-sheet: city shard')
    spy.mockRestore()
  })
})
