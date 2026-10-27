import { describe, expect, it } from 'vitest'
import { verifyFactSite } from './facts-gate'

const record = (anchor: string, extra = '') =>
  `<section class="fact" id="${anchor}" data-fact="rj/x/2026-1/${anchor}"><dl class="fact__inputs"></dl><p class="fact__formula">f</p><ol class="fact__worked"><li>1</li></ol>${extra}</section>`
const factPage = (...anchors: string[]) => `<main>${anchors.map((a) => record(a)).join('')}<a href="https://dadosabertos.tse.jus.br/">TSE</a><a data-edition-link href="/edicoes/x/">Edição</a></main>`
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
    ])
  })
})
