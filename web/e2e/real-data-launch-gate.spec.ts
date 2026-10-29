import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Locator } from '@playwright/test'
import { base } from './helpers'
import { dataGuard } from './presets'
import {
  candidateVotes, catalogText, cityBySlug, cityVotes, closestRaces, dec1, flips, int, latestRound, marginPp, placeLabel, regions, shareText, signedDec1, signedInt, swingPp, swingRows, turnoutRanking, turnoutSum, twoWayShare, votesChange,
} from './real-data-oracle'

/*
 * LAUNCH GATE (issue #21), criterion 2: at least 20 figures across screens (national, regional,
 * state, city, report) match TSE's own results site. No expected string below is typed: each figure is counted
 * by the oracle (real-data-oracle.ts) from the committed dataset the pages pre-render from (the build's data
 * directory: turnout.csv, votes.csv, cities.csv) and carries its `citation`, which names what it is counted from:
 *
 *  - "manifest": data/manifest.json national_reference (TSE published national totals; LIVE-EQUAL), checked against the same
 *    counting in real-data-brasil.spec.ts;
 *  - "csv": counted from the dataset, cross-checked LIVE against the TSE results site by `npm run check:tse-live`
 *    (web/scripts/verify-tse-live.ts; recorded output: web/docs/launch-gate/tse-live-verification.json).
 *
 * The chain is: TSE results site -> committed dataset -> these rendered pages. `scope` pins the figure
 * inside a specific element (a tile, a panel) instead of the page text. Recorded output:
 * .captures/launch-gate/verified-numbers.json. The sentences the pages take from the catalog are the catalog's.
 */
const SKIP = dataGuard()
test.skip(...SKIP)

interface Figure { text: string; scope?: string; citation: string; ignoreCase?: boolean }

const LIVE = 'LIVE-EQUAL against resultados.tse.jus.br via npm run check:tse-live'
const LULA = '13'
const FLAVIO = '22'
const ROUND = { ano: 2026, turno: 2 }
const ROUND1 = { ano: 2026, turno: 1 }
const PREVIOUS = { ano: 2022, turno: 2 }
const REGION_NAME: Record<string, string> = { norte: 'Norte', nordeste: 'Nordeste', sudeste: 'Sudeste', sul: 'Sul', 'centro-oeste': 'Centro-Oeste' }
const cidades = (n: number) => (n === 1 ? '1' : `${int(n)} cidades`)
const csv = (what: string) => `${what} counted from the build's data directory + ${LIVE}`

