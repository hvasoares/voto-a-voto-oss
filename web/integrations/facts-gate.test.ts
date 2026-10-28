import { describe, expect, it } from 'vitest'
import { verifyFactSite } from './facts-gate'

const record = (anchor: string, extra = '') =>
  `<section class="fact" id="${anchor}" data-fact="rj/x/2026-1/${anchor}"><dl class="fact__inputs"></dl><p class="fact__formula">f</p><ol class="fact__worked"><li>1</li></ol>${extra}</section>`
const factPage = (...anchors: string[]) => `<main>${anchors.map((a) => record(a)).join('')}<a href="https://dadosabertos.tse.jus.br/">TSE</a><a data-edition-link href="/edicoes/x/">Edição</a><aside data-seal>Conferido</aside></main>`
const card = (...anchors: string[]) => anchors.map((a) => `<a class="calc" href="/fato/rj/x/2026-1/#${a}">ver cálculo</a>`).join('')
const run = (site: Record<string, string>) => verifyFactSite(Object.keys(site), (f) => site[f]!)

describe('the site-level fact gate', () => {
  it('passes when every link lands on a record that shows source, calculation and edition', () => {
    expect(run({ 'rj/x/index.html': card('votaram', 'a'), 'fato/rj/x/2026-1/index.html': factPage('votaram', 'a') })).toEqual([])
  })
  it('fails a "ver cálculo" that goes to a page that was not built', () => {
    expect(run({ 'rj/x/index.html': card('votaram') })).toEqual(['rj/x/index.html: "ver cálculo" goes to fato/rj/x/2026-1/index.html, which was not built'])
  })
  it('fails a link to a record the page does not have', () => {
    expect(run({ 'rj/x/index.html': card('nulos'), 'fato/rj/x/2026-1/index.html': factPage('votaram') })).toEqual(['rj/x/index.html: "ver cálculo" goes to #nulos of fato/rj/x/2026-1/index.html, which has no such record'])
  })
  it('fails a record page with no calculation, no source or no edition', () => {
    const bare = '<section class="fact" id="a" data-fact="rj/x/2026-1/a"><dl class="fact__inputs"></dl></section>'
    expect(run({ 'fato/rj/x/2026-1/index.html': bare })).toEqual([
      'fato/rj/x/2026-1/index.html: rj/x/2026-1/a shows no calculation',
      'fato/rj/x/2026-1/index.html: no source link',
      'fato/rj/x/2026-1/index.html: no edition link',
      'fato/rj/x/2026-1/index.html: no "conferido" seal',
    ])
  })
  it('fails a record page without the seal', () => {
    const noSeal = factPage('a').replace('<aside data-seal>Conferido</aside>', '')
    expect(run({ 'fato/rj/x/2026-1/index.html': noSeal })).toEqual(['fato/rj/x/2026-1/index.html: no "conferido" seal'])
  })
  describe('the reports, the hub, the state pages and the recap (#62)', () => {
    const link = (path: string, anchor: string) => `<a class="calc" href="/fato/${path}/#${anchor}">ver cálculo</a>`
    const page = (...anchors: string[]) => factPage(...anchors)
    it('passes for a report, the hub, the state page and the recap that link to records that exist', () => {
      expect(
        run({
          'relatorios/maiores-viradas/index.html': link('relatorios/maiores-viradas/cidades', 'filtro'),
          'relatorios/index.html': link('relatorios/resumo', 'cidades-que-viraram'),
          'rj/index.html': link('estado/rj/municipios', 'municipios'),
          'rj/resumo/index.html': link('estado/rj/tres-ciclos', '2026-variacao'),
          'fato/relatorios/maiores-viradas/cidades/index.html': page('filtro'),
          'fato/relatorios/resumo/index.html': page('cidades-que-viraram'),
          'fato/estado/rj/municipios/index.html': page('municipios'),
          'fato/estado/rj/tres-ciclos/index.html': page('2026-variacao'),
        }),
      ).toEqual([])
    })
    it('fails a report row whose record was not written', () => {
      expect(run({ 'relatorios/comparecimento/index.html': link('relatorios/comparecimento/cidades', 'alto-rj-x'), 'fato/relatorios/comparecimento/cidades/index.html': page('baixo-rj-x') })).toEqual([
        'relatorios/comparecimento/index.html: "ver cálculo" goes to #alto-rj-x of fato/relatorios/comparecimento/cidades/index.html, which has no such record',
      ])
    })
    it('fails a hub row, a state page or a recap that links to a page that was not built', () => {
      expect(run({ 'relatorios/index.html': link('relatorios/resumo', 'votos-ganhos-e-perdidos'), 'rj/index.html': link('estado/rj/municipios', 'municipios'), 'rj/resumo/index.html': link('estado/rj/tres-ciclos', '2018-variacao') })).toEqual([
        'relatorios/index.html: "ver cálculo" goes to fato/relatorios/resumo/index.html, which was not built',
        'rj/index.html: "ver cálculo" goes to fato/estado/rj/municipios/index.html, which was not built',
        'rj/resumo/index.html: "ver cálculo" goes to fato/estado/rj/tres-ciclos/index.html, which was not built',
      ])
    })
  })
})
