/**
 * Cohorts of screen 12, "Como cada grupo votou" (ticket #15) — PURE: no file IO, no HTML. The Astro
 * page bakes its output in at build time; the browser never runs this.
 *
 * Definitions, fixed in the reference cohort table
 * centraleleicao2026/thoughts/team/data-engineering/2026-10-26-swing-compare-cohort-figures.md
 * section (c) (replicated on the real data/ by src/lib/cohorts.test.ts):
 * - A cohort = (winner of the runoff in 2018, winner of the runoff in 2022) of one city. Cities join
 *   across the three cycles on the integer TSE municipality code (`cd_municipio`); overseas voting
 *   posts (uf `zz`) never join: the reference counts cities, 5.570 of the 5.571 of 2026.
 * - Venceu = more votes in the runoff than the other candidate of that cycle; equal votes = "empate".
 * - The outcome shown per group is the 2026 runoff: cities per candidate plus ties. A city of the
 *   group that ties in 2026 stays in the group's city and valid-vote totals and outside the bars
 *   (the bars carry the decided cities; the tie is a note on the card).
 * - Two cities tied in one earlier runoff (2018 or 2022) have no cohort; same for the cities that
 *   only exist in 2026 (Boa Esperança do Norte/MT in the real dataset). Both kinds are reported,
 *   never dropped silently, so the totals close.
 * - Valid votes per group = sum of the two 2026 runoff candidates' votes over the group's cities
 *   (in the runoff, valid votes are exactly those two candidates in every city — checked
 *   pipeline-wide and in the tests).
 * - Bar shares are one-decimal percents that add up to exactly 100.0 (largest remainder on tenths,
 *   the site-wide convention shown in /sobre-os-dados/). The Sketch frame was drawn with plain
 *   rounding and its first card sums to 99.9; with the convention the card reads 94,9/5,1.
 */
import { largestRemainder } from '@site/shared/city-model'

export type Cycle = 2018 | 2022 | 2026

/** The three runoff cycles the frame compares. */
export const RUNOFF_CYCLES: readonly Cycle[] = [2018, 2022, 2026]

/** Votes of one cycle's runoff per city: TSE municipality code -> candidate number -> votes. */
export type RunoffVotes = Map<number, Map<number, number>>

/** Votes of one city in one runoff: candidate number -> votes. */
export type RunoffCityVotes = Map<number, number>

/** Registry row of one city (overseas voting posts flagged, they never join a cohort). */
export interface CityRef {
  nome: string
  uf: string
  overseas: boolean
}

export interface CohortInput {
  /** Round-2 votes of every cycle, keyed by the TSE municipality code. */
  votes: Record<Cycle, RunoffVotes>
  /** The two runoff candidates of each cycle, in election order (candidates.csv). */
  runoffCandidates: Record<Cycle, [number, number]>
  /** City registry by the same TSE code; must cover every code of the 2026 runoff. */
  cities: Map<number, CityRef>
}

/** The result of one runoff in one city: won by a candidate, tie (equal votes), or no data that cycle. */
export type Outcome = { kind: 'won'; candidate: number } | { kind: 'tie' } | { kind: 'no-data' }

export function outcomeOf(runoff: RunoffCityVotes | undefined, pair: readonly [number, number]): Outcome {
  if (!runoff) return { kind: 'no-data' }
  const [a, b] = pair
  const va = runoff.get(a) ?? 0
  const vb = runoff.get(b) ?? 0
  if (va > vb) return { kind: 'won', candidate: a }
  if (vb > va) return { kind: 'won', candidate: b }
  return { kind: 'tie' }
}

/** Labels of one candidate: the group word of the cards ("PT", "Bolsonaro") and the person of the bars ("Lula"). */
export interface PersonLabel {
  group: string
  person: string
}

/** One candidate of the 2026 bars of a group: decided cities and the one-decimal share of the group's cities. */
export interface OutcomePart {
  candidate: number
  label: string
  cities: number
  pct: number
}

export interface CohortGroup {
  title: string
  winner2018: number
  winner2022: number
  /** Cities of the group, the 2026 tie included. */
  cities: number
  /** Valid votes of the 2026 runoff over those cities (the tie included). */
  validos2026: number
  /** Cities of the group that tied in 2026: counted here, outside the bars. */
  ties2026: number
  /** The decided cities by candidate, most votes first; percentages of the group's cities. */
  parts: OutcomePart[]
}

/** A city without a cohort because its 2018 or 2022 runoff ended level. */
export interface TieCase {
  ref: CityRef
  /** The cycle whose runoff tied. */
  tieIn: Cycle
  /** Who won the other cycle, for the note (absent when both cycles tied). */
  otherWinner?: { ano: Cycle; candidate: number }
  outcome2026: Outcome
}

