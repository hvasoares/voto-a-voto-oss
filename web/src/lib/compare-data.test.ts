import { describe, expect, it } from 'vitest'
import type { Candidate, City, DataStore, Manifest, Turnout, TurnoutQuery, Vote } from '@site/data'
import { buildCompareRow, buildCycleBlocks, type RunoffTally } from './compare'
import {
  buildCompareRows,
  buildStateStats,
  compareTallies,
  cycleBlocksFor,
  electPair,
  intersection,
  labelsOf,
  otherLargestStates,
  roundOf,
  stateOrder,
  tallyOf,
  type StateStats,
} from './compare-data'

/**
 * A synthetic dataset in the shape of the real one: 2018 and 2022 have municipalities A and B;
 * 2026 has A, B and a NEW one (C) — the "Boa Esperança do Norte/MT" case, whose vote can never
 * enter a comparison. A state with 2026 only (mt) and the overseas posts (zz) round out the rules.
 */
const TURNOVER: Turnout[] = [
  t(2018, 2, 'sp', 'A', 800),
  t(2022, 2, 'sp', 'A', 800),
  t(2026, 2, 'sp', 'A', 1000),
  t(2022, 2, 'sp', 'B', 500),
  t(2018, 2, 'sp', 'B', 500),
  t(2026, 2, 'sp', 'B', 500),
  t(2026, 2, 'sp', 'C', 900), // no 2018/2022 row: this municipality exists only in 2026
  t(2026, 1, 'sp', 'A', 1100),
  t(2026, 2, 'mt', 'D', 1234), // a state with 2026 only: "sem dados" for 2018/2022
  t(2026, 2, 'zz', 'ZZ1', 5000), // overseas: excluded from every state aggregate
]

function t(ano: number, turno: 1 | 2, uf: string, cd: string, validos: number): Turnout {
  return { ano, turno, uf, cdMunicipio: cd, aptos: validos + 10, comparecimento: validos + 5, abstencoes: 5, brancos: 1, nulos: 2, anuladosApuSep: 0, validos }
}

const VOTES: Vote[] = [
  v(2018, 2, 'sp', 'A', 13, 380),
  v(2018, 2, 'sp', 'A', 17, 420),
  v(2022, 2, 'sp', 'A', 13, 380),
  v(2022, 2, 'sp', 'A', 22, 420),
  v(2026, 2, 'sp', 'A', 13, 400),
  v(2026, 2, 'sp', 'A', 22, 600),
  v(2022, 2, 'sp', 'B', 13, 200),
  v(2022, 2, 'sp', 'B', 22, 300),
  v(2018, 2, 'sp', 'B', 13, 200),
  v(2018, 2, 'sp', 'B', 17, 300), // in every R2 round the two ballot candidates sum to the valid votes (the shape of the real data)
  v(2026, 2, 'sp', 'B', 13, 250),
  v(2026, 2, 'sp', 'B', 22, 250),
  v(2026, 2, 'sp', 'C', 13, 500),
  v(2026, 2, 'sp', 'C', 22, 400),
  v(2026, 1, 'sp', 'A', 13, 430),
  v(2026, 1, 'sp', 'A', 22, 670),
  v(2026, 2, 'mt', 'D', 13, 600),
  v(2026, 2, 'mt', 'D', 22, 634),
  v(2026, 2, 'zz', 'ZZ1', 13, 2500),
  v(2026, 2, 'zz', 'ZZ1', 22, 2500),
]

function v(ano: number, turno: 1 | 2, uf: string, cd: string, candidatoNumero: number, votos: number): Vote {
  return { ano, turno, uf, cdMunicipio: cd, candidatoNumero, votos }
}

const CANDIDATES: Candidate[] = [
  c(2018, 2, 13, 'FERNANDO HADDAD', 'PT'),
  c(2018, 2, 17, 'JAIR BOLSONARO', 'PSL'),
  c(2022, 2, 13, 'LULA', 'PT'),
  c(2022, 2, 22, 'JAIR BOLSONARO', 'PL'),
  c(2026, 2, 13, 'LULA', 'PT'),
  c(2026, 2, 22, 'FLAVIO BOLSONARO', 'PL'),
]

function c(ano: number, turno: 1 | 2, candidatoNumero: number, nomeUrna: string, partido: string): Candidate {
  return { ano, turno, candidatoNumero, nomeUrna, partido }
}

