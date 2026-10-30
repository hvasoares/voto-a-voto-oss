import { describe, expect, it } from 'vitest'
import { verifyFactSite } from './facts-gate'

import { pageDataFile } from '../src/shared/page-data'

/** A fact record of the data file, with what the gate looks at; `extra` overrides. */
const record = (anchor: string, extra: Record<string, unknown> = {}) => ({
  id: `rj/x/2026-1/${anchor}`,
  anchor,
  inputs: [],
  calculation: { formula: 'f', worked: ['1'] },
  source: { name: 'TSE', url: 'https://dadosabertos.tse.jus.br/' },
  ...extra,
})
const FP = 'abc123'
const dataPath = (page: string) => `data/v${FP}/fato/${page}.json`
/** The pair a calculation page publishes: its stub and its data file. */
const factPage = (page: string, records: Record<string, unknown>[], extra: Record<string, unknown> = {}) => ({
  [`fato/${page}/index.html`]: `<main data-page-path="${page}"><a data-stub-back href="/">Voltar</a></main>`,
  [dataPath(page)]: JSON.stringify(pageDataFile('fato', page, { facts: records, edition: { id: 'x' }, seal: ['conferido'], ...extra })),
})
const pageOf = (page: string, ...anchors: string[]) => factPage(page, anchors.map((a) => record(a)))
const card = (...anchors: string[]) => anchors.map((a) => `<a class="calc" href="/fato/rj/x/2026-1/#${a}">ver cálculo</a>`).join('')
const run = (site: Record<string, string>) => verifyFactSite(Object.keys(site), (f) => site[f]!)

describe('the site-level fact gate', () => {
  it('passes when every link lands on a record that shows source, calculation and edition', () => {
    expect(run({ 'rj/x/index.html': card('votaram', 'a'), ...pageOf('rj/x/2026-1', 'votaram', 'a') })).toEqual([])
  })
  it('fails a "ver cálculo" that goes to a page that was not built', () => {
    expect(run({ 'rj/x/index.html': card('votaram') })).toEqual(['rj/x/index.html: "ver cálculo" goes to fato/rj/x/2026-1/index.html, which was not built'])
  })
  it('fails a link to a record the page does not have', () => {
    expect(run({ 'rj/x/index.html': card('nulos'), ...pageOf('rj/x/2026-1', 'votaram') })).toEqual(['rj/x/index.html: "ver cálculo" goes to #nulos of fato/rj/x/2026-1/index.html, which has no such record'])
  })
  it('fails a record with no calculation, no source or no edition', () => {
    const bare = factPage('rj/x/2026-1', [{ id: 'rj/x/2026-1/a', anchor: 'a', inputs: [] }], { edition: undefined, seal: ['conferido'] })
    expect(run(bare)).toEqual([
      'fato/rj/x/2026-1/index.html: rj/x/2026-1/a shows no calculation',
      'fato/rj/x/2026-1/index.html: rj/x/2026-1/a names no source',
      'fato/rj/x/2026-1/index.html: no edition link',
    ])
  })
  it('fails a page whose file has no seal', () => {
    expect(run(factPage('rj/x/2026-1', [record('a')], { seal: [] }))).toEqual(['fato/rj/x/2026-1/index.html: no "conferido" seal'])
  })
  it('fails a stub without its data file, a data file without its stub, and a stub that has lost its link back', () => {
    expect(run({ 'fato/rj/x/2026-1/index.html': '<main data-page-path="rj/x/2026-1"><a data-stub-back>b</a></main>' })).toEqual(['fato/rj/x/2026-1/index.html: no data file for the page'])
    expect(run({ [dataPath('rj/x/2026-1')]: factPage('rj/x/2026-1', [record('a')])[dataPath('rj/x/2026-1')]! })).toEqual(['fato/rj/x/2026-1/index.html: a data file with no page'])
    expect(run({ ...pageOf('rj/x/2026-1', 'a'), 'fato/rj/x/2026-1/index.html': '<main data-page-path="rj/x/2026-1"></main>' })).toEqual(['fato/rj/x/2026-1/index.html: no link back'])
  })
  it('fails a data file that is not the page it claims to be', () => {
    const files = pageOf('rj/x/2026-1', 'a')
    files[dataPath('rj/x/2026-1')] = files[dataPath('rj/x/2026-1')]!.replace('"sum":"', '"sum":"0')
    expect(run(files)[0]).toMatch(/^data\/v.*: /)
  })
  describe('the reports, the hub, the state pages and the recap (#62)', () => {
    const link = (path: string, anchor: string) => `<a class="calc" href="/fato/${path}/#${anchor}">ver cálculo</a>`
    const page = (path: string, ...anchors: string[]) => pageOf(path, ...anchors)
        it('passes for a report, the hub, the state page and the recap that link to records that exist', () => {
      expect(
        run({
          'relatorios/maiores-viradas/index.html': link('relatorios/maiores-viradas/cidades', 'filtro'),
          'relatorios/index.html': link('relatorios/resumo', 'cidades-que-viraram'),
          'rj/index.html': link('estado/rj/municipios', 'municipios'),
          'rj/resumo/index.html': link('estado/rj/tres-ciclos', '2026-variacao'),
          ...page('relatorios/maiores-viradas/cidades', 'filtro'),
          ...page('relatorios/resumo', 'cidades-que-viraram'),
          ...page('estado/rj/municipios', 'municipios'),
          ...page('estado/rj/tres-ciclos', '2026-variacao'),
        }),
      ).toEqual([])
    })
    it('fails a report row whose record was not written', () => {
      expect(run({ 'relatorios/comparecimento/index.html': link('relatorios/comparecimento/cidades', 'alto-rj-x'), ...page('relatorios/comparecimento/cidades', 'baixo-rj-x') })).toEqual([
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
