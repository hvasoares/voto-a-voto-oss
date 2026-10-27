/**
 * Pure computations behind the reports (ticket #12). Build-time only: pages call these with the
 * whole dataset already in memory; the browser never parses data (web/README.md "Data").
 *
 * Definitions (from the repo notes this work cites in its tests:
 * thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md and
 * thoughts/team/data-engineering/2026-10-26-lean-analytics-visualization-principles.md):
 * - Margem = the runoff pair's first candidate's share minus the second's, of the round's valid
 *   votes, in percentage points (pp). Negative: the second candidate ahead; ties are exactly 0.
 * - Virada (swing) = round-2 margin minus round-1 margin, in pp.
 * - A city "vira" when the margin changes sign between round 1 and round 2 of 2026.
 * - Every rate is paired with its volume (Lean Analytics): each ranked row shows the valid-vote
 *   count next to the pp figures, and rankings take a minimum-size filter.
 * - Overseas voting posts (UF "zz") take no part in the rankings (they are not cities).
 *
 * Candidate pairs: the pair comes from data/candidates.csv, the two candidates of the 2º turno of
 * the year, first = lower candidate number. In the real runoff the first is Lula (nº 13) and the
 * second Flavio Bolsonaro (nº 22); the fixtures use "Candidato A"/"Candidato B" (91/92) — pinned
 * by compute.test.ts. The vs-2022 comparison pairs the same numbers across years: Lula with Lula
 * and Bolsonaro (candidate 22 in 2022) with Flavio Bolsonaro.
 */
import type { Candidate, City, Vote, Turnout } from '@site/data/types'

export interface CandidatePair {
  primeiro: number
  segundo: number
  /** Ballot names, for the labels of the pages ("LULA" -> "Lula"). */
  nomePrimeiro: string
  nomeSegundo: string
}

/** The pair of the 2º turno of `ano`, first = lower candidate number, with the ballot names. */
export function runoffPair(candidates: Candidate[], ano: number): CandidatePair {
  const rows = candidates.filter((c) => c.ano === ano && c.turno === 2).sort((x, y) => x.candidatoNumero - y.candidatoNumero)
  if (rows.length < 2) throw new Error(`runoffPair: the runoff of ${ano} needs two candidates, got ${rows.length}`)
  const a = rows[0]!
  const b = rows[1]!
  return { primeiro: a.candidatoNumero, segundo: b.candidatoNumero, nomePrimeiro: a.nomeUrna, nomeSegundo: b.nomeUrna }
}

export const MIN_FLIP_VALIDOS = 5000
/** Minimum electorate of the turnout extremes of the hub (frame 6: "5k+ voters" note). */
export const MIN_TURNOUT_APTOS = 5000
/** Minimum runoff valid votes of the biggest-swing highlight of the hub (frame 6: "cidades de 100 mil+ votos"). */
export const MIN_BIG_SWING_VALIDOS = 100000

export interface MarginInput {
  cities: City[]
  votes: Vote[]
  turnout: Turnout[]
  candidates: Candidate[]
}

export interface CityMargin {
  uf: string
  cdMunicipio: string
  /** City name as the dataset writes it, e.g. "ITABIRITO" (display adds the upper-case UF). */
  nome: string
  slug: string
  regiao: string
  /** Round margin in pp (pair's first share minus second's share of that round's valid votes). */
  margin1: number
  margin2: number
  /** Virada: margin2 - margin1, in pp. > 0 means the margin moved toward the first candidate (Lula). */
  swing: number
  /** Valid votes of both rounds — the volume shown next to every pp figure. */
  validos1: number
  validos2: number
  /** The two candidates' exact votes in the runoff (the closest-race diff). */
  votos2: { primeiro: number; segundo: number }
}

export interface VoteGain {
  /** Sum over the cities that have the round in both cycles; a city without it takes no part. */
  total: number
  cities: { gained: number; lost: number }
}

export interface ComputedReports {
  /** The margins of every city that has both 2026 rounds, in cities.csv order (no ranking here). */
  margins: CityMargin[]
  /** Net votes (2026 runoff - 2022 runoff) per candidate. */
  netVotes: { primeiro: VoteGain; segundo: VoteGain }
  pair: CandidatePair
}

const voteKey = (v: { ano: number; turno: number; uf: string; cdMunicipio: string; candidatoNumero: number }): string =>
  `${v.ano}|${v.turno}|${v.uf}|${v.cdMunicipio}|${v.candidatoNumero}`
const turnoutKey = (t: { ano: number; turno: number; uf: string; cdMunicipio: string }): string => `${t.ano}|${t.turno}|${t.uf}|${t.cdMunicipio}`
const isBrazil = (row: { uf: string }): boolean => row.uf !== 'zz'
const share = (votes: number, validos: number) => (validos > 0 ? (votes / validos) * 100 : 0)

/** The 2026 margins (both rounds) of every city that has both rounds, with the vs-2022 net votes. */
export function computeReports(input: MarginInput): ComputedReports {
  const pair2026 = runoffPair(input.candidates, 2026)
  const pair2022 = runoffPair(input.candidates, 2022)

  const votesOf = new Map<string, number>()
  for (const v of input.votes) {
    if (v.candidatoNumero === pair2026.primeiro || v.candidatoNumero === pair2026.segundo) votesOf.set(voteKey(v), v.votos)
  }
  const validosOf = new Map<string, number>()
  for (const t of input.turnout) validosOf.set(turnoutKey(t), t.validos)

  const margins: CityMargin[] = []
  for (const c of input.cities) {
    const validos1 = validosOf.get(`${2026}|1|${c.uf}|${c.cdMunicipio}`)
    const validos2 = validosOf.get(`${2026}|2|${c.uf}|${c.cdMunicipio}`)
    if (validos1 === undefined || validos2 === undefined) continue
    const voto = (ano: number, turno: 1 | 2, candidate: number) => votesOf.get(`${ano}|${turno}|${c.uf}|${c.cdMunicipio}|${candidate}`) ?? 0
    const v11 = voto(2026, 1, pair2026.primeiro)
    const v12 = voto(2026, 1, pair2026.segundo)
    const v21 = voto(2026, 2, pair2026.primeiro)
    const v22 = voto(2026, 2, pair2026.segundo)
    const margin1 = share(v11 - v12, validos1)
    const margin2 = share(v21 - v22, validos2)
    margins.push({
      uf: c.uf,
      cdMunicipio: c.cdMunicipio,
      nome: c.nome,
      slug: c.slug,
      regiao: c.regiao,
      margin1,
      margin2,
      swing: margin2 - margin1,
      validos1,
      validos2,
      votos2: { primeiro: v21, segundo: v22 },
    })
  }

  const gain = (candidate: number): VoteGain => {
    let total = 0
    let gained = 0
    let lost = 0
    for (const v of input.votes) {
      if (v.turno !== 2 || !isBrazil(v) || v.candidatoNumero !== candidate) continue
      if (v.ano !== 2026) continue
      // Cities without the earlier round take no part (Boa Esperança do Norte/MT exists only from 2026).
      const before = votesOf.get(voteKey({ ...v, ano: 2022, candidatoNumero: candidate }))
      if (before === undefined) continue
      const delta = v.votos - before
      total += delta
      if (delta > 0) gained++
      else if (delta < 0) lost++
    }
    return { total, cities: { gained, lost } }
  }

  return {
    margins,
    netVotes: { primeiro: gain(pair2026.primeiro), segundo: gain(pair2026.segundo) },
    pair: pair2026,
  }
}

/** Cities where the margin changed sign from round 1 to round 2 — toward Lula (> 0) or toward Flavio (< 0). */
export function flipsToLula(rows: CityMargin[]): CityMargin[] {
  return rows.filter((r) => isBrazil(r) && r.margin1 < 0 && r.margin2 > 0)
}

export function flipsToFlavio(rows: CityMargin[]): CityMargin[] {
  return rows.filter((r) => isBrazil(r) && r.margin1 > 0 && r.margin2 < 0)
}

const ranked = (rows: CityMargin[]): CityMargin[] =>
  [...rows].sort((a, b) => b.swing - a.swing || b.validos2 - a.validos2 || a.nome.localeCompare(b.nome, 'pt') || a.uf.localeCompare(b.uf))

/** The ranked list of the report: viradas toward Lula, biggest first, only cities of MIN_FLIP_VALIDOS+ valid votes. */
export function rankedFlipsToLula(rows: CityMargin[]): CityMargin[] {
  return ranked(flipsToLula(rows).filter((r) => r.validos2 >= MIN_FLIP_VALIDOS))
}

/** The ranked viradas toward Flavio, same filter (the single 2026 one is too small and drops out). */
export function rankedFlipsToFlavio(rows: CityMargin[]): CityMargin[] {
  return ranked(flipsToFlavio(rows).filter((r) => r.validos2 >= MIN_FLIP_VALIDOS))
}

/** Cities the runoff was won by each candidate (margin > 0) and the exact ties. */
export function citiesWonInRunoff(rows: CityMargin[]): { lula: number; flavio: number; ties: CityMargin[] } {
  const ties: CityMargin[] = []
  let lula = 0
  let flavio = 0
  for (const r of rows) {
    if (!isBrazil(r)) continue
    if (r.margin2 > 0) lula++
    else if (r.margin2 < 0) flavio++
    else ties.push(r)
  }
  return { lula, flavio, ties }
}

export interface ClosestRace {
  nome: string
  uf: string
  slug: string
  /** |votes of the first candidate - votes of the second| in the runoff; the 0 of a tie. */
  diff: number
  margin: number
  validos2: number
}

/** The closest races of the runoff, smallest absolute difference first, biggest city as the tie-break. */
export function closestRaces(rows: CityMargin[]): ClosestRace[] {
  return rows
    .filter(isBrazil)
    .map((r) => ({
      nome: r.nome,
      uf: r.uf,
      slug: r.slug,
      diff: Math.abs(r.votos2.primeiro - r.votos2.segundo),
      margin: r.margin2,
      validos2: r.validos2,
    }))
    .sort((a, b) => a.diff - b.diff || b.validos2 - a.validos2 || a.nome.localeCompare(b.nome, 'pt'))
}

export interface TurnoutExtreme {
  nome: string
  uf: string
  slug: string
  /** Turnout of the runoff: comparecimento / eleitorado apto, in %. */
  rate: number
  aptos: number
}

/** The highest and lowest turnout of the runoff among cities with MIN_TURNOUT_APTOS+ eleitores aptos. */
export function turnoutExtremes(input: MarginInput, minAptos = MIN_TURNOUT_APTOS): { high: TurnoutExtreme | undefined; low: TurnoutExtreme | undefined } {
  const byKey = new Map(input.cities.map((c) => [`${c.uf}|${c.cdMunicipio}`, c] as const))
  const rates: TurnoutExtreme[] = []
  for (const t of input.turnout) {
    if (t.ano !== 2026 || t.turno !== 2 || !isBrazil(t) || t.aptos < minAptos) continue
    const c = byKey.get(`${t.uf}|${t.cdMunicipio}`)
    rates.push({ nome: c?.nome ?? '', uf: t.uf, slug: c?.slug ?? '', rate: (t.comparecimento / t.aptos) * 100, aptos: t.aptos })
  }
  const sorted = [...rates].sort((a, b) => b.rate - a.rate || b.aptos - a.aptos || a.nome.localeCompare(b.nome, 'pt'))
  return { high: sorted[0], low: sorted[sorted.length - 1] }
}

/** The biggest swing of cities with MIN_BIG_SWING_VALIDOS+ valid votes in the runoff (hub headline). */
export function biggestSwing(rows: CityMargin[], minValidos = MIN_BIG_SWING_VALIDOS): CityMargin | undefined {
  const eligible = rows.filter((r) => isBrazil(r) && r.validos2 >= minValidos)
  return ranked(eligible)[0]
}