/** The smallest DataStore the loader needs (buildStateStats reads citiesByUf too, for the top city). */
function fakeStore(input: { turnout: Turnout[]; votes: Vote[]; candidates: Candidate[]; cities?: City[] }): DataStore {
  return {
    cities: () => Promise.resolve(input.cities ?? []),
    city: (uf: string, slug: string) => Promise.resolve((input.cities ?? []).find((c) => c.uf === uf && c.slug === slug)),
    citiesByUf: (uf: string) => Promise.resolve((input.cities ?? []).filter((c) => c.uf === uf)),
    states: () => Promise.resolve([]),
    turnout: async (q?: TurnoutQuery) => (q ? input.turnout.filter(matches.turnout(q)) : input.turnout),
    votes: async (q?: TurnoutQuery) => (q ? input.votes.filter(matches.votes(q)) : input.votes),
    candidates: async (q?: { ano?: number; turno?: 1 | 2 }) =>
      input.candidates.filter((x) => (q?.ano === undefined || x.ano === q.ano) && (q?.turno === undefined || x.turno === q.turno)),
    manifest: () => Promise.resolve({} as Manifest),
  }
}

const BOA_ESPERANCA: City = {
  uf: 'mt',
  cdMunicipio: 'D',
  cdIbge: '5100102',
  nome: 'Boa Esperança do Norte',
  slug: 'boa-esperanca-do-norte',
  regiao: 'CO',
  ciclos: [2026],
}

const matches = {
  turnout: (q: TurnoutQuery) => (x: Turnout) =>
    (q.ano === undefined || x.ano === q.ano) && (q.turno === undefined || x.turno === q.turno) && (q.uf === undefined || x.uf === q.uf.toLowerCase()),
  votes: (q: TurnoutQuery) => (x: Vote) =>
    (q.ano === undefined || x.ano === q.ano) && (q.turno === undefined || x.turno === q.turno) && (q.uf === undefined || x.uf === q.uf.toLowerCase()),
}

const stateStats = buildStateStats(fakeStore({ turnout: TURNOVER, votes: VOTES, candidates: CANDIDATES, cities: [BOA_ESPERANCA] }))
const stateStatsNoCity = buildStateStats(fakeStore({ turnout: TURNOVER, votes: VOTES, candidates: CANDIDATES }))

async function stat(uf: string): Promise<StateStats> {
  const all = await stateStats
  const s = all.find((x) => x.uf === uf)!
  if (!s) throw new Error(`missing state ${uf}`)
  return s
}

