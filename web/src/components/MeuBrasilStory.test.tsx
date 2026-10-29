// @vitest-environment jsdom
/**
 * data-ready of the story of Meu Brasil (#122): no while the shards of the places can still come back; an
 * address without places IS the answer (yes, and the placeholder carries data-places="0"); a shard that
 * cannot be read is the failed of the island, with the short reason and the one console line.
 */
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics } from '@/analytics'
import { loadCityShard } from '@/lib/shard-files'
import MeuBrasilStory from './MeuBrasilStory'

vi.mock('@/lib/share-raster', () => ({
  svgToPng: vi.fn(async (_s: string, name: string) => new File(['png'], name, { type: 'image/png' })),
  saveBlob: vi.fn(),
}))

const shard = (await loadCityShard('rj', 'cidade-exemplo'))!
const words = { region: 'História', dots: 'Cartão {n} de {total}', dot: 'Cartão', share: 'Compartilhar', linkNote: 'Nota', nojs: 'Sem JS', none: 'Escolha um lugar.', loading: 'Carregando…', failed: 'Não foi possível carregar os dados agora.' }

Element.prototype.scrollIntoView = () => {}
HTMLElement.prototype.scrollTo = () => {}

beforeEach(() => {
  setAnalytics(noopAnalytics)
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/city/rj/cidade-exemplo.json') ? new Response(JSON.stringify(shard)) : new Response('', { status: 404 }))))
})
afterEach(() => {
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/meu-brasil/historia/')
})

const open = (q: string) => {
  history.replaceState(null, '', `/meu-brasil/historia/${q}`)
  render(<MeuBrasilStory base="/" origin="https://o.exemplo.br" fixture={true} words={words} />)
}

describe('the story of Meu Brasil', () => {
  it('data-ready: no on the server; an address without places answers yes with data-places="0"', async () => {
    const ssr = renderToStaticMarkup(<MeuBrasilStory base="/" origin="https://o.exemplo.br" fixture={true} words={words} />)
    expect(ssr).toContain('data-ready="no"')
    open('')
    const ph = await vi.waitFor(() => {
      const p = document.querySelector('[data-placeholder]')
      expect(p?.getAttribute('data-ready')).toBe('yes')
      return p!
    })
    expect(ph.getAttribute('data-places')).toBe('0')
    expect(ph.textContent).toContain('Escolha um lugar.')
  })

  it('with a place, the island says no while the shard is on the way and the drawn sequence answers', async () => {
    open('?mora=rj/cidade-exemplo')
    const ph = document.querySelector('[data-placeholder]')!
    expect(ph.getAttribute('data-ready')).toBe('no')
    await vi.waitFor(() => expect(document.querySelector('[data-story]')).not.toBeNull())
    await vi.waitFor(() => expect(document.querySelector('[data-story]')!.getAttribute('data-ready')).toBe('yes'))
  })

  it('a shard that cannot be read is the failed of the island', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    open('?mora=rj/cidade-exemplo')
    await vi.waitFor(() => expect(document.querySelector('[data-placeholder]')?.getAttribute('data-ready')).toBe('failed'))
    expect(document.querySelector('[data-placeholder]')!.getAttribute('data-error')).toBe('city shard')
    expect(spy).toHaveBeenCalledWith('meu-brasil-story: city shard')
    spy.mockRestore()
  })
})
