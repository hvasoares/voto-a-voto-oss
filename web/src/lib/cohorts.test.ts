/**
 * Tests of the cohort model of screen 12 (ticket #15).
 *
 * - Pure model on synthetic datasets: wins, ties, missing cycles, labels, rounding, ordering.
 * - Real data: the reference cohort table centraleleicao2026/thoughts/team/data-engineering/
 *   2026-10-26-swing-compare-cohort-figures.md section (c), computed live from the committed data/
 *   (the same pinning idea as about-data pins data/manifest.json): these numbers are the check.
 * - Fixture data: what the fixture build renders for the screenshots and e2e (fixtures/data,
 *   committed).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildCohorts, candidateLabels, outcomeOf, segmentColor, sharesOneDecimal, type CityRef, type CohortInput, type Cycle, type PersonLabel, type RunoffVotes } from './cohorts'
import { loadCohortReport } from './cohorts-load'

const RUNOFF_CANDIDATES: Record<Cycle, [number, number]> = {
  2018: [11, 17], // synthetic 2018 pair (the real one is 13 x 17, from candidates.csv)
  2022: [13, 22],
  2026: [13, 22],
}

type CitySpec = {
  [code: number]: Partial<Record<Cycle, [number, number]>> & { overseas?: boolean }
}

/** Synthetic input: each city's votes per runoff cycle (equal votes = tie; a missing cycle = no data). */
function input(spec: CitySpec, parties?: Record<number, string>): { input: CohortInput; labels: Record<string, PersonLabel> } {
  const votes = {} as Record<Cycle, RunoffVotes>
  for (const ano of [2018, 2022, 2026] as const) votes[ano] = new Map()
  for (const ano of [2018, 2022, 2026] as const)
    for (const [code, byCycle] of Object.entries(spec)) {
      const pair = byCycle[ano as Cycle]
      if (!pair) continue
      const [a, b] = RUNOFF_CANDIDATES[ano as Cycle]
      votes[ano].set(Number(code), new Map([[a, pair[0]!], [b, pair[1]!]]))
    }
  const cities = new Map<number, CityRef>(
    Object.entries(spec).map(([code, c]) => [
      Number(code),
      { nome: `Cidade ${code}${c.overseas ? ' (exterior)' : ''}`, uf: c.overseas ? 'zz' : 'sp', overseas: c.overseas === true },
    ]),
  )
  const labels: Record<string, PersonLabel> = {}
  for (const ano of [2018, 2022, 2026] as const)
    for (const [i, n] of RUNOFF_CANDIDATES[ano].entries())
      labels[`${ano}|${n}`] = { group: parties?.[n] ?? `Partido ${i}`, person: `Candidato ${n}`, camp: parties?.[n] ?? `Camp ${i}` }
  return { input: { votes, runoffCandidates: RUNOFF_CANDIDATES, cities }, labels }
}

const rows = (g: { parts: { candidate: number; cities: number; pct: number }[] }) => g.parts.map((p) => [p.candidate, p.cities, p.pct])