describe('state aggregation (build time)', () => {
  it('sums the municipalities of each state per round and excludes the overseas rows', async () => {
    const s = (await stat('sp'))
    const r26 = roundOf(s, 2026, 2)!
    expect(r26.validos).toBe(2400)
    expect(r26.votesByCandidate.get(13)).toBe(1150)
    expect(r26.votesByCandidate.get(22)).toBe(1250)
    const all = await stateStats
    expect(all.map((x) => x.uf)).toEqual(['mt', 'sp']) // no zz state ever; sorted by UF (deterministic)
  })

  it('aggregates round 1 too, per state', async () => {
    const s = (await stat('sp'))
    expect(roundOf(s, 2026, 1)!.validos).toBe(1100)
    expect(roundOf(s, 2026, 1)!.votesByCandidate.get(13)).toBe(430)
    expect(roundOf(s, 2026, 1)!.votesByCandidate.get(22)).toBe(670)
  })

  it('compares 2026 with a cycle only over the municipalities BOTH cycles have', async () => {
    const s = (await stat('sp'))
    const pair = compareTallies(s, 2022)!
    expect(pair.c.validos).toBe(1500)
    expect(pair.c.left).toBe(650) // the C votes (500) stay out: municipality C has no 2022 rows
    expect(pair.c.rival).toBe(850)
    expect(pair.old.validos).toBe(1300)
    expect(pair.old.left).toBe(580)
    expect(pair.old.rival).toBe(720)
  })

  it('pairs the compared cycle with its own candidates (2018 = 13 and 17, never 22)', async () => {
    const s = (await stat('sp'))
    const { old } = compareTallies(s, 2018)!
    expect(old.left).toBe(580)
    expect(old.rival).toBe(720) // the 2018 rival is candidate 17 (the 2018 "Bolsonaro"): candidate 22 has no 2018 rows at all
  })

  it('elects the ticket pairing when the candidates exist and the two leaders otherwise', async () => {
    const s = (await stat('sp'))
    expect(electPair(roundOf(s, 2018, 2)!.votesByCandidate, 2018)).toEqual({ left: 13, rival: 17, rule: 'ticket' })
    expect(electPair(roundOf(s, 2026, 2)!.votesByCandidate, 2026)).toEqual({ left: 13, rival: 22, rule: 'ticket' })
    // a dataset without candidates 13/17/22 (the fixture set's "Candidato A/B") gets the leaders rule
    expect(electPair(new Map([[92, 700], [91, 300]]), 2026)).toEqual({ left: 91, rival: 92, rule: 'leaders' })
  })

  it('labels the sides from candidates.csv the way the frames draw them', async () => {
    const s = (await stat('sp'))
    expect(labelsOf(s, 2026)).toEqual({ left: 'Lula', rival: 'Flavio' })
    expect(labelsOf(s, 2022)).toEqual({ left: 'Lula', rival: 'Bolsonaro' })
    expect(labelsOf(s, 2018)).toEqual({ left: 'Lula', rival: 'Bolsonaro' }) // the 2018 rows are "o do PT (13)" against Bolsonaro (17)
  })

  it('answers "sem dados" for a cycle the state does not have, and builds its three blocks', async () => {
    const mt = (await stat('mt'))
    expect(tallyOf(mt, 2022, 2)).toBeUndefined()
    expect(tallyOf(mt, 2026, 2)).toEqual({ validos: 1234, left: 600, rival: 634 })
    const blocks = buildCycleBlocks({
      tallies: new Map<number, RunoffTally>([[2026, tallyOf(mt, 2026, 2)!]]),
      labels: { 2026: { left: 'Lula', rival: 'Flavio' } },
    })
    expect(blocks.map((b) => b.status)).toEqual(['no-data', 'no-data', 'data'])
    expect(blocks[0]!.left).toBeUndefined()
    expect(blocks[2]!.left!.votes).toBe(600)
    expect(blocks[2]!.changePp).toBeUndefined()
  })

  it('intersects municipality sets', () => {
    expect(intersection(new Set(['1', '2', '3']), new Set(['2', '3', '4']))).toEqual(new Set(['2', '3']))
  })

  it('builds one page row per state pair, sorted by 2026 valid votes, deterministically', async () => {
    const stats = await stateStats
    const rows = buildCompareRows(stats, 2022)
    // mt has 2026 only: no municipalities in common with 2022 -> no compare row (the state never shows a false swing)
    expect(rows.map((r) => r.uf)).toEqual(['sp'])
    expect(JSON.stringify(rows)).toBe(JSON.stringify(buildCompareRows(stats, 2022)))
    const row = rows[0]!
    expect(row).toMatchObject({ uf: 'sp', validos: 1500 })
    expect(row.left.diffVotes).toBe(650 - 580)
  })

  it('orders the states for screen 13 by 2026 valid votes, ties by UF, zz never listed', async () => {
    const stats = await stateStats
    expect(stateOrder(stats)).toEqual([
      { uf: 'sp', validos: 2400 },
      { uf: 'mt', validos: 1234 },
    ])
  })

  it('picks "Outros estados" as the six largest states minus the page state', async () => {
    const stats = await stateStats
    expect(otherLargestStates(stats, 'sp').map((s) => s.uf)).toEqual(['mt'])
    expect(otherLargestStates(stats, 'mt').map((s) => s.uf)).toEqual(['sp'])
  })

  it('builds the three cycle blocks of screen 13 from each round own pairing', async () => {
    const s = (await stat('sp'))
    const blocks = cycleBlocksFor(s)
    expect(blocks.map((b) => b.ano)).toEqual([2018, 2022, 2026])
    expect(blocks.map((b) => b.status)).toEqual(['data', 'data', 'data'])
    // 2018 pairs 13 with 17 (ticket): 13 x 380 + 200, 17 x 420 + 300 of 1300 validos
    expect(blocks[0]!.left!.pct).toBe('44,6') // 580 of 1300 = 44.6153
    expect(blocks[0]!.rival!.pct).toBe('55,4')
    expect(blocks[0]!.changePp).toBeUndefined()
    // 2022 pairs 13 with 22: exactly the same vote totals -> the same shares
    expect(blocks[1]!.left!.pct).toBe('44,6')
    expect(blocks[1]!.rival!.pct).toBe('55,4')
    expect(blocks[1]!.changePp).toBe('0,0')
    expect(blocks[1]!.changeVs).toBe(2018)
    // 2026 over A+B+C: 13 x 1150, 22 x 1250 of 2400 -> left '47,9' (47.9166), rival 1250/2400
    expect(blocks[2]!.left!.pct).toBe('47,9')
    expect(blocks[2]!.rival!.pct).toBe('52,1')
    expect(blocks[2]!.changePp).toBe('+3,3')
    expect(blocks[2]!.changeVs).toBe(2022)
  })

  it('keeps the sem-dados blocks of a 2026-only state (never zeros, no change line)', async () => {
    const mt = (await stat('mt'))
    const blocks = cycleBlocksFor(mt)
    expect(blocks.map((b) => b.status)).toEqual(['no-data', 'no-data', 'data'])
    expect(blocks[0]!.left).toBeUndefined()
    expect(blocks[2]!.changePp).toBeUndefined()
    expect(blocks[2]!.changeVs).toBeUndefined()
  })

  it('points "ver os três ciclos de uma cidade" at the largest city of the state in 2026 R2', async () => {
    const mt = (await stat('mt'))
    expect(mt.topCity).toEqual({ slug: 'boa-esperanca-do-norte', nome: 'Boa Esperança do Norte' })
    const all = await stateStatsNoCity
    expect(all.find((s) => s.uf === 'mt')!.topCity).toBeUndefined() // no cities.csv -> no link target, the section hides it
  })
})