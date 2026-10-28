import { describe, expect, it } from 'vitest'
import type { Candidate, Turnout, Vote } from '../data'
import { buildCycleBlocks } from '../lib/compare'
import { previewDescription } from '../lib/link-preview'
import { buildRecap } from '../lib/recap'
import { recapCardSvg } from '../lib/recap-card'
import { shareCardSvg } from '../lib/share-card'
import { buildCycleBlock } from '../slots/city-cycles/cycles-model'
import { toLegendRows, toTurnoutBarProps } from './city-figures'
import { leader as leaderOf, buildCityResult } from './city-model'
import { candidateRow, turnoutBar } from './components'
import { CANDIDATES, type RunoffCycle } from './candidates'
import { colors } from './tokens'

/*
 * #104: the two runoff candidates are listed in BALLOT-NUMBER order (the lower number first, red first) on every screen and picture
 * of the City card family, whoever leads the city. The same two candidates are fed to each consumer, in a city won by the first,
 * one won by the second and a tie, and each must hand back the identity table's order.
 */
const CYCLES = [2018, 2022, 2026] as const
const SCENARIOS = [
  ['won by the first candidate', 450, 300],
  ['won by the second candidate', 300, 450],
  ['a tie', 375, 375],
] as const

const candidatesOf = (ano: RunoffCycle): Candidate[] => CANDIDATES[ano].map((c) => ({ ano, turno: 2, candidatoNumero: c.numero, nomeUrna: c.urna, partido: 'P' }))
const turnout = (ano: number): Turnout => ({ ano, turno: 2, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 20, nulos: 30, anuladosApuSep: 0, validos: 750 })
const votesOf = (ano: RunoffCycle, first: number, second: number): Vote[] => CANDIDATES[ano].map((c, i) => ({ ano, turno: 2, uf: 'rj', cdMunicipio: '1', candidatoNumero: c.numero, votos: i === 0 ? first : second }))
const resultOf = (ano: RunoffCycle, first: number, second: number) => buildCityResult({ turnout: turnout(ano), votes: votesOf(ano, first, second), candidates: candidatesOf(ano) })
const picture = { cityName: 'Cidade', ufLabel: 'RJ', alt: 'x', address: 'a.b/c' }
/** The names in the order they first appear in `text`. */
const orderIn = (text: string, names: readonly string[]) => names.map((n) => [n, text.indexOf(n)] as const).filter(([, i]) => i >= 0).sort((x, y) => x[1] - y[1]).map(([n]) => n)

describe.each(CYCLES)('ballot order on every consumer: %i', (ano) => {
  const [a, b] = CANDIDATES[ano]
  const first = (n: string) => n.split(' ')[0]!

  it.each(SCENARIOS)('%s: the card, legend, text alternative, picture, preview, three-cycle and recap list the lower ballot number first', (_name, v1, v2) => {
    const r = resultOf(ano, v1, v2)
    const bars = turnoutBar(toTurnoutBarProps(r)).value
    // the card: bars, legend and the bar's text alternative
    expect(bars.indexOf('bar__seg--a')).toBeLessThan(bars.indexOf('bar__seg--b'))
    expect(toLegendRows(r).slice(0, 2).map((row) => candidateRow(row).value.match(/legend__swatch--(\w)/)![1])).toEqual(['a', 'b'])
    expect(toLegendRows(r).slice(0, 2).map((row) => row.label)).toEqual([a.name, b.name])
    const alt = bars.match(/aria-label="Votaram, por candidato: ([^"]*)"/)![1]!
    expect(orderIn(alt, [a.name, b.name])).toEqual([a.name, b.name])
    // the share picture and the link preview picture (the same drawing)
    const svg = shareCardSvg(r, picture)
    expect(svg.indexOf(`fill="${colors.lula}"`)).toBeGreaterThan(-1)
    expect(svg.indexOf(`fill="${colors.lula}"`)).toBeLessThan(svg.indexOf(`fill="${colors.bolsonaro}"`))
    expect(orderIn(svg, [first(a.name), first(b.name)])).toEqual([first(a.name), first(b.name)])
    // the link-preview description
    const text = previewDescription(r, { nome: 'Cidade', uf: 'rj' })
    expect(orderIn(text, [a.name, b.name])).toEqual([a.name, b.name])
    // the three-cycle page and Meu Brasil card read the same cycle block
    const block = buildCycleBlock({ ano, turno: 2, city: { ciclos: [ano] }, result: r })
    expect(block.status === 'data' && block.sides.map((s) => s.label)).toEqual([a.name, b.name])
    // the state recap (its sides come from the pair's ballot numbers, left = lower)
    const blocks = buildCycleBlocks({ tallies: new Map([[ano, { validos: 1000, left: v1, rival: v2 }]]), labels: { [ano]: { left: a.short, rival: b.short } } })
    const recap = buildRecap('rj', blocks)
    expect(orderIn(recapCardSvg(recap, { stateName: 'Rio', address: 'a.b/c' }).svg, [a.short, b.short])).toEqual([a.short, b.short])
  })

  it('the same result gives the same segment order and colours in every city: the colour follows the candidate', () => {
    const [first, second] = [resultOf(ano, 450, 300), resultOf(ano, 300, 450)]
    for (const r of [first, second]) expect(r.voted.map((s) => [s.label, s.tone, s.numero])).toEqual([[a.name, 'a', a.numero], [b.name, 'b', b.numero]])
  })
})

