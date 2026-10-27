/**
 * The arc of a city (#41), PURE: who had the most votes in the 2nd round of 2018, 2022 and 2026, told as a sequence.
 * "Side" is the political camp of the winning candidate across cycles, as the cohort report (`cohorts.ts`) draws it (the
 * PT camp is Haddad and Lula, the Bolsonaro camp is Bolsonaro and Flavio; in the fixture the party). The arc describes the
 * sequence and says nothing about why a city voted as it did.
 *
 *   a cycle with no 2nd-round votes for the city        -> `missing` (with the years), whatever the other cycles did
 *   no cycle missing, a 2nd round level on votes        -> `tie` (with the years)
 *   the three winners, A = the side of 2018:
 *     A A A -> `same`   A A B -> `switched2026`   A B B -> `switched2022`   A B A -> `returned`   A B C -> `switchedTwice`
 * Every city has exactly one arc, overseas posts included. The cities per arc are counted in `arcs.json` and match the
 * cohort table of "Como cada grupo votou" (overseas posts never join that table, so they are counted apart).
 */
import { candidateLabels, outcomeOf, RUNOFF_CYCLES, type Cycle, type Outcome } from './cohorts'
import type { CityShard } from './city-shard'

export const ARC_KINDS = ['same', 'switched2022', 'switched2026', 'returned', 'switchedTwice', 'tie', 'missing'] as const
export type ArcKind = (typeof ARC_KINDS)[number]

export interface Arc {
  kind: ArcKind
  /** The cycles that are missing (`missing`) or level (`tie`). */
  years?: number[]
}

/** The 2nd-round outcome of one cycle of a shard, and the camp of its winner. */
function runoff(shard: CityShard, ano: Cycle): { outcome: Outcome; camp?: string } {
  const names = shard.candidates[String(ano)]?.['2'] ?? {}
  const pair = Object.keys(names).map(Number)
  const votes = shard.cycles[String(ano)]?.['2']?.votes
  if (pair.length !== 2 || typeof votes !== 'object') return { outcome: { kind: 'no-data' } }
  const outcome = outcomeOf(new Map(Object.entries(votes).map(([n, v]) => [Number(n), v])), [pair[0]!, pair[1]!])
  if (outcome.kind !== 'won') return { outcome }
  const rows = Object.entries(names).map(([n, [nomeUrna, partido]]) => ({ ano, turno: 2, candidatoNumero: Number(n), nomeUrna: nomeUrna!, partido: partido! }))
  return { outcome, camp: candidateLabels(rows)[`${ano}|${outcome.candidate}`]!.camp }
}

export function cityArc(shard: CityShard): Arc {
  const cycles = RUNOFF_CYCLES.map((ano) => ({ ano, ...runoff(shard, ano) }))
  const missing = cycles.filter((c) => c.outcome.kind === 'no-data').map((c) => c.ano)
  if (missing.length) return { kind: 'missing', years: missing }
  const tied = cycles.filter((c) => c.outcome.kind === 'tie').map((c) => c.ano)
  if (tied.length) return { kind: 'tie', years: tied }
  const [a, b, c] = cycles.map((x) => x.camp!) as [string, string, string]
  if (a === b) return { kind: b === c ? 'same' : 'switched2026' }
  return { kind: b === c ? 'switched2022' : c === a ? 'returned' : 'switchedTwice' }
}

export type ArcCounts = Record<ArcKind, number>

/** The published file: the cities per arc (overseas posts apart, as in the cohort table). */
export interface ArcsFile {
  counts: ArcCounts
  overseas: ArcCounts
}

const zero = (): ArcCounts => Object.fromEntries(ARC_KINDS.map((k) => [k, 0])) as ArcCounts

export function countArcs(shards: Iterable<CityShard>): ArcsFile {
  const file: ArcsFile = { counts: zero(), overseas: zero() }
  for (const shard of shards) (shard.city.uf === 'zz' ? file.overseas : file.counts)[cityArc(shard).kind]++
  return file
}
