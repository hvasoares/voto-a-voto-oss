/**
 * Build-time aggregation of the dataset per state, for ticket #14 (screens 11, 11b and 13).
 * Node only: an Astro build reads the whole dataset once through the same store as the other pages
 * (@/data), aggregates it and pre-renders static pages; the browser gets HTML, never a CSV.
 *
 * Rules of the ticket (and of `web/src/lib/compare.ts`):
 * - Aggregates per state across 2018, 2022 and 2026, rounds 1 and 2, excluding the overseas `zz` rows.
 * - Deterministic: rows sorted by UF; the screens sort by valid votes below.
 * - A state cycle that does not exist (e.g. Boa Esperança do Norte/MT has ciclos=2026 in the fixture
 *   set; a whole state without an older round) is "sem dados", never zero.
 * - Comparisons pair "the same municipalities": votes and valid votes summed only over the
 *   municipality codes BOTH cycles have (2026 adds Boa Esperança do Norte — that vote never counts
 *   as a swing). Percentages still belong to one cycle per bar on screen 13.
 */
import type { DataStore, Turno } from '@/data'
import { createNodeStore } from '@/data/node'
import { buildCompareRow, buildCycleBlocks, CYCLES, runoffPair, shortName, sortCompareRows, type CompareRow, type CycleBlock, type RunoffTally } from './compare'

const OVERSEAS_UF = 'zz'

/** Per-municipality tallies of one state round: the raw material of every sum below. */
export interface RoundStats {
  ano: number
  turno: Turno
  /** Valid votes of the whole state (over the municipalities of this round). */
  validos: number
  /** Valid votes per municipality code. */
  muniValidos: Map<string, number>
  /** Votes per candidate number, whole state. */
  votesByCandidate: Map<number, number>
  /** Votes per (municipality, candidate number). */
  muniVotes: Map<string, Map<number, number>>
}

export interface StateStats {
  uf: string
  /** `${ano}-${turno}` -> the round's tallies. Present only when the state has the round. */
  rounds: Map<string, RoundStats>
  /** Candidates of the dataset, by (ano, turno) -> number -> urna name. */
  candidateNames: Map<string, Map<number, string>>
  /** The largest city of the state in 2026 R2 valid votes (the "ver os três ciclos de uma cidade" target). */
  topCity?: { slug: string; nome: string }
}

const roundKey = (ano: number, turno: number): string => `${ano}-${turno}`
const candidateKey = (ano: number, turno: number): string => `${ano}-${turno}`

function emptyRound(ano: number, turno: Turno): RoundStats {
  return { ano, turno, validos: 0, muniValidos: new Map(), votesByCandidate: new Map(), muniVotes: new Map() }
}

/** Aggregates the whole dataset per state, once. Pure over the store; no file access of its own. */
export async function buildStateStats(store: DataStore): Promise<StateStats[]> {
  const [turnoutRows, voteRows, candidateRows] = await Promise.all([store.turnout(), store.votes(), store.candidates()])
  const states = new Map<string, StateStats>()

  const stat = (uf: string): StateStats => {
    let s = states.get(uf)
    if (!s) states.set(uf, (s = { uf, rounds: new Map(), candidateNames: new Map() }))
    return s
  }
  const round = (uf: string, ano: number, turno: number): RoundStats => {
    const s = stat(uf)
    const key = roundKey(ano, turno)
    let r = s.rounds.get(key)
    if (!r) s.rounds.set(key, (r = emptyRound(ano, turno as Turno)))
    return r
  }

  for (const t of turnoutRows) {
    if (t.uf === OVERSEAS_UF) continue
    const r = round(t.uf, t.ano, t.turno)
    r.validos += t.validos
    if (t.validos > 0) r.muniValidos.set(t.cdMunicipio, (r.muniValidos.get(t.cdMunicipio) ?? 0) + t.validos)
  }
  for (const v of voteRows) {
    if (v.uf === OVERSEAS_UF) continue
    const r = round(v.uf, v.ano, v.turno)
    r.votesByCandidate.set(v.candidatoNumero, (r.votesByCandidate.get(v.candidatoNumero) ?? 0) + v.votos)
    let byMuni = r.muniVotes.get(v.cdMunicipio)
    if (!byMuni) r.muniVotes.set(v.cdMunicipio, (byMuni = new Map()))
    byMuni.set(v.candidatoNumero, (byMuni.get(v.candidatoNumero) ?? 0) + v.votos)
  }
  // candidates.csv has no uf column: all states share the names of each round (one national election).
  const names = new Map<string, Map<number, string>>()
  for (const c of candidateRows) {
    const key = candidateKey(c.ano, c.turno)
    let m = names.get(key)
    if (!m) names.set(key, (m = new Map()))
    m.set(c.candidatoNumero, c.nomeUrna)
  }
  for (const s of states.values()) s.candidateNames = names

  // "Ver os três ciclos de uma cidade" (screen 13) needs a city of the state: the largest one by 2026 R2 valid votes.
  for (const s of states.values()) {
    const cities = await store.citiesByUf(s.uf)
    const r = s.rounds.get(roundKey(2026, 2))
    let best: { cd: string; validos: number } | undefined
    for (const cd of r?.muniValidos.keys() ?? []) {
      const v = r!.muniValidos.get(cd) ?? 0
      if (!best || v > best.validos) best = { cd, validos: v }
    }
    if (best) {
      const city = cities.find((c) => c.cdMunicipio === best!.cd)
      if (city) s.topCity = { slug: city.slug, nome: city.nome }
    }
  }

  return [...states.values()].sort((a, b) => a.uf.localeCompare(b.uf, 'pt'))
}