describe('leader(): who is ahead is computed from the votes, not from the position', () => {
  const r = (v1: number, v2: number) => resultOf(2022, v1, v2)
  it('the first candidate when it has more votes', () => expect(leaderOf(r(450, 300))?.label).toBe('Lula'))
  it('the second candidate when it has more votes, though it is listed second', () => {
    const result = r(300, 450)
    expect(result.voted[0]!.label).toBe('Lula')
    expect(leaderOf(result)?.label).toBe('Jair Bolsonaro')
    expect(leaderOf(result)?.key).toBe('b')
  })
  it('nobody on a tie, and nobody with one candidate', () => {
    expect(leaderOf(r(375, 375))).toBeUndefined()
    const lone = buildCityResult({ turnout: turnout(2022), votes: [votesOf(2022, 400, 0)[0]!], candidates: candidatesOf(2022).slice(0, 1) })
    expect(leaderOf(lone)).toBeUndefined()
  })
  it('the ranking still puts the true leader first (the margin and headline read it)', () => {
    expect(r(300, 450).ranking.map((c) => c.numero)).toEqual([22, 13])
  })
})

describe('real-data shape: 2018, Haddad (13) loses most cities but is listed first', () => {
  it('a city won by Bolsonaro lists Haddad first, red, with the true shares', () => {
    const r = resultOf(2018, 3_000, 7_000)
    expect(r.voted.map((s) => [s.label, s.pct, s.tone])).toEqual([['Fernando Haddad', 30, 'a'], ['Jair Bolsonaro', 70, 'b']])
    expect(leaderOf(r)?.label).toBe('Jair Bolsonaro')
    expect(previewDescription(r, { nome: 'Cidade', uf: 'rj' })).toMatch(/Fernando Haddad recebeu 30% e Jair Bolsonaro 70%\./)
  })
})

describe('round 1 and odd results keep working', () => {
  const urna = (n: number, nomeUrna: string): Candidate => ({ ano: 2022, turno: 1, candidatoNumero: n, nomeUrna, partido: 'P' })
  const v = (n: number, votos: number): Vote => ({ ano: 2022, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: n, votos })
  it('the two with most votes are shown in ballot order, "Outros" stays last', () => {
    const r = buildCityResult({ turnout: { ...turnout(2022), turno: 1 }, votes: [v(22, 400), v(13, 300), v(12, 50)], candidates: [urna(13, 'LULA'), urna(22, 'JAIR BOLSONARO'), urna(12, 'CIRO GOMES')] })
    expect(r.voted.map((s) => s.key)).toEqual(['a', 'b', 'outros'])
    expect(r.voted.map((s) => s.label.replace(/ \(\d+\)/, ''))).toEqual(['Lula', 'Jair Bolsonaro', 'Outros candidatos'])
    expect(leaderOf(r)?.label).toBe('Jair Bolsonaro')
  })
  it('one candidate missing: one segment, no crash, the preview keeps the single-share wording', () => {
    const r = buildCityResult({ turnout: turnout(2022), votes: [votesOf(2022, 400, 0)[0]!], candidates: candidatesOf(2022).slice(0, 1) })
    expect(r.voted.map((s) => s.key)).toEqual(['a'])
    expect(previewDescription(r, { nome: 'Cidade', uf: 'rj' })).toContain('Lula recebeu')
  })
})