describe('pure model: groups, ties and totals', () => {
  it('sizes a group by (2018 winner, 2022 winner) and counts the 2026 outcome per candidate', () => {
    const spec: CitySpec = {
      1: { 2018: [500, 100], 2022: [400, 300], 2026: [700, 200] }, // won 11, won 13, won 13
      2: { 2018: [100, 500], 2022: [450, 350], 2026: [200, 800] }, // won 17, won 13, won 22
      3: { 2018: [100, 500], 2022: [350, 450], 2026: [100, 900] }, // won 17, won 22, won 22
      4: { 2018: [600, 100], 2022: [420, 380], 2026: [50, 10] }, // won 11, won 13, won 13
    }
    const r = buildCohorts(input(spec).input, input(spec).labels)
    const byKey = (w18: number, w22: number) => r.groups.find((g) => g.winner2018 === w18 && g.winner2022 === w22)
    expect(byKey(11, 13)?.cities).toBe(2)
    expect(byKey(11, 13)?.validos2026).toBe(700 + 200 + 50 + 10)
    expect(byKey(17, 22)?.cities).toBe(1)
    expect(byKey(11, 13)?.title).toBe('Venceu em 2018 e 2022: Partido 0')
    expect(byKey(17, 13)?.title).toBe('Venceu em 2018: Partido 1. Em 2022: Partido 0')
    expect(r.totals).toEqual({ cities2026: 4, grouped: 4, validosGroups: 2960, validos2026: 2960 })
    // Most decided cities first; the label is the 2026 candidate's person name.
    expect(rows(byKey(11, 13)!)).toEqual([[13, 2, 100], [22, 0, 0]])
  })

  it('counts a 2026 tie inside the group totals but outside the bars', () => {
    const { input: i, labels } = input({
      1: { 2018: [10, 5], 2022: [10, 5], 2026: [100, 100] },
      2: { 2018: [10, 5], 2022: [10, 5], 2026: [30, 70] },
    })
    const r = buildCohorts(i, labels)
    expect(r.groups).toHaveLength(1)
    const g = r.groups[0]!
    expect(g.cities).toBe(2)
    expect(g.ties2026).toBe(1)
    expect(rows(g)).toEqual([[13, 0, 0], [22, 1, 100]])
    expect(g.cities).toBe(g.parts.reduce((n, p) => n + p.cities, 0) + g.ties2026) // os totais fecham
  })

  it('keeps cities out of the groups and reports them when an earlier runoff tied', () => {
    const { input: i, labels } = input({
      1: { 2018: [10, 5], 2022: [15, 15], 2026: [30, 70] }, // 2022 tie, 2018 won 11
      2: { 2018: [5, 10], 2022: [15, 15], 2026: [30, 70] }, // 2022 tie, 2018 won 17
      3: { 2018: [0, 0], 2022: [0, 0], 2026: [30, 70] }, // both cycles tied
      4: { 2018: [10, 5], 2022: [10, 5], 2026: [10, 10] }, // in a group; 2026 tie
    })
    const r = buildCohorts(i, labels)
    expect(r.totals).toEqual({ cities2026: 4, grouped: 1, validosGroups: 20, validos2026: 320 })
    expect(r.tieCases.map((t) => [t.tieIn, t.otherWinner?.candidate, t.outcome2026.kind])).toEqual([
      [2022, 11, 'won'],
      [2022, 17, 'won'],
      [2018, undefined, 'won'],
    ])
  })

  it('reports the cities of 2026 with no earlier data instead of dropping them (Boa Esperança do Norte in the real data)', () => {
    const { input: i, labels } = input({
      1: { 2018: [10, 5], 2022: [10, 5], 2026: [30, 70] },
      2: { 2026: [13, 87] }, // only 2026: no cohort
      3: { 2018: [10, 5], 2026: [87, 13] }, // 2022 missing: no cohort either
    })
    const r = buildCohorts(i, labels)
    expect(r.groups).toHaveLength(1)
    expect(r.noData.map((n) => n.ref.uf)).toEqual(['sp', 'sp'])
    expect(r.noData.map((n) => [n.outcome2026.kind, n.outcome2026.kind === 'won' ? n.outcome2026.candidate : undefined])).toEqual([
      ['won', 22],
      ['won', 13],
    ])
    expect(r.totals).toEqual({ cities2026: 3, grouped: 1, validosGroups: 100, validos2026: 300 })
  })

  it('never groups overseas posts and throws on a 2026 code without registry entry', () => {
    const { input: i, labels } = input({
      1: { 2018: [10, 5], 2022: [10, 5], 2026: [30, 70] },
      99301: { 2018: [50, 40], 2022: [50, 40], 2026: [60, 40], overseas: true },
    })
    const r = buildCohorts(i, labels)
    expect(r.totals.cities2026).toBe(1)
    expect(r.groups[0]?.validos2026).toBe(100)
    const missing = input({ 1: { 2026: [30, 70] } })
    missing.input.cities.delete(1)
    expect(() => buildCohorts(missing.input, missing.labels)).toThrow(/not in the city registry/)
  })

  it('orders groups largest first with a deterministic tie-break', () => {
    const { input: i, labels } = input({
      1: { 2018: [5, 10], 2022: [5, 10], 2026: [30, 70] }, // (17, 22)
      2: { 2018: [5, 10], 2022: [5, 10], 2026: [30, 70] },
      3: { 2018: [5, 10], 2022: [5, 10], 2026: [30, 70] },
      4: { 2018: [10, 5], 2022: [10, 5], 2026: [30, 70] }, // (11, 13)
      5: { 2018: [10, 5], 2022: [10, 5], 2026: [30, 70] },
      6: { 2018: [10, 5], 2022: [5, 10], 2026: [30, 70] }, // (11, 22)
    })
    const r = buildCohorts(i, labels)
    expect(r.groups.map((g) => [g.winner2018, g.winner2022, g.cities])).toEqual([
      [17, 22, 3],
      [11, 13, 2],
      [11, 22, 1],
    ])
  })
})

