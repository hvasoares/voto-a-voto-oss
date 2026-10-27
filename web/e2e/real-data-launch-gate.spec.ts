import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Locator } from '@playwright/test'
import { base } from './helpers'

/*
 * LAUNCH GATE (issue #21), criterion 2: at least 20 figures across screens (national, regional,
 * state, city, report) match TSE's own results site. No expected string below is typed from memory;
 * each one cites its source (`citation`), which is one of:
 *
 *  - "manifest": data/manifest.json national_reference (TSE published national totals; LIVE-EQUAL);
 *  - "note": thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md and the data-sources
 *    plan thoughts/shared/plans/2026-10-26-make-data-tse-sources.md (the spot figures recorded while the
 *    dataset was built from TSE's files);
 *  - "csv": derived from the committed dataset the pages pre-render from (data/turnout.csv,
 *    data/votes.csv) — cross-checked LIVE against the TSE results site by `npm run check:tse-live`
 *    (web/scripts/verify-tse-live.ts; recorded output: web/docs/launch-gate/tse-live-verification.json,
 *    44 city/national figures equal, 0 divergent, run 2026-10-27).
 *
 * The chain is: TSE results site -> committed dataset -> these rendered pages. `scope` pins the figure
 * inside a specific element (a tile, a panel) instead of the page text. Recorded output:
 * .captures/launch-gate/verified-numbers.json.
 */
test.skip(!existsSync(resolve('../data/cities.csv')), 'no ../data')

interface Figure { text: string; scope?: string; citation: string }

const LIVE = 'LIVE-EQUAL against resultados.tse.jus.br via npm run check:tse-live'