/** Every screen with its figures, all counted from the data directory. */
function screens(): Array<{ route: string; screen: string; figures: Figure[] }> {
  const both = [candidateVotes(ROUND, LULA), candidateVotes(ROUND, FLAVIO)]
  const regionOrder = regions()
  const regionValidos = regionOrder.map((regiao) => turnoutSum(ROUND, { regiao }).validos)
  const regionShare = (regiao: string) => `${REGION_NAME[regiao]} ${catalogText('brasil.regionShare', { p: shareText(regionValidos, regionOrder.indexOf(regiao)) })}`
  const regionTurnout = (regiao: string) => {
    const t = turnoutSum(ROUND, { regiao })
    const parts = [t.comparecimento, t.aptos - t.comparecimento]
    return catalogText('brasil.turnout', { c: shareText(parts, 0), n: shareText(parts, 1) })
  }
  const nordeste = [candidateVotes(ROUND, LULA, { regiao: 'nordeste' }), candidateVotes(ROUND, FLAVIO, { regiao: 'nordeste' })]
  const sp = { uf: 'sp' }
  const six = (numero: string, round = ROUND) => candidateVotes(round, numero, sp)
  const spCity = 'sao-paulo'
  const spCityRow = cityBySlug('sp', spCity)
  const spTurnout = turnoutSum(ROUND, { uf: 'sp', cd: spCityRow.cd })
  const spParts = [spTurnout.aptos - spTurnout.comparecimento, spTurnout.brancos, spTurnout.nulos]
  const spCityShare = [cityVotes(ROUND, LULA, 'sp', spCity), cityVotes(ROUND, FLAVIO, 'sp', spCity)]
  const m = (uf: string) => ({ margin2: marginPp(ROUND, LULA, FLAVIO, { uf }), margin1: marginPp(ROUND1, LULA, FLAVIO, { uf }) })
  const lulaChange = votesChange(LULA, ROUND, PREVIOUS)
  const flavioChange = votesChange(FLAVIO, ROUND, PREVIOUS)
  const flipList = flips(2026, LULA, FLAVIO, 5_000)
  const biggestSwing = swingRows(2026, LULA, FLAVIO).filter((r) => r.validos >= 100_000)[0]!
  const tie = closestRaces(ROUND)[0]!
  const ranking = turnoutRanking(latestRound(), 5_000)
  const volume = (r: (typeof ranking)[number]) => `${dec1(r.rate)}% · ${int(r.comparecimento)} de ${int(r.aptos)} eleitores aptos`
  const city = (uf: string, slug: string, numero: string) => int(cityVotes(ROUND, numero, uf, slug))

  return [
    {
      route: 'brasil/',
      screen: 'brasil (national bar + five regions)',
      figures: [
        { text: `Lula ${shareText(both, 0, 2)}%`, citation: csv("the page's own two-way valid-vote share of Lula (largest remainder)") },
        { text: catalogText('brasil.votes', { name: 'Lula', votos: int(both[0]!) }), citation: `data/manifest.json national_reference 2026-2 candidates + ${LIVE}` },
        { text: `Flávio Bolsonaro ${int(both[1]!)}`, citation: `data/manifest.json national_reference 2026-2 candidates + ${LIVE}` },
        { text: regionShare('sudeste'), citation: csv('the region share of the valid votes') },
        { text: regionShare('nordeste'), citation: csv('the region share of the valid votes') },
        { text: regionTurnout('nordeste'), citation: csv('the region turnout') },
        { text: `Lula ${shareText(nordeste, 0)}%`, citation: csv('the region two-way share') },
        { text: regionTurnout('sul'), citation: csv('the region turnout') },
        { text: regionTurnout('norte'), citation: csv('the region turnout') },
      ],
    },
    {
      route: 'comparar/2022/',
      screen: 'comparar com 2022 (the six biggest states)',
      figures: [
        { text: `SP ${int(turnoutSum(ROUND, sp).validos)} votos válidos`, citation: csv('SP valid votes') },
        { text: `Lula ${dec1(twoWayShare(ROUND, LULA, FLAVIO, sp))}% · 2022: ${dec1(twoWayShare(PREVIOUS, LULA, FLAVIO, sp))}% · ${signedInt(six(LULA) - six(LULA, PREVIOUS))} votos`, citation: csv('SP Lula votes 2026 minus 2022') },
      ],
    },
    {
      route: 'mapa/',
      screen: 'mapa (state tiles + the SP panel)',
      figures: [
        { text: `Votos válidos (2º turno): ${int(turnoutSum(ROUND, sp).validos)}`, citation: csv('SP valid votes') },
        { text: `${signedDec1(m('sp').margin2)} pp. Na eleição anterior: ${signedDec1(m('sp').margin1)} pp.`, citation: csv('SP margins of the two rounds') },
        { text: signedDec1(m('sp').margin2), scope: 'a[data-uf="sp"]', citation: csv('SP margin 2026 round 2') },
        { text: signedDec1(m('rj').margin2), scope: 'a[data-uf="rj"]', citation: csv('RJ margin 2026 round 2') },
      ],
    },
    {
      route: 'mapa/virada/',
      screen: 'mapa/virada (state swing tiles)',
      figures: ['rj', 'al', 'se', 'mg'].map((uf) => ({ text: signedDec1(swingPp(2026, LULA, FLAVIO, { uf })), scope: `a[data-uf="${uf}"]`, citation: csv(`${uf.toUpperCase()} swing, round-2 margin minus round-1 margin, unrounded`) })),
    },
    {
      route: 'sp/sao-paulo/',
      screen: 'city card São Paulo',
      figures: [
        { text: `Lula ${int(spCityShare[0]!)} · ${shareText(spCityShare, 0, 0)}% dos votos`, citation: csv('São Paulo Lula votes and two-way share') },
        { text: `Flávio Bolsonaro ${int(spCityShare[1]!)} · ${shareText(spCityShare, 1, 0)}% dos votos`, citation: csv('São Paulo Flávio votes and two-way share') },
        { text: `Brancos ${int(spTurnout.brancos)} · ${shareText(spParts, 1, 0)}% dos que não votaram`, citation: csv('São Paulo brancos, share of the eligible who did not vote for anyone') },
        { text: `Nulos ${int(spTurnout.nulos)} · ${shareText(spParts, 2, 0)}% dos que não votaram`, citation: csv('São Paulo nulos, share of the eligible who did not vote for anyone') },
      ],
    },
    {
      route: 'rj/rio-de-janeiro/',
      screen: 'city card Rio de Janeiro',
      figures: [
        { text: `Lula ${city('rj', 'rio-de-janeiro', LULA)}`, citation: csv('Rio Lula votes') },
        { text: `Flávio Bolsonaro ${city('rj', 'rio-de-janeiro', FLAVIO)}`, citation: csv('Rio Flávio votes') },
      ],
    },
    {
      route: 'df/brasilia/',
      screen: 'city card Brasília',
      figures: [
        { text: `Lula ${city('df', 'brasilia', LULA)}`, citation: csv('Brasília Lula votes') },
        { text: `Flávio Bolsonaro ${city('df', 'brasilia', FLAVIO)}`, citation: csv('Brasília Flávio votes') },
      ],
    },
    {
      route: 'ba/salvador/',
      screen: 'city card Salvador',
      figures: [{ text: `Lula ${city('ba', 'salvador', LULA)}`, citation: csv('Salvador Lula votes') }],
    },
    {
      route: 'relatorios/',
      screen: 'relatorios hub',
      figures: [{ text: `Lula virou ${cidades(flips(2026, LULA, FLAVIO).length)}; Flávio Bolsonaro virou ${cidades(flips(2026, FLAVIO, LULA).length)}`, citation: csv('the cities each candidate flipped between the rounds') }],
    },
    {
      route: 'relatorios/cidades-que-viraram/',
      screen: 'relatório cidades que viraram',
      figures: [
        { text: placeLabel(flipList[0]!.city), ignoreCase: true, citation: csv('the flipped city of 5 mil+ valid votes with the biggest swing') },
        { text: `Margem ${signedDec1(flipList[0]!.margin1)} pp → ${signedDec1(flipList[0]!.margin2)} pp`, citation: csv('its margins of the two rounds') },
      ],
    },
    {
      route: 'relatorios/maiores-viradas/',
      screen: 'relatório maiores viradas (100 mil+)',
      figures: [
        { text: placeLabel(biggestSwing.city), ignoreCase: true, citation: csv('the 100 mil+ city with the biggest swing') },
        { text: `${signedDec1(biggestSwing.swing)} pp`, citation: csv('its swing') },
      ],
    },
    {
      route: 'relatorios/votos-ganhos-e-perdidos/',
      screen: 'relatório votos ganhos e perdidos',
      figures: [
        { text: `${signedInt(lulaChange.total)} votos`, citation: csv('Lula net votes 2026 minus 2022, summed city by city') },
        { text: `${signedInt(lulaChange.rows[0]!.diff)} votos`, citation: csv('the city with the biggest Lula gain') },
        { text: `${signedInt(flavioChange.total)} votos`, citation: csv('Flávio net votes against 2022, summed city by city') },
      ],
    },
    {
      route: 'relatorios/disputas-mais-apertadas/',
      screen: 'relatório disputas mais apertadas',
      figures: [{ text: `Empate: ${int(tie.first)} a ${int(tie.second)} votos`, citation: csv('the tie between the two first candidates') }],
    },
    {
      route: 'relatorios/comparecimento/',
      screen: 'relatório comparecimento',
      figures: [
        { text: volume(ranking[0]!), citation: csv('the highest turnout among cities of 5 mil+ eligible voters') },
        { text: volume(ranking.at(-1)!), citation: csv('the lowest turnout among cities of 5 mil+ eligible voters') },
      ],
    },
  ]
}

const SCREENS = SKIP[0] ? [] : screens()

test.describe.serial('launch gate: 20+ figures against TSE (issue #21)', () => {
  const checked: Array<{ screen: string; route: string; figure: string; citation: string }> = []

  for (const { route, screen, figures } of SCREENS) {
    test(`${screen}: ${figures.length} figure(s) match their sourced expectations`, async ({ page }) => {
      await page.goto(base + route)
      for (const figure of figures) {
        const container: Locator = figure.scope ? page.locator(figure.scope).first() : page.locator('body')
        // whitespace-flexible: innerText of element runs some labels together ("Sudeste41,1% · ..."); the city card's source links (#61) may sit between a label and its figure
        const pattern = new RegExp(figure.text.split(' ').map(escape).join(`\\s*\\n?\\s*(?:${escape(catalogText('fact.link'))}\\s*)?`), figure.ignoreCase ? 'i' : '')
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