describe('rounding and labels', () => {
  it('bar shares are one-decimal percents that add up to exactly 100.0 (largest remainder)', () => {
    expect(sharesOneDecimal([2613, 141])).toEqual([94.9, 5.1])
    expect(sharesOneDecimal([1, 1, 1])).toEqual([33.4, 33.3, 33.3])
    for (const cases of [[1, 1], [1, 2], [2, 3], [1, 3], [5, 2], [100, 1], [999, 1], [7, 0]] as const) {
      const out = sharesOneDecimal(cases)
      expect(out.reduce((a, b) => a + b, 0), String(cases)).toBe(100)
      expect(out.every((n) => Math.abs(Math.round(n * 10) - n * 10) < 1e-6), String(cases)).toBe(true) // one decimal
    }
  })

  it('names candidates from candidates.csv: Sketch names of the real runoff, party and ballot name otherwise', () => {
    const fixed = candidateLabels([
      { ano: 2018, turno: 2, candidatoNumero: 13, nomeUrna: 'FERNANDO HADDAD', partido: 'PT' },
      { ano: 2018, turno: 2, candidatoNumero: 17, nomeUrna: 'JAIR BOLSONARO', partido: 'PSL' },
      { ano: 2022, turno: 2, candidatoNumero: 13, nomeUrna: 'LULA', partido: 'PT' },
      { ano: 2022, turno: 2, candidatoNumero: 22, nomeUrna: 'JAIR BOLSONARO', partido: 'PL' },
      { ano: 2026, turno: 2, candidatoNumero: 13, nomeUrna: 'LULA', partido: 'PT' },
      { ano: 2026, turno: 2, candidatoNumero: 22, nomeUrna: 'FLAVIO BOLSONARO', partido: 'PL' },
    ])
    expect(fixed['2018|13']).toEqual({ group: 'PT', person: 'Haddad', camp: 'PT' })
    expect(fixed['2018|17']).toEqual({ group: 'Bolsonaro', person: 'Bolsonaro', camp: 'Bolsonaro' })
    expect(fixed['2022|13']).toEqual({ group: 'Lula', person: 'Lula', camp: 'PT' })
    expect(fixed['2022|22']).toEqual({ group: 'Bolsonaro', person: 'Bolsonaro', camp: 'Bolsonaro' })
    expect(fixed['2026|13']).toEqual({ group: 'Lula', person: 'Lula', camp: 'PT' })
    expect(fixed['2026|22']).toEqual({ group: 'Flávio', person: 'Flávio', camp: 'Bolsonaro' })
    const fixture = candidateLabels([
      { ano: 2026, turno: 2, candidatoNumero: 91, nomeUrna: 'Candidato A', partido: 'PA' },
      { ano: 2026, turno: 1, candidatoNumero: 91, nomeUrna: 'Candidato A (1º turno, nunca usado aqui)', partido: 'PA' },
    ])
    expect(fixture['2026|91']).toEqual({ group: 'PA', person: 'Candidato A', camp: 'PA' })
    expect(fixture['2026|93']).toBeUndefined() // not a runoff candidate
  })

  it('winner semantics: more votes than the other candidate; equal votes tie; no data when the cycle is missing', () => {
    const pair: [number, number] = [13, 22]
    expect(outcomeOf(new Map([[13, 100], [22, 120]]), pair)).toEqual({ kind: 'won', candidate: 22 })
    expect(outcomeOf(new Map([[13, 100]]), pair)).toEqual({ kind: 'won', candidate: 13 })
    expect(outcomeOf(new Map([[13, 100], [22, 100]]), pair)).toEqual({ kind: 'tie' })
    expect(outcomeOf(undefined, pair)).toEqual({ kind: 'no-data' })
  })

  it('segment colours carry the Sketch swatches of the real runoff; anything else is neutral', () => {
    expect(segmentColor(13, 0)).toBe('lula')
    expect(segmentColor(22, 1)).toBe('bolsonaro')
    expect(segmentColor(91, 0)).toBe('cand-a')
    expect(segmentColor(92, 1)).toBe('cand-b')
  })
})