const SCREENS: Array<{ route: string; screen: string; figures: Figure[] }> = [
  {
    route: 'brasil/',
    screen: 'brasil (national bar + five regions)',
    figures: [
      // data/manifest.json national_reference["2026-2"]: candidates["13"]=64256232 (LIVE-EQUAL);
      // the 51,79% share of the two-way valid-vote sum is the page's own largest-remainder rounding,
      // derived in e2e/real-data-brasil.spec.ts from the same dataset
      { text: 'Lula 64.256.232 · 51,79%', citation: 'data/manifest.json national_reference 2026-2 .candidates.13 + ' + LIVE },
      { text: 'Flavio 59.826.041', citation: 'data/manifest.json national_reference 2026-2 .candidates.22 + ' + LIVE },
      // regions: thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md "What counted the most"
      { text: 'Sudeste 41,1% dos votos válidos do país', citation: 'note Sudeste 41.1% + data/turnout.csv/votes.csv' },
      { text: 'Nordeste 28,5% dos votos válidos do país', citation: 'note Nordeste 28.5%' },
      { text: 'Compareceram 83,5%', citation: 'note: Nordeste turnout 83.5%' },
      { text: 'Lula 69,4%', citation: 'note: Nordeste Lula 69.4%' },
      { text: 'Compareceram 81,8%', citation: 'note: Sul turnout 81.8%' },
      { text: 'Compareceram 78,8%', citation: 'note: Norte turnout 78.8%' },
    ],
  },
  {
    route: 'comparar/2022/',
    screen: 'comparar com 2022 (the six biggest states)',
    figures: [
      { text: 'SP 26.258.452 votos válidos', citation: 'data/turnout.csv (SP 2026 t2 validos; pin of src/lib/margins.test.ts) + ' + LIVE },
      { text: 'Lula 46,2% · 2022: 44,8% · +599.392 votos', citation: 'data/votes.csv SP 2026 t2 12.119.274 - 2022 t2 11.519.882; documented in web/src/lib/compare.ts' },
    ],
  },
  {
    route: 'mapa/',
    screen: 'mapa (state tiles + the SP panel)',
    figures: [
      { text: 'Votos válidos (2º turno): 26.258.452', citation: 'data/turnout.csv (SP 2026 t2; note rounds to 26.3M) + ' + LIVE },
      { text: '-7,7 pp. Na eleição anterior: -13,7 pp.', citation: 'data/votes.csv SP margins 2022/2026; pin of src/lib/margins.test.ts' },
      { text: '-7,7', scope: 'a[data-uf="sp"]', citation: 'data/votes.csv SP margin 2026 t2 (margins.test.ts pin)' },
      { text: '-6,2', scope: 'a[data-uf="rj"]', citation: 'data/votes.csv RJ margin 2026; note RJ swing +7.4' },
    ],
  },
  {
    route: 'mapa/virada/',
    screen: 'mapa/virada (state swing tiles)',
    figures: [
      { text: '+7,4', scope: 'a[data-uf="rj"]', citation: 'note: RJ +7.4 pp' },
      { text: '+7,3', scope: 'a[data-uf="al"]', citation: 'note: AL +7.3 pp' },
      { text: '+6,9', scope: 'a[data-uf="se"]', citation: 'note: SE +6.9 pp' },
      { text: '+5,8', scope: 'a[data-uf="mg"]', citation: 'note: MG -4.9 -> +0.9 (pp) = +5.8' },
    ],
  },
  {
    route: 'sp/sao-paulo/',
    screen: 'city card São Paulo',
    figures: [
      { text: 'Lula 3.864.354 · 56% dos votos', citation: 'data/votes.csv sp 71072 t2 cand 13 + ' + LIVE },
      { text: 'Flavio Bolsonaro 3.097.923 · 44% dos votos', citation: 'data/votes.csv sp 71072 t2 cand 22 + ' + LIVE },
      { text: 'Brancos 104.890 · 5% dos que não votaram', citation: 'identity in the sources plan (7.284.071 = 6.962.277 + 104.890 + 216.904) + data/turnout.csv + ' + LIVE },
      { text: 'Nulos 216.904 · 10% dos que não votaram', citation: 'sources plan + data/turnout.csv + ' + LIVE },
    ],
  },
  {
    route: 'rj/rio-de-janeiro/',
    screen: 'city card Rio de Janeiro',
    figures: [
      { text: 'Lula 1.898.391', citation: 'data/votes.csv rj 60011 t2 cand 13 + ' + LIVE },
      { text: 'Flavio Bolsonaro 1.785.198', citation: 'data/votes.csv rj 60011 t2 cand 22 + ' + LIVE },
    ],
  },
  {
    route: 'df/brasilia/',
    screen: 'city card Brasília',
    figures: [
      { text: 'Lula 825.224', citation: 'data/votes.csv df 97012 t2 cand 13 + ' + LIVE },
      { text: 'Flavio Bolsonaro 979.542', citation: 'data/votes.csv df 97012 t2 cand 22 + ' + LIVE },
    ],
  },
  {
    route: 'ba/salvador/',
    screen: 'city card Salvador',
    figures: [
      { text: 'Lula 1.154.072', citation: 'data/votes.csv ba 38490 t2 cand 13 + ' + LIVE },
    ],
  },
  {
    route: 'relatorios/',
    screen: 'relatorios hub',
    figures: [
      { text: 'Lula virou 211 cidades; Flavio Bolsonaro virou 1', citation: 'note: Lula flipped 211 cities, Flavio 1' },
    ],
  },
  {
    route: 'relatorios/cidades-que-viraram/',
    screen: 'relatório cidades que viraram',
    figures: [
      { text: 'Itabirito/MG', citation: 'note: largest flip Itabirito/MG' },
      { text: 'Margem -4,5 pp → +5,0 pp', citation: 'note: Itabirito -4.5pp -> +5.0pp' },
    ],
  },
  {
    route: 'relatorios/maiores-viradas/',
    screen: 'relatório maiores viradas (100 mil+)',
    figures: [
      { text: 'Campos dos Goytacazes/RJ', citation: 'note: Campos +9.8 pp, still lost by 15.8' },
      { text: '+9,8 pp', citation: 'note: Campos dos Goytacazes/RJ +9.8pp' },
    ],
  },
  {
    route: 'relatorios/votos-ganhos-e-perdidos/',
    screen: 'relatório votos ganhos e perdidos',
    figures: [
      { text: '+3.862.039 votos', citation: 'note: Lula gained 3.862.039 votes nationally (3.428 / 2.132 cities)' },
      { text: '+186.433 votos', citation: 'note "São Paulo +186k"; exact from data/votes.csv 3.864.354-3.677.921' },
      { text: '+1.591.101 votos', citation: 'note: Flavio vs Bolsonaro 2022 gained 1.591.101 votes' },
    ],
  },
  {
    route: 'relatorios/disputas-mais-apertadas/',
    screen: 'relatório disputas mais apertadas',
    figures: [
      { text: 'Empate: 1.530 a 1.530 votos', citation: 'note: Marquinho/PR tie (0) + ' + LIVE },
    ],
  },
  {
    route: 'relatorios/comparecimento/',
    screen: 'relatório comparecimento',
    figures: [
      { text: '90,5% · 4.769 de 5.272 eleitores aptos', citation: 'note: highest turnout Santa Maria do Herval/RS 90.5% + data/turnout.csv' },
      { text: '59,0% · 5.239 de 8.881 eleitores aptos', citation: 'note: lowest turnout Itaubal/AP 59.0% + data/turnout.csv' },
    ],
  },
]

test.describe.serial('launch gate: 20+ figures against TSE (issue #21)', () => {
  const checked: Array<{ screen: string; route: string; figure: string; citation: string }> = []

  for (const { route, screen, figures } of SCREENS) {
    test(`${screen}: ${figures.length} figure(s) match their sourced expectations`, async ({ page }) => {
      await page.goto(base + route)
      for (const figure of figures) {
        const container: Locator = figure.scope ? page.locator(figure.scope).first() : page.locator('body')
        // whitespace-flexible: innerText of element runs some labels together ("Sudeste41,1% · ...")
        const pattern = new RegExp(figure.text.split(' ').map(escape).join('\\s*\\n?\\s*'))
        await expect(container, `${route} · ${figure.text} (fonte: ${figure.citation})`).toContainText(pattern)
        checked.push({ screen, route: base + route, figure: figure.text, citation: figure.citation })
      }
    })
  }

  test('the tally: at least 20 figures over national, regional, state, city and report screens', () => {
    expect(checked.length).toBeGreaterThanOrEqual(20)
    expect(new Set(checked.map((c) => c.screen)).size).toBeGreaterThanOrEqual(10)
    const record = resolve('.captures', 'launch-gate')
    mkdirSync(record, { recursive: true })
    writeFileSync(resolve(record, 'verified-numbers.json'), JSON.stringify({
      note: 'Every figure carries its source in citation (see web/docs/launch-gate.md).',
      figuresChecked: checked.length,
      screens: [...new Set(checked.map((c) => c.screen))],
      checked,
    }, null, 2) + '\n')
  })
})

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}