/** All states in screen-13 order: 2026 R2 valid votes first, ties (and states without the round) by UF. */
export function stateOrder(stats: readonly StateStats[]): { uf: string; validos: number }[] {
  return stats
    .map((s) => ({ uf: s.uf, validos: tallyOf(s, 2026, 2)?.validos ?? 0 }))
    .sort((a, b) => b.validos - a.validos || a.uf.localeCompare(b.uf, 'pt'))
}

/** The six largest states (the list the compare screens show), minus `uf`: the "Outros estados" of screen 13. */
export function otherLargestStates(stats: readonly StateStats[], uf: string, n = 6): StateStats[] {
  const ufs = new Set(stateOrder(stats).slice(0, n).map((x) => x.uf))
  ufs.delete(uf)
  const byUf = new Map(stats.map((s) => [s.uf, s]))
  return stateOrder(stats.filter((s) => ufs.has(s.uf))).map((x) => byUf.get(x.uf)!)
}

/** The three cycle blocks of screen 13 for one state (both turnos are aggregated; the screen shows round 2). */
export function cycleBlocksFor(s: StateStats): CycleBlock[] {
  const tallies = new Map<number, RunoffTally>()
  for (const ano of CYCLES) {
    const t = tallyOf(s, ano, 2)
    if (t && t.validos > 0) tallies.set(ano, t)
  }
  const labels = { [2018]: labelsOf(s, 2018), [2022]: labelsOf(s, 2022), [2026]: labelsOf(s, 2026) }
  return buildCycleBlocks({ tallies, labels })
}

export function roundOf(s: StateStats, ano: number, turno: Turno): RoundStats | undefined {
  return s.rounds.get(roundKey(ano, turno))
}

/** Valid votes of `round` over `basis` (municipality codes); without a basis, every municipality of the round. */
function summed(rs?: RoundStats, basis?: ReadonlySet<string>): { validos: number; votes: Map<number, number> } | undefined {
  if (!rs) return undefined
  const votes = new Map<number, number>()
  let validos = 0
  if (!basis) {
    validos = rs.validos
    for (const [n, v] of rs.votesByCandidate) votes.set(n, v)
    return { validos, votes }
  }
  for (const cd of basis) {
    validos += rs.muniValidos.get(cd) ?? 0
    const mv = rs.muniVotes.get(cd)
    if (!mv) continue
    for (const [n, v] of mv) votes.set(n, (votes.get(n) ?? 0) + v)
  }
  return { validos, votes }
}

/** `keys(a) ∩ keys(b)` as a new set: works over Maps (per-municipality tallies) and Sets alike. */
export function intersection(a: ReadonlyMap<string, unknown> | ReadonlySet<string>, b: ReadonlyMap<string, unknown> | ReadonlySet<string>): Set<string> {
  const out = new Set<string>()
  for (const x of a.keys()) if (b.has(x)) out.add(x)
  return out
}

/**
 * The runoff tally of one state round, over `basis`. undefined only when the state has no such
 * round (the screen shows "sem dados"). Side totals come from the pairing rule; a candidate with
 * no vote rows counts as 0 (never "missing" the whole tally — the state voted).
 */
