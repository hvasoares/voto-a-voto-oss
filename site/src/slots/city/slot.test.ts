import { describe, expect, it } from 'vitest'
import { expectHydrated } from '../../shared/slot-test'
import { testContext } from '../../shared/test-context'
import { frameTexts } from './fixture'
import { meta, slot } from './slot'

const params = { uf: 'rj', slug: 'cidade-exemplo', regiao: 'sudeste', report: 'maiores-viradas' }
const ctx = testContext(params)
/** The markup the visitor sees: the panels of the views that are not shown (attribute hidden) are dropped. */
const visible = (markup: string) => markup.replace(/<div class="city-panel" data-view="[^"]+" hidden>[\s\S]*?(?=<div class="city-panel"|<\/div>\s*<a class="city-share")/g, '')
const page = async (c = ctx) => visible((await slot.render(c)).html.value)
const flat = (markup: string) => markup.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, '')
const anchors = (markup: string) => [...markup.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1]!.replace(/&amp;/g, '&'), text: m[2]!.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }))

describe('slot city (ticket #5)', () => {
  it('is hydrated (no "not yet hydrated" marker)', async () => {
    await expectHydrated(slot, ctx)
    expect(await page()).not.toContain('not yet hydrated')
  })

  it('declares its contract', () => {
    expect(meta.ticket).toBe(5)
    expect(meta.route).toBe('/:uf/:slug/')
    expect(meta.fixtureRoute).toBe('/rj/cidade-exemplo/?turno=1')
  })

  it('round 1 of the fixture city shows every text of the Sketch frame (except the prototype status bar)', async () => {
    const text = flat(await page(testContext(params, 'turno=1')))
    const missing = frameTexts
      .map((t) => t.text)
      .filter((t) => t !== '9:41')
      .map((t) => (t === 'Município fictício · UF' ? 'Município fictício · RJ' : t))
      .filter((t) => !text.includes(t.replace(/\s+/g, '')))
    expect(missing).toEqual([])
  })

  it('shows the city name and UF, from the dataset', async () => {
    const out = await slot.render(ctx)
    expect(out.html.value).toMatch(/<h1[^>]*>Cidade Exemplo<\/h1>/)
    expect(flat(out.html.value)).toContain('Municípiofictício·RJ')
    expect(out.title).toBe('Cidade Exemplo · RJ')
  })

  it('is the fixture banner for fixture data only', async () => {
    expect((await page()).replace(/ +/g, ' ')).toContain('EXEMPLO · DADOS FICTÍCIOS')
    const real = { ...ctx, data: { ...ctx.data, manifest: async () => ({ sources: [] }) } }
    const markup = await page(real)
    expect(markup).not.toContain('FICTÍCIOS')
    expect(markup).not.toContain('Dados fictícios')
    expect(flat(markup)).toContain('Fonte:TSE,dadosfinais')
  })

  it('links to the share page, the comparison, the three cycles, the state, home and "Sobre os dados"', async () => {
    const links = anchors(await page())
    const href = (t: string) => links.find((l) => l.text === t)?.href
    expect(href('Compartilhar')).toMatch(/^\/rj\/cidade-exemplo\/compartilhar\//)
    expect(href('Comparar com 2022 ›')).toBe('/comparar/2022/')
    expect(href('Ver os três ciclos ›')).toBe('/rj/cidade-exemplo/tres-ciclos/')
    expect(href('Ver o estado ›')).toBe('/rj/')
    expect(href('‹ Início')).toBe('/')
    expect(href('Sobre os dados ›')).toBe('/sobre-os-dados/')
  })

  it('the overseas post has no state to go to', async () => {
    const zz = testContext({ uf: 'zz', slug: 'exterior-exemplo' })
    expect(anchors(await page(zz)).map((l) => l.text)).not.toContain('Ver o estado ›')
  })

  it('shows 5 legend rows with votes and shares in round 1 and the generated sentence', async () => {
    const markup = await page(testContext(params, 'turno=1'))
    expect([...markup.matchAll(/class="legend__row"/g)]).toHaveLength(5)
    expect(flat(markup)).toContain(flat('Em Cidade Exemplo, no 1º turno de 2026, 30% do eleitorado não votou, quase tanto quanto o Candidato B recebeu (33,6%).'))
  })

  it('the default is the latest cycle and the latest round with data (2026, round 2)', async () => {
    const markup = await page()
    expect(markup).toContain('no 2º turno de 2026')
    expect(markup).toMatch(/href="[^"]*"[^>]*aria-current="true">2026</)
    expect(markup).toMatch(/aria-current="true">2º turno</)
  })

  it('puts every cycle and round into the page, hidden but present, so switching needs no request', async () => {
    const all = (await slot.render(ctx)).html.value
    const ids = [...all.matchAll(/class="city-panel" data-view="([^"]+)"/g)].map((m) => m[1])
    expect(ids).toEqual(['2018-1', '2018-2', '2022-1', '2022-2', '2026-1', '2026-2'])
    expect([...all.matchAll(/class="city-panel" data-view="[^"]+" hidden/g)]).toHaveLength(5)
  })

  it('?ciclo and ?turno choose the visible view; the tabs and the share link follow', async () => {
    const markup = await page(testContext(params, 'ciclo=2022&turno=1'))
    expect(flat(markup)).toContain('no1ºturnode2022')
    expect(markup).toMatch(/data-ciclo="2022" aria-current="true"/)
    expect(markup).toMatch(/data-turno="1" aria-current="true"/)
    expect(anchors(markup).find((l) => l.text === 'Compartilhar')?.href).toBe('/rj/cidade-exemplo/compartilhar/?ciclo=2022&turno=1')
  })

  it('a cycle without data for the city says so in plain words and never shows zeros', async () => {
    const boa = testContext({ uf: 'mt', slug: 'boa-esperanca-do-norte' }, 'ciclo=2018&turno=1')
    const markup = await page(boa)
    expect(markup).toContain('Sem dados nesse ciclo.')
    expect(markup).not.toContain('Votaram')
    expect(markup).not.toContain('class="bar"')
    const dflt = await page(testContext({ uf: 'mt', slug: 'boa-esperanca-do-norte' }))
    expect(flat(dflt)).toContain('no2ºturnode2026')
    expect(dflt).not.toContain('Sem dados')
  })

  it('numbers differ per view and come from the dataset (2022 round 2 of the fixture city)', async () => {
    const markup = await page(testContext(params, 'ciclo=2022&turno=2'))
    expect(flat(markup)).toContain('Votaram·70%')
    const t = await ctx.data.turnout({ ano: 2022, turno: 2, uf: 'rj', cdMunicipio: '99001' })
    expect(t[0]!.validos).toBe(69992)
    expect(flat(markup)).toContain('Votaram·70%doeleitorado')
  })
})
