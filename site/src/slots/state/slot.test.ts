import { describe, expect, it } from 'vitest'
import { expectHydrated } from '../../shared/slot-test'
import { testContext } from '../../shared/test-context'
import { meta, slot } from './slot'

const ctx = testContext({ uf: 'rj', slug: 'cidade-exemplo', regiao: 'sudeste', report: 'maiores-viradas' })
const page = async (c = ctx) => (await slot.render(c)).html.value
const anchors = (markup: string) => [...markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1]!, text: m[2]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }))

describe('slot state (ticket #4)', () => {
  it('is hydrated (no "not yet hydrated" marker)', async () => {
    await expectHydrated(slot, ctx)
    expect(await page()).not.toContain('not yet hydrated')
  })

  it('declares its contract', () => {
    expect(meta.ticket).toBe(4)
    expect(meta.route).toBe('/:uf/')
  })

  it('shows the selected state and its municipality count from the dataset', async () => {
    const out = await slot.render(ctx)
    expect(out.title).toBe('Estado selecionado: RJ')
    expect(out.html.value).toMatch(/<h1[^>]*>Estado selecionado: RJ<\/h1>/)
    expect(out.html.value).toContain('6 municípios')
  })

  it('counts the cities of the state asked for, not of the fixture default', async () => {
    const sp = testContext({ uf: 'sp' })
    expect(await page(sp)).toContain('1 município<')
    expect(await page(sp)).toContain('Estado selecionado: SP')
  })

  it('lists every municipality of the state as a plain anchor to its city page, sorted', async () => {
    const links = anchors(await page()).filter((a) => /^\/rj\/[^/]+\/$/.test(a.href))
    expect(links.map((l) => l.href)).toEqual(['/rj/cidade-exemplo/', '/rj/cidade-exemplo-a/', '/rj/cidade-exemplo-b/', '/rj/cidade-exemplo-c/', '/rj/cidade-exemplo-d/', '/rj/cidade-exemplo-e/'])
    expect(links[1]!.text).toContain('Cidade Exemplo A')
  })

  it('never lists a city of another state or the overseas post', async () => {
    const markup = await page()
    expect(markup).not.toContain('/sp/')
    expect(markup).not.toContain('/zz/')
    expect(markup).not.toContain('Exterior')
  })

  it('offers back, map-by-state and three-cycles links as in the frame', async () => {
    const links = anchors(await page())
    expect(links.find((l) => l.text === '‹ Início')?.href).toBe('/')
    expect(links.find((l) => l.text === 'Ver mapa por estado ›')?.href).toBe('/mapa/')
    expect(links.find((l) => l.text === 'Ver os três ciclos do estado ›')?.href).toBe('/tres-ciclos/rj/')
  })

  it('reserves the map area with its markup contract for tickets #16 and #17', async () => {
    const markup = await page()
    expect(markup).toMatch(/<div class="state-map"[^>]*data-placeholder="state-map"[^>]*data-uf="rj"/)
  })

  it('has the search box "Busque sua cidade em RJ"', async () => {
    expect(await page()).toMatch(/<input[^>]*placeholder="Busque sua cidade em RJ"/)
  })

  it('is not a page for the overseas post or an unknown state', async () => {
    await expect(slot.render(testContext({ uf: 'zz' }))).rejects.toThrow(/state not found/)
    await expect(slot.render(testContext({ uf: 'xx' }))).rejects.toThrow(/state not found/)
  })

  it('with ?fixture=sketch draws the frame illustrative figures, still linking to dataset cities', async () => {
    const markup = await page({ ...ctx, useFrameFixture: true })
    expect(markup).toContain('92 municípios (exemplo)')
    expect(markup).toContain('EXEMPLO  ·  NOMES E MAPA ILUSTRATIVOS')
    const links = anchors(markup).filter((a) => /^\/rj\/[^/]+\/$/.test(a.href))
    expect(links.map((l) => l.href)).toEqual(['/rj/cidade-exemplo-a/', '/rj/cidade-exemplo-b/', '/rj/cidade-exemplo-c/', '/rj/cidade-exemplo-d/', '/rj/cidade-exemplo-e/'])
    expect(markup).toContain('Município fictício · RJ')
  })

  it('is light for the largest state: 645 cities stay under 100 KB of markup', async () => {
    const big = Array.from({ length: 645 }, (_, i) => ({ uf: 'sp', cdMunicipio: String(i), cdIbge: '', nome: `CIDADE NUMERO ${i}`, slug: `cidade-numero-${i}`, regiao: 'sudeste', ciclos: [2026] }))
    const data = { ...ctx.data, states: async () => [{ uf: 'sp', regiao: 'sudeste', municipios: 645 }], citiesByUf: async () => big }
    const markup = await page({ ...testContext({ uf: 'sp' }), data })
    expect(markup).toContain('645 municípios')
    expect(markup.length).toBeLessThan(100_000)
  })
})
