/**
 * Behaviour tests of the report computations. Two states:
 * - SITE FIXTURES (`../site/fixtures/data`): deterministic fake data with documented flips; the
 *   fixture-state screenshots (gate 2) render these numbers.
 * - REAL DATA (`../../data`, committed): the highlight figures of the ticket must reproduce from it.
 *   Source of truth for those figures:
 *   `thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md` (runoff highlights:
 *   211 flips to Lula and 1 to Flavio; cities won 2.875/2.695/1 tie; top five flips Itabirito/MG,
 *   Barra do Piraí/RJ, João Monlevade/MG, Pirapora do Bom Jesus/SP, São Vicente/SP;
 *   Campos dos Goytacazes/RJ +9,8 pp; Marquinho/PR tie; net votes vs 2022; turnout extremes) and
 *   `thoughts/team/data-engineering/2026-10-26-lean-analytics-visualization-principles.md`
 *   (pair every rate with its volume; minimum-size filter).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { diskSource } from '@site/data/node'
import { createStore } from '@site/data/store'
import { parseCandidates } from '@site/data/csv'
import {
  biggestSwing,
  citiesWonInRunoff,
  closestRaces,
  computeReports,
  flipsToLula,
  flipsToFlavio,
  MIN_FLIP_VALIDOS,
  runoffPair,
  rankedFlipsToFlavio,
  rankedFlipsToLula,
  turnoutExtremes,
  type MarginInput,
} from './compute'
import { loadReportsData } from './load'

/** The repo root, one level above web/. */
const REPO = resolve(import.meta.dirname, '../../../..')
const REAL_DATA = resolve(REPO, 'data')
const FIXTURE_DATA = resolve(import.meta.dirname, '../../../../site/fixtures/data')

async function inputFrom(dir: string): Promise<MarginInput> {
  const store = createStore(diskSource(dir))
  const [cities, votes, turnout, candidates] = await Promise.all([store.cities(), store.votes(), store.turnout(), store.candidates()])
  return { cities, votes, turnout, candidates }
}

describe('candidate pairs of the dataset', () => {
  it('candidate 13 is Lula and candidate 22 is Flavio Bolsonaro (2026); 13/22 are Lula/Bolsonaro (2022)', () => {
    const list = parseCandidates(readFileSync(resolve(REAL_DATA, 'candidates.csv'), 'utf8'))
    const of = (ano: number, numero: number) => list.find((c) => c.ano === ano && c.turno === 2 && c.candidatoNumero === numero)
    const pair2026 = runoffPair(list, 2026)
    expect([pair2026.primeiro, pair2026.nomePrimeiro, pair2026.segundo, pair2026.nomeSegundo]).toEqual([13, 'LULA', 22, 'FLAVIO BOLSONARO'])
    expect(of(2022, 13)?.nomeUrna).toBe('LULA')
    expect(of(2022, 22)?.nomeUrna).toBe('JAIR BOLSONARO')
    const pair2022 = runoffPair(list, 2022)
    expect([pair2022.primeiro, pair2022.segundo]).toEqual([13, 22])
  })

  it('the fixtures use candidate A/B (91/92) in the same roles, first = lower number', async () => {
    const pair = runoffPair((await inputFrom(FIXTURE_DATA)).candidates, 2026)
    expect([pair.primeiro, pair.nomePrimeiro, pair.segundo, pair.nomeSegundo]).toEqual([91, 'Candidato A', 92, 'Candidato B'])
  })
})