/** A city of 2026 with no data in a previous cycle (Boa Esperança do Norte/MT in the real dataset). */
export interface NoDataCase {
  ref: CityRef
  outcome2026: Outcome
}

export interface CohortReport {
  /** The cohorts, one per (2018, 2022) winner pair, largest first. */
  groups: CohortGroup[]
  tieCases: TieCase[]
  noData: NoDataCase[]
  totals: {
    /** Cities of the 2026 runoff, overseas posts excluded. */
    cities2026: number
    /** Cities inside the groups: totals.cities2026 - tieCases - noData. */
    grouped: number
    /** Valid votes of 2026 over the group cities. */
    validosGroups: number
    /** Valid votes of 2026 over every city of the runoff, overseas excluded. */
    validos2026: number
  }
}

/**
 * Display names of the real runoff candidates (source: data/candidates.csv, 2º turno rows — 2018:
 * 13 FERNANDO HADDAD, PT; 17 JAIR BOLSONARO, PSL; 2022: 13 LULA, PT; 22 JAIR BOLSONARO, PL;
 * 2026: 13 LULA, PT; 22 FLAVIO BOLSONARO, PL). The frame 12 cards name the 2018 winner "PT" (his
 * candidate in 2018 was Haddad) and every later candidate by name ("Lula", "Bolsonaro"); the bars
 * of 2026 say "Lula" and "Flavio" (the ballot name is Flavio Bolsonaro). Keys are "ano|numero".
 * Anything not listed falls back to the candidates.csv fields (party as the group word, ballot name
 * as the person), which is what the fixture dataset renders (Candidato A/B, parties PA/PB).
 */
const DISPLAY: Record<string, { group: string; person: string }> = {
  '2018|13': { group: 'PT', person: 'Haddad' },
  '2018|17': { group: 'Bolsonaro', person: 'Bolsonaro' },
  '2022|13': { group: 'Lula', person: 'Lula' },
  '2022|22': { group: 'Bolsonaro', person: 'Bolsonaro' },
  '2026|13': { group: 'Lula', person: 'Lula' },
  '2026|22': { group: 'Flavio', person: 'Flavio' },
}

const titleCase = (name: string): string =>
  /[a-z]/.test(name) ? name : name.toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, s, l) => s + l.toUpperCase())

export interface CandidateRowLike {
  ano: number
  turno: number
  candidatoNumero: number
  nomeUrna: string
  partido: string
}

/** Labels per "ano|numero" for the runoff candidates (2º turno rows only). */
export function candidateLabels(candidates: readonly CandidateRowLike[]): Record<string, PersonLabel> {
  const out: Record<string, PersonLabel> = {}
  for (const c of candidates) {
    if (c.turno !== 2) continue
    const key = `${c.ano}|${c.candidatoNumero}`
    out[key] = DISPLAY[key] ?? { group: c.partido || titleCase(c.nomeUrna), person: titleCase(c.nomeUrna) }
  }
  return out
}

/**
 * Segment colours of the 2026 bars (Sketch swatches in site/src/shared/tokens.ts): candidate 13 gets
 * the Lula red, 22 the Bolsonaro blue. A candidate outside the map (the fixed fixture pair
 * Candidato A/B) gets the neutral pair cand-a / cand-b by election order. No bar relies on colour
 * alone: every segment is named and counted in text next to the swatch.
 */
export function segmentColor(candidateNumber: number, pairIndex: number): string {
  const fixed: Partial<Record<number, 'lula' | 'bolsonaro'>> = { 13: 'lula', 22: 'bolsonaro' }
  return fixed[candidateNumber] ?? (pairIndex === 0 ? 'cand-a' : 'cand-b')
}

/** One-decimal percents that add up to exactly 100.0: largest remainder over the tenths. */
export function sharesOneDecimal(cities: readonly number[]): number[] {
  const total = cities.reduce((a, b) => a + b, 0)
  if (total <= 0) return cities.map(() => 0)
  return largestRemainder(cities, 1000).map((tenths) => tenths / 10)
}

const groupTitle = (l18: string, l22: string): string =>
  l18 === l22 ? `Venceu em 2018 e 2022: ${l18}` : `Venceu em 2018: ${l18}. Em 2022: ${l22}`