describe('real data (data/, committed): the reference cohort table', () => {
  const report = loadCohortReport(resolve(import.meta.dirname, '../../../data'))
  const byKey = async (w18: number, w22: number) => (await report).groups.find((g) => g.winner2018 === w18 && g.winner2022 === w22)!

  it('groups the four winner combinations with the sizes, valid votes and 2026 outcomes of the reference table', async () => {
    const r = await report
    // One row of section (c) per call: cities, valid votes of the 2026 runoff, decided by, ties.
    expect([(await byKey(13, 13)).cities, (await byKey(13, 13)).validos2026]).toEqual([2755, 40955646])
    expect(rows(await byKey(13, 13))).toEqual([[13, 2613, 94.9], [22, 141, 5.1]])
    expect((await byKey(13, 13)).ties2026).toBe(1)
    expect([(await byKey(17, 22)).cities, (await byKey(17, 22)).validos2026]).toEqual([2391, 64886493])
    expect(rows(await byKey(17, 22))).toEqual([[13, 27, 1.1], [22, 2364, 98.9]])
    expect([(await byKey(17, 13)).cities, (await byKey(17, 13)).validos2026]).toEqual([368, 17479900])
    expect(rows(await byKey(17, 13))).toEqual([[13, 231, 62.8], [22, 137, 37.2]])
    expect([(await byKey(13, 22)).cities, (await byKey(13, 22)).validos2026]).toEqual([54, 372409])
    expect(rows(await byKey(13, 22))).toEqual([[13, 4, 7.4], [22, 50, 92.6]])
  })

  it('names the groups the way the frame does, with the labels of the 2026 runoff in the bars', async () => {
    const r = await report
    // The frame collapses equal labels (17 then 22 are the same person: "Bolsonaro"), but keeps
    // different ones apart (2018's "13" was Haddad: "Venceu em 2018: PT. Em 2022: Lula").
    expect(r.groups.map((g) => g.title)).toEqual([
      'Venceu em 2018 e 2022: PT',
      'Venceu em 2018 e 2022: Bolsonaro',
      'Venceu em 2018: Bolsonaro. Em 2022: Lula',
      'Venceu em 2018: PT. Em 2022: Bolsonaro',
    ])
    expect(r.groups.flatMap((g) => g.parts.map((p) => p.label)).every((l) => l === 'Lula' || l === 'Flávio')).toBe(true)
  })

  it('the tie city sits in the PT group, and both earlier ties are the reference cities, both won by Flavio in 2026', async () => {
    const r = await report
    const pt = (await byKey(13, 13))!
    expect(pt.ties2026).toBe(1)
    expect(pt.cities).toBe(pt.parts.reduce((n, p) => n + p.cities, 0) + pt.ties2026) // os totais fecham
    expect(r.tieCases.map((t) => [t.ref.nome, t.ref.uf, t.tieIn, t.otherWinner?.ano, t.otherWinner?.candidate, t.outcome2026.kind, t.outcome2026.kind === 'won' ? t.outcome2026.candidate : undefined])).toEqual([
      ['IRATI', 'sc', 2022, 2018, 13, 'won', 22],
      ['GUARÁ', 'sp', 2022, 2018, 17, 'won', 22],
    ])
  })

  it('the totals close: 5.571 cities of 2026 = groups + tie cases + the city without data', async () => {
    const r = await report
    expect(r.totals.cities2026).toBe(5571)
    expect(r.totals.grouped).toBe(5568)
    expect(r.tieCases).toHaveLength(2)
    expect(r.noData).toHaveLength(1)
    expect(r.noData[0]).toMatchObject({ ref: { nome: 'BOA ESPERANÇA DO NORTE', uf: 'mt' }, outcome2026: { kind: 'won', candidate: 22 } })
    expect(r.totals.grouped + r.tieCases.length + r.noData.length).toBe(r.totals.cities2026)
    expect(r.groups).toHaveLength(4)
  })

  it('valid votes of every city of 2026 (overseas out) equal the committed turnout table, and each group closes', async () => {
    const r = await report
    // 40.955.646 + 64.886.493 + 17.479.900 + 372.409 (reference table, the four group rows)
    expect(r.totals.validosGroups).toBe(123694448)
    // The identity the pipeline checks: in a runoff, validos are exactly the two candidates.
    const turnout = readFileSync(resolve(import.meta.dirname, '../../../data/turnout.csv'), 'utf8').split('\n')
    let sum = 0
    for (const line of turnout) {
      const cells = line.split(',')
      if (cells[0] === '2026' && cells[1] === '2' && cells[2] !== 'zz') sum += Number(cells[10])
    }
    expect(r.totals.validos2026).toBe(sum)
    expect(sum - r.totals.validosGroups).toBe(1697 + 11179 + 3298) // both tie cases + Boa Esperança do Norte
    for (const g of r.groups) expect(g.parts.reduce((n, p) => n + p.cities, 0) + g.ties2026).toBe(g.cities)
  })
})

describe('fixture data (fixtures/data): what the fixture build renders', () => {
  const report = loadCohortReport(resolve(import.meta.dirname, '../../fixtures/data'))

  it('renders three groups of the example cities and the 2026-only city as no data', async () => {
    const r = await report
    expect(r.groups.map((g) => [g.title, g.cities, g.validos2026])).toEqual([
      ['Venceu em 2018: PB. Em 2022: PA', 5, 265326],
      ['Venceu em 2018: PA. Em 2022: PB', 1, 62887],
      ['Venceu em 2018 e 2022: PB', 1, 49986],
    ])
    const five = r.groups[0]!
    expect(five.parts.map((p) => [p.label, p.cities, p.pct])).toEqual([
      ['Candidato A', 3, 60],
      ['Candidato B', 2, 40],
    ])
    expect(r.tieCases).toEqual([])
    expect(r.noData.map((n) => [n.ref.nome, n.ref.uf, n.outcome2026.kind, n.outcome2026.kind === 'won' ? n.outcome2026.candidate : undefined])).toEqual([
      ['Boa Esperança do Norte', 'mt', 'won', 91],
    ])
    expect(r.totals.cities2026).toBe(8)
    expect(r.totals.validos2026).toBe(463353)
  })
})