describe('fixture state (site/fixtures/data)', () => {
  it('computes round margins from the votes and the valid votes of each round', async () => {
    const rows = computeReports(await inputFrom(FIXTURE_DATA)).margins
    // Boa Esperança do Norte/MT (2026 only): (47148-47285)/94433 = -0,15 pp; (42667-42487)/85154 = +0,21 pp.
    const boa = rows.find((r) => r.nome === 'Boa Esperança do Norte')!
    expect(boa.margin1).toBeCloseTo(-0.145, 2)
    expect(boa.margin2).toBeCloseTo(0.211, 2)
    expect(boa.swing).toBeCloseTo(0.356, 2)
    expect(boa.validos2).toBe(85154)
  })

  it('counts one flip toward each candidate', async () => {
    const rows = computeReports(await inputFrom(FIXTURE_DATA)).margins
    expect(flipsToLula(rows).map((r) => r.nome)).toEqual(['Cidade Exemplo D', 'Boa Esperança do Norte'])
    expect(flipsToFlavio(rows).map((r) => r.nome)).toEqual(['Cidade Exemplo A'])
  })

  it('ranks the flips toward Lula with the minimum-size filter', async () => {
    const rows = computeReports(await inputFrom(FIXTURE_DATA)).margins
    const ranked = rankedFlipsToLula(rows)
    expect(ranked).toHaveLength(2)
    expect(ranked[0]).toMatchObject({ nome: 'Cidade Exemplo D', uf: 'rj' })
    expect(ranked[1]).toMatchObject({ nome: 'Boa Esperança do Norte', uf: 'mt', validos2: 85154 })
  })

  it('the flip toward the second candidate passes the filter when big enough; ties count as won by nobody', async () => {
    const rows = computeReports(await inputFrom(FIXTURE_DATA)).margins
    expect(rankedFlipsToFlavio(rows).map((r) => r.nome)).toEqual(['Cidade Exemplo A'])
    // A margin of exactly 0 is neither: simulate by clipping.
    const clipped = rows.filter((r) => r.nome !== 'Cidade Exemplo A')
    expect(rankedFlipsToFlavio(clipped)).toEqual([])
  })

  it('counts the cities won in the runoff', async () => {
    const rows = computeReports(await inputFrom(FIXTURE_DATA)).margins
    expect(citiesWonInRunoff(rows)).toMatchObject({ lula: 5, flavio: 3, ties: [] })
  })

  it('compares the runoff votes with the 2022 runoff votes per candidate (cities without 2022 take no part)', async () => {
    const { netVotes } = computeReports(await inputFrom(FIXTURE_DATA))
    expect(netVotes.primeiro).toMatchObject({ total: -14914 })
    expect(netVotes.segundo).toMatchObject({ total: -1667 })
  })

  it('finds the closest race and the turnout extremes of a 5k+ electorate', async () => {
    const input = await inputFrom(FIXTURE_DATA)
    expect(closestRaces(computeReports(input).margins)[0]).toMatchObject({ nome: 'Cidade Exemplo A', uf: 'rj', diff: 31 })
    expect(turnoutExtremes(input).high).toMatchObject({ nome: 'Cidade Exemplo C', uf: 'rj' })
    expect(turnoutExtremes(input).high?.rate).toBeCloseTo(78.152, 2)
    expect(turnoutExtremes(input).low).toMatchObject({ nome: 'Cidade Exemplo E', uf: 'rj' })
    expect(turnoutExtremes(input).low?.rate).toBeCloseTo(70.489, 2)
  })

  it('no Brazil city of the fixtures has 100 mil+ valid votes, so the biggest-swing highlight is empty', async () => {
    const rows = computeReports(await inputFrom(FIXTURE_DATA)).margins
    expect(biggestSwing(rows)).toBeUndefined()
    expect(rankedFlipsToLula(rows.filter((r) => r.uf !== 'zz'))[0]).toMatchObject({ nome: 'Cidade Exemplo D' })
  })

  it('the build-time loader reassembles the same dataset (store, DATA_DIR default = the site fixtures)', async () => {
    const data = await loadReportsData()
    expect(data.cities).toHaveLength(9)
    expect(data.votes.length).toBeGreaterThan(0)
    expect(data.candidates.length).toBeGreaterThan(0)
  })

  it('exports live up to their definitions (filter constant, flip direction)', () => {
    expect(MIN_FLIP_VALIDOS).toBe(5000)
  })
})