export function buildCohorts(input: CohortInput, labels: Record<string, PersonLabel>): CohortReport {
  const [c2018, c2022, c2026] = [input.runoffCandidates[2018], input.runoffCandidates[2022], input.runoffCandidates[2026]]
  if (!c2018 || !c2022 || !c2026) throw new Error('cohorts: both candidates of a runoff are missing')
  const rc: Record<Cycle, [number, number]> = { 2018: c2018, 2022: c2022, 2026: c2026 }

  const person2026 = (candidate: number): string => {
    const l = labels[`2026|${candidate}`]
    if (!l) throw new Error(`cohorts: no label for candidate ${candidate} of 2026`)
    return l.person
  }
  const groupLabel = (ano: Cycle, candidate: number, code: number): string => {
    const l = labels[`${ano}|${candidate}`]
    if (!l) throw new Error(`cohorts: no label for candidate ${candidate} of ${ano} at TSE code ${code}`)
    return l.group
  }

  interface Bucket {
    winner2018: number
    winner2022: number
    cities: number
    validos2026: number
    ties2026: number
    decided: Map<number, number>
  }
  const buckets = new Map<string, Bucket>()
  const tieCases: TieCase[] = []
  const noData: NoDataCase[] = []
  let validos2026 = 0

  for (const [code, v26] of input.votes[2026]) {
    const ref = input.cities.get(code)
    if (!ref) throw new Error(`cohorts: TSE code ${code} of the 2026 runoff is not in the city registry`)
    if (ref.overseas) continue
    validos2026 += validosOf(v26, rc[2026])
    const o2018 = outcomeOf(input.votes[2018].get(code), rc[2018])
    const o2022 = outcomeOf(input.votes[2022].get(code), rc[2022])
    const o2026 = outcomeOf(v26, rc[2026])
    if (o2018.kind === 'no-data' || o2022.kind === 'no-data') {
      noData.push({ ref, outcome2026: o2026 })
      continue
    }
    if (o2018.kind === 'tie' || o2022.kind === 'tie') {
      const both = o2018.kind === 'tie' && o2022.kind === 'tie'
      const tieIn = o2018.kind === 'tie' ? 2018 : 2022
      const otherKind = tieIn === 2018 ? o2022 : o2018
      tieCases.push({
        ref,
        tieIn,
        otherWinner:
          both || otherKind.kind !== 'won'
            ? undefined
            : { ano: tieIn === 2018 ? 2022 : 2018, candidate: otherKind.candidate },
        outcome2026: o2026,
      })
      continue
    }
    const key = `${o2018.candidate}|${o2022.candidate}`
    const g = buckets.get(key) ?? {
      winner2018: o2018.candidate,
      winner2022: o2022.candidate,
      cities: 0,
      validos2026: 0,
      ties2026: 0,
      decided: new Map<number, number>(),
    }
    g.cities++
    g.validos2026 += validosOf(v26, rc[2026])
    if (o2026.kind === 'won') g.decided.set(o2026.candidate, (g.decided.get(o2026.candidate) ?? 0) + 1)
    else if (o2026.kind === 'tie') g.ties2026++
    else throw new Error(`cohorts: TSE code ${code} is in the 2026 runoff but outcomeless`) // unreachable by construction
    buckets.set(key, g)
  }

  const groups: CohortGroup[] = [...buckets.values()]
    .sort((a, b) => b.cities - a.cities || a.winner2018 - b.winner2018 || a.winner2022 - b.winner2022)
    .map((g) => {
      // Sort candidates by decided cities (most first) so the bar reads winner-first like the
      // frame; the pair index keeps the election order on ties.
      const candidates = rc[2026]
        .map((candidate, pairIndex) => ({ candidate, pairIndex, cities: g.decided.get(candidate) ?? 0 }))
      candidates.sort((a, b) => b.cities - a.cities || a.pairIndex - b.pairIndex)
      const shares = sharesOneDecimal(candidates.map((p) => p.cities))
      const parts: OutcomePart[] = candidates.map((p, i) => ({
        candidate: p.candidate,
        label: person2026(p.candidate),
        cities: p.cities,
        pct: shares[i]!,
      }))
      return {
        title: groupTitle(groupLabel(2018, g.winner2018, 0), groupLabel(2022, g.winner2022, 0)),
        winner2018: g.winner2018,
        winner2022: g.winner2022,
        cities: g.cities,
        validos2026: g.validos2026,
        ties2026: g.ties2026,
        parts,
      }
    })

  const grouped = groups.reduce((n, g) => n + g.cities, 0)
  const validosGroups = groups.reduce((n, g) => n + g.validos2026, 0)
  const cities2026 = grouped + tieCases.length + noData.length
  return { groups, tieCases, noData, totals: { cities2026, grouped, validosGroups, validos2026 } }
}

/** Sum of the two runoff candidates' votes (they are the valid votes of a runoff, check included). */
function validosOf(v26: Map<number, number>, pair: readonly [number, number]): number {
  return pair.reduce((sum, n) => sum + (v26.get(n) ?? 0), 0)
}