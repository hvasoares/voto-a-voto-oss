import { describe, expect, it } from 'vitest'
import { expectHydrated } from '../../shared/slot-test'
import { testContext } from '../../shared/test-context'
import { meta, slot } from './slot'
import { UF_TILES } from './uf-grid'

const base = testContext({ uf: 'rj', slug: 'cidade-exemplo', regiao: 'sudeste', report: 'maiores-viradas' })
const ALL_UFS = UF_TILES.map((t) => t.uf)
// The committed fixture dataset has 3 states; the real one has all 27. This store answers like the real one.
const ctx = { ...base, data: { ...base.data, states: async () => ALL_UFS.sort().map((uf) => ({ uf, regiao: 'x', municipios: 1 })) } }
const page = async () => (await slot.render(ctx)).html.value
const anchors = (markup: string) => [...markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1]!, text: m[2]!.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }))

describe('slot home (ticket #3)', () => {
  it('is hydrated (no "not yet hydrated" marker)', async () => {
    await expectHydrated(slot, ctx)
    expect(await page()).not.toContain('not yet hydrated')
  })

  it('declares its contract', () => {
    expect(meta.ticket).toBe(3)
    expect(meta.route).toBe('/')
  })

  it('shows the title, the tagline and the search prompt of the Sketch frame', async () => {
    const markup = await page()
    expect(markup).toMatch(/<h1[^>]*>Voto a Voto<\/h1>/)
    expect(markup).toContain('Eleição presidencial 2026, cidade por cidade.')
    expect(markup).toContain('Compare com 2018 e 2022.')
    expect(markup).toContain('Busque sua cidade')
    expect(markup).toContain('Ou escolha um estado. Toque para ver os municípios.')
  })

  it('offers 27 state tiles as plain anchors to the state page, without the overseas post', async () => {
    const tiles = anchors(await page()).filter((a) => /^\/[a-z]{2}\/$/.test(a.href))
    expect(tiles).toHaveLength(27)
    expect(tiles.find((t) => t.href === '/rj/')?.text).toBe('RJ')
    expect(tiles.map((t) => t.href)).not.toContain('/zz/')
  })

  it('draws a state the dataset lacks as an inert tile, never a dead link', async () => {
    const small = testContext({ uf: 'rj' }) // fixture dataset: rj, sp, mt only
    const markup = (await slot.render(small)).html.value
    expect(anchors(markup).filter((a) => /^\/[a-z]{2}\/$/.test(a.href)).map((a) => a.href).sort()).toEqual(['/mt/', '/rj/', '/sp/'])
    expect(markup.match(/class="uf-tile"/g)).toHaveLength(27)
  })

  it('lists "Para explorar" with its four entries and where they go', async () => {
    const links = anchors(await page())
    for (const [label, href] of [
      ['Brasil e regiões', '/brasil/'],
      ['Mapa por estado', '/mapa/'],
      ['Relatórios', '/relatorios/'],
      ['Três ciclos por estado', '/tres-ciclos/rj/'],
    ] as const) {
      expect(links.find((l) => l.text.startsWith(label))?.href, label).toBe(href)
    }
    expect(await page()).toContain('Para explorar')
  })

  it('ends with the TSE source line linking to "Sobre os dados"', async () => {
    const markup = await page()
    expect(markup).toContain('Dados oficiais do TSE')
    expect(anchors(markup).find((l) => l.text.startsWith('Sobre os dados'))?.href).toBe('/sobre-os-dados/')
  })
})
