// @vitest-environment jsdom
/**
 * data-ready of the widget builder (#122): no on the server and while the addressed city is on the way;
 * yes once its snippet is ready to copy. A fresh page (no city yet) stays no: the island's data IS the
 * city the visitor picks — a failed shard keeps its inline message instead of the terminal failed, because
 * picking another city recovers.
 */
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadCityShard } from '@/lib/shard-files'
import WidgetBuilder from './WidgetBuilder'

// cmdk (the picker) needs this.
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

const shard = (await loadCityShard('rj', 'cidade-exemplo'))!

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/widget/')
})

const open = (q: string) => {
  history.replaceState(null, '', `/widget/${q}`)
  render(<WidgetBuilder base="/" origin="https://o.exemplo.br" />)
  return document.querySelector('[data-widget-builder]')!
}

describe('the widget builder island', () => {
  it('data-ready: no on the server and until the addressed city answered, yes with the snippet', async () => {
    const ssr = renderToStaticMarkup(<WidgetBuilder base="/" origin="https://o.exemplo.br" />)
    expect(ssr).toContain('data-ready="no"')
    const fresh = open('')
    expect(fresh.getAttribute('data-ready')).toBe('no')

    cleanup()
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/city/rj/cidade-exemplo.json') ? new Response(JSON.stringify(shard)) : new Response('', { status: 404 }))))
    const root = open('?cidade=rj/cidade-exemplo')
    expect(root.getAttribute('data-ready')).toBe('no')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(root.getAttribute('data-error')).toBeNull()
  })
})