export function tallyOf(s: StateStats, ano: number, turno: Turno, basis?: ReadonlySet<string>): RunoffTally | undefined {
  const sum = summed(roundOf(s, ano, turno), basis)
  if (!sum) return undefined
  return tallyFromBasis(sum, ano)
}

/**
 * Pair of one round: the ticket pairing (13 vs 17 in 2018, 13 vs 22 later) when the dataset runs it;
 * otherwise the two leading candidates by votes, lower ballot number on the left (the fixture
 * dataset's "Candidato A" vs "Candidato B" works the same way as the city screens).
 */
export function electPair(
  votes: ReadonlyMap<number, number>,
  ano: number,
): { left: number; rival: number; rule: 'ticket' | 'leaders' } {
  const t = runoffPair(ano)
  if (votes.get(t.left)! > 0 && votes.get(t.rival)! > 0) return { ...t, rule: 'ticket' }
  const leaders = [...votes.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 2)
  const [a = 1, b = 2] = leaders.map(([n]) => n)
  return { left: Math.min(a, b), rival: Math.max(a, b), rule: 'leaders' }
}

/** Short side labels of one round, from candidates.csv (never invented): 13 -> "Lula", 22 (2026) -> "Flavio".
 *  Without the round's rows the pairing falls back to the ticket rule and names to "Candidato nº N" (never shortened). */
export function labelsOf(s: StateStats, ano: number, turno: Turno = 2): Record<'left' | 'rival', string> {
  const r = roundOf(s, ano, turno)
  const names = s.candidateNames.get(candidateKey(ano, turno)) ?? new Map<number, string>()
  const pair = (r && electPair(r.votesByCandidate, ano)) ?? { ...runoffPair(ano), rule: 'ticket' as const }
  const label = (n: number): string => {
    const name = names.get(n)
    return name ? shortName(name) : `Candidato nº ${n}`
  }
  return { left: label(pair.left), rival: label(pair.rival) }
}

/** The paired tallies 2026 vs `ciclo` of one state: both over the municipalities the two cycles have. */
export function compareTallies(s: StateStats, ciclo: number, turno: Turno = 2): { c: RunoffTally; old: RunoffTally; cRound: RoundStats; oldRound: RoundStats } | undefined {
  const cRound = roundOf(s, 2026, turno)
  const oldRound = roundOf(s, ciclo, turno)
  if (!cRound || !oldRound) return undefined
  // A comparison must use the same municipalities: the codes both cycles' turnout rows have (2026
  // adds Boa Esperança do Norte/MT; that vote is not a swing).
  const basis = intersection(cRound.muniValidos, oldRound.muniValidos)
  if (basis.size === 0) return undefined
  const c = summed(cRound, basis)
  const old = summed(oldRound, basis)
  return { c: tallyFromBasis(c!, 2026), old: tallyFromBasis(old!, ciclo), cRound, oldRound }
}

/** The sorted page rows of one compare screen: every state of the dataset that has both cycles. */
export function buildCompareRows(stats: readonly StateStats[], ciclo: number, turno: Turno = 2): CompareRow[] {
  const rows: CompareRow[] = []
  for (const s of stats) {
    const cmp = compareTallies(s, ciclo, turno)
    if (!cmp) continue
    const labels = labelsOf(s, 2026, turno)
    rows.push(buildCompareRow({ uf: s.uf, c: cmp.c, old: cmp.old, labels }))
  }
  return sortCompareRows(rows)
}

/**
 * The tally of one summed round: sides follow `electPair` — the ticket candidates (13 vs 17 in
 * 2018, 13 vs 22 later) when that round has votes for both, otherwise the two leaders (the fixture
 * set's "Candidato A/B"): a state that voted is never rendered as two zeros.
 */
function tallyFromBasis(sum: { validos: number; votes: Map<number, number> }, ano: number): RunoffTally {
  const pair = electPair(sum.votes, ano)
  return { validos: sum.validos, left: sum.votes.get(pair.left) ?? 0, rival: sum.votes.get(pair.rival) ?? 0 }
}

/** Memoized build-time loader over the configured dataset directory (DATA_DIR, default the fixtures). */
export function stateStatsLoader() {
  let cache: Promise<StateStats[]> | undefined
  return () => (cache ??= buildStateStats(createNodeStore()))
}

export const stateStats = stateStatsLoader()