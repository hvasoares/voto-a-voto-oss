// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pageDataFile, stableJson } from '@/shared/page-data'
import { bootPageData } from './page-data-boot'

/** The family's page script (private#208): finds the area and the page's address, fetches the file the writer put at `data/v<version>/<family>/<path>.json`. */
const PAGE = `<main data-page-path="rj/cidade-exemplo"><div data-stub-area data-arrived="Pronto." data-failed-text="Falhou." data-retry-text="Tentar"><p data-stub-loading>…</p></div></main>`
beforeEach(() => void (document.body.innerHTML = PAGE))
afterEach(() => vi.unstubAllGlobals())

describe('bootPageData', () => {
  it('fetches the family file of this page under the data version and draws it', async () => {
    const fetcher = vi.fn(async () => new Response(stableJson(pageDataFile('qr', 'rj/cidade-exemplo', { n: 1 }))))
    vi.stubGlobal('fetch', fetcher)
    const draw = vi.fn()
    await bootPageData({ family: 'qr', version: 'abc123', draw })
    expect(fetcher).toHaveBeenCalledWith('/data/vabc123/qr/rj/cidade-exemplo.json')
    expect(draw).toHaveBeenCalledWith({ n: 1 }, expect.any(HTMLElement))
    expect(document.querySelector<HTMLElement>('[data-stub-area]')!.dataset.ready).toBe('yes')
  })

  it('does nothing on a page that is not a stub page', async () => {
    document.body.innerHTML = '<main></main>'
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await bootPageData({ family: 'qr', version: 'abc123', draw: vi.fn() })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