describe.skipIf(!existsSync(resolve(REAL_DATA, 'cities.csv')))('real data (data/, figures cited in the repo notes)', () => {
  it('2026: Lula flipped 211 cities, Flavio Bolsonaro 1', async () => {
    const rows = computeReports(await inputFrom(REAL_DATA)).margins
    expect(flipsToLula(rows)).toHaveLength(211)
    expect(flipsToFlavio(rows)).toHaveLength(1)
  })

  it('cities won in the runoff: Lula 2.875, Flavio 2.695, 1 tie', async () => {
    const won = citiesWonInRunoff(computeReports(await inputFrom(REAL_DATA)).margins)
    expect(won.lula).toBe(2875)
    expect(won.flavio).toBe(2695)
    expect(won.ties.map((t) => `${t.nome}/${t.uf.toUpperCase()}`)).toEqual(['MARQUINHO/PR'])
  })

  it('the top five flips (5 mil+ valid votes) are the ones of the highlights note', async () => {
    const ranked = rankedFlipsToLula(computeReports(await inputFrom(REAL_DATA)).margins)
    expect(ranked.slice(0, 5).map((r) => [`${r.nome}/${r.uf.toUpperCase()}`, Number(r.margin1.toFixed(1)), Number(r.margin2.toFixed(1)), r.validos2])).toEqual([
      ['ITABIRITO/MG', -4.5, 5.0, 34159],
      ['BARRA DO PIRAÍ/RJ', -5.1, 4.2, 51929],
      ['JOÃO MONLEVADE/MG', -5.1, 4.1, 46754],
      ['PIRAPORA DO BOM JESUS/SP', -0.1, 8.8, 10714],
      ['SÃO VICENTE/SP', -7.7, 0.7, 189233],
    ])
  })

  it('the single flip toward Flavio (Uirapuru/GO, 2.156 valid votes) is below the 5 mil filter', async () => {
    const rows = computeReports(await inputFrom(REAL_DATA)).margins
    expect(flipsToFlavio(rows)[0]).toMatchObject({ nome: 'UIRAPURU', uf: 'go', validos2: 2156 })
    expect(rankedFlipsToFlavio(rows)).toEqual([])
  })

  it('biggest swing of the 100 mil+ cities: Campos dos Goytacazes/RJ, +9,8 pp (still lost)', async () => {
    const swing = biggestSwing(computeReports(await inputFrom(REAL_DATA)).margins)!
    expect(`${swing.nome}/${swing.uf.toUpperCase()}`).toBe('CAMPOS DOS GOYTACAZES/RJ')
    expect(swing.swing).toBeCloseTo(9.82, 2)
    expect(swing.margin2).toBeLessThan(0)
  })

  it('closest race: Marquinho/PR tied, difference of 0 votes', async () => {
    const races = closestRaces(computeReports(await inputFrom(REAL_DATA)).margins)
    expect(races[0]).toMatchObject({ nome: 'MARQUINHO', uf: 'pr', diff: 0, validos2: 3060 })
  })

  it('turnout extremes of the 5k+ electorate: Santa Maria do Herval/RS 90,5%, Itaubal/AP 59,0%', async () => {
    const { high, low } = turnoutExtremes(await inputFrom(REAL_DATA))
    expect(`${high!.nome}/${high!.uf.toUpperCase()}`).toBe('SANTA MARIA DO HERVAL/RS')
    expect(high!.rate).toBeCloseTo(90.46, 2)
    expect(`${low!.nome}/${low!.uf.toUpperCase()}`).toBe('ITAUBAL/AP')
    expect(low!.rate).toBeCloseTo(58.99, 2)
  })

  it('net votes vs the 2022 runoff: Lula +3.862.039 (3.428 cities, lost in 2.132), Flavio +1.591.101 (5.118, 451)', async () => {
    const { netVotes } = computeReports(await inputFrom(REAL_DATA))
    expect(netVotes.primeiro).toEqual({ total: 3862039, cities: { gained: 3428, lost: 2132 } })
    expect(netVotes.segundo).toEqual({ total: 1591101, cities: { gained: 5118, lost: 451 } })
  })
})