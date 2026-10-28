/**
 * Number model of the city card, PURE (no HTML, no data access): the same numbers feed the card (#5),
 * the three-cycle view (#6) and the share picture (#7). API documented in src/shared/README.md.
 *
 * Definitions (product decisions of ticket #5):
 * - "Votaram" = VALID votes / aptos (the electorate). "Não votaram" = the rest of the electorate
 *   = abstenção + brancos + nulos, where nulos also holds the "anulados em apuração separada".
 * - Candidate percentages are shares of valid votes. The three non-voter parts are shares of the non-voters.
 * - Every percentage shown as an integer comes from largestRemainder, so the parts of a bar add up to exactly 100.
 */
import type { Candidate, Turnout, Turno, Vote } from '../data'
import { candidateName } from './candidate-name'
import { sideTone } from './candidates'

/** The three presidential cycles of the product, in tab order. */
export const CYCLES: readonly number[] = [2018, 2022, 2026]

/** 36400 -> "36.400" (pt-BR thousands separator; does not depend on the ICU data of the runtime). */
export function formatInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/**
 * One decimal, comma, trailing ",0" dropped: 33.6 -> "33,6%", 30 -> "30%". A non-zero part never shows as 0%
 * ("menos de 0,1%") and a partial one never as 100% ("mais de 99,9%").
 */
export function formatPct(x: number): string {
  const r = Math.round(x * 10) / 10
  if (x > 0 && r === 0) return 'menos de 0,1%'
  if (x < 100 && r >= 100) return 'mais de 99,9%'
  return `${String(r).replace('.', ',')}%`
}

/**
 * Splits `total` (default 100) among `parts` proportionally, in whole numbers that add up to exactly `total`:
 * each part gets its floor, the remaining points go to the largest fractional remainders (ties: earlier part).
 * All-zero input gives all zeros.
 */
export function largestRemainder(parts: readonly number[], total = 100): number[] {
  const sum = parts.reduce((a, b) => a + b, 0)
  if (sum <= 0) return parts.map(() => 0)
  const exact = parts.map((p) => (p / sum) * total)
  const out = exact.map((q) => Math.floor(q + 1e-9))
  let left = total - out.reduce((a, b) => a + b, 0)
  const order = exact.map((q, i) => ({ i, rem: q - out[i]! })).sort((x, y) => (Math.abs(y.rem - x.rem) > 1e-9 ? y.rem - x.rem : x.i - y.i))
  for (const { i } of order) {
    if (left <= 0) break
    out[i]!++
    left--
  }
  return out
}

export type SegmentKey = 'a' | 'b' | 'outros' | 'abstencao' | 'brancos' | 'nulos'

export interface Segment {
  key: SegmentKey
  /** Candidate display name, "Outros candidatos (N)", "Abstenção", "Brancos", "Nulos". */
  label: string
  votos: number
  /** Whole percent; the segments of one bar add up to 100 (all 0 when the bar has nothing to split). */
  pct: number
  /** Candidate number of a/b (keyed with the year and round the result is for). */
  numero?: number
  /** The colour of a/b: the candidate's own side in the identity table (#84), `outros` for a round 1 runner-up beside a runoff candidate. */
  tone?: SegmentKey
  /** The short form of the candidate's name (the table's, #84) for the tight places. */
  short?: string
}

export interface CandidateTally {
  numero: number
  nome: string
  short?: string
  votos: number
}

export interface CityResult {
  ano: number
  turno: Turno
  aptos: number
  comparecimento: number
  validos: number
  /** aptos - validos: abstenção + brancos + nulos (+ anulados). */
  naoVotaram: number
  /** Whole percents of the electorate, adding up to 100 (both 0 when aptos = 0). */
  votedPct: number
  notVotedPct: number
  /** Exact percents of the electorate (for sentences and drawings that show decimals). */
  votedShare: number
  notVotedShare: number
  /** Bar "Votaram": [a, b] plus "outros" when the round has more than two candidates. */
  voted: Segment[]
  /** Bar "Não votaram": abstenção, brancos, nulos. */
  notVoted: Segment[]
  /** How many candidates of this round are not shown as a or b. */
  outrosCount: number
  /** Every candidate of the round, most votes first (ties by candidate number). */
  ranking: CandidateTally[]
}

export interface CityResultInput {
  turnout: Turnout
  /** Votes of THIS city, cycle and round. */
  votes: readonly Vote[]
  /** Candidates; only the rows of the turnout's ano and turno are used (names are never shared across years). */
  candidates: readonly Candidate[]
}

const share = (n: number, d: number) => (d <= 0 ? 0 : (n / d) * 100)

export function buildCityResult({ turnout: t, votes, candidates }: CityResultInput): CityResult {
  const tally = new Map<number, CandidateTally>()
  for (const c of candidates)
    if (c.ano === t.ano && c.turno === t.turno) tally.set(c.candidatoNumero, { numero: c.candidatoNumero, nome: candidateName(c.nomeUrna), short: candidateName(c.nomeUrna, 'short'), votos: 0 })
  for (const v of votes) {
    const row = tally.get(v.candidatoNumero) ?? { numero: v.candidatoNumero, nome: `Candidato nº ${v.candidatoNumero}`, votos: 0 }
    row.votos += v.votos
    tally.set(v.candidatoNumero, row)
  }
  const ranking = [...tally.values()].sort((x, y) => y.votos - x.votos || x.numero - y.numero)
  const [a, b, ...rest] = ranking
  const outrosVotos = rest.reduce((n, c) => n + c.votos, 0)

  const leaders: Segment[] = []
  if (a) leaders.push({ key: 'a', label: a.nome, votos: a.votos, numero: a.numero, short: a.short, tone: sideTone(t.ano, a.numero, b?.numero, 'a'), pct: 0 })
  if (b) leaders.push({ key: 'b', label: b.nome, votos: b.votos, numero: b.numero, short: b.short, tone: sideTone(t.ano, b.numero, a?.numero, 'b'), pct: 0 })
  const voted: Segment[] = rest.length ? [...leaders, { key: 'outros', label: `Outros candidatos (${rest.length})`, votos: outrosVotos, pct: 0 }] : leaders
  largestRemainder(voted.map((s) => s.votos)).forEach((p, i) => (voted[i]!.pct = p))

  const naoVotaram = Math.max(t.aptos - t.validos, 0)
  const brancos = t.brancos
  const nulos = t.nulos + t.anuladosApuSep
  // The file reports 0 abstentions for posts where nobody turned out; everyone not voting is then an abstention.
  const abstencao = Math.max(naoVotaram - brancos - nulos, 0)
  const notVoted: Segment[] = [
    { key: 'abstencao', label: 'Abstenção', votos: abstencao, pct: 0 },
    { key: 'brancos', label: 'Brancos', votos: brancos, pct: 0 },
    { key: 'nulos', label: 'Nulos', votos: nulos, pct: 0 },
  ]
  largestRemainder(notVoted.map((s) => s.votos)).forEach((p, i) => (notVoted[i]!.pct = p))

  const [votedPct = 0, notVotedPct = 0] = largestRemainder([t.validos, naoVotaram])
  return {
    ano: t.ano,
    turno: t.turno,
    aptos: t.aptos,
    comparecimento: t.comparecimento,
    validos: t.validos,
    naoVotaram,
    votedPct,
    notVotedPct,
    votedShare: share(t.validos, t.aptos),
    notVotedShare: share(naoVotaram, t.aptos),
    voted,
    notVoted,
    outrosCount: rest.length,
    ranking,
  }
}
