/**
 * Margins by state (screens 10/10b), PURE (no HTML, no data access): aggregates the turnout and
 * votes rows of ONE cycle per UF and computes what both map pages need.
 *
 * Definitions (the highlights note and /sobre-os-dados/):
 * - Margin = share of the pair member "Lula side" minus the share of the other, in percentage
 *   points of valid votes (pp) of the SAME round. Swing = R2 margin minus R1 margin, computed on
 *   the UNROUNDED margins so the figures match the swing note exactly (RJ: -13.6 -> -6.2 is +7.4).
 * - The pair and which member is "Lula side" come from the data itself, never from a hard-coded
 *   candidate number: the pair is the two candidates with most valid votes in the round 2 (ties:
 *   lower number), and "Lula side" is the one that leads nationally in that round. The same pair is
 *   compared in both rounds.
 * - The overseas post (UF "zz") is excluded everywhere here, as the state aggregate of ticket #1
 *   never lists it.
 *
 * Everything here is deterministic given the arrays of the store (`@site/data`).
 */
import type { Candidate, Turnout, Vote } from '@site/data'

export const OVERSEAS_UF = 'zz'

/** One member of the runoff pair, as named in candidates.csv of the cycle. */
export interface PairMember {
  numero: number
  nome: string
  partido: string
}

export interface StateMargin {
  uf: string
  /** Valid votes of the round 1 and of the round 2 of this UF. */
  validos1: number
  validos2: number
  /** Pair votes in each round. */
  votosA1: number
  votosB1: number
  votosA2: number
  votosB2: number
  /** Exact pp of valid votes (side A minus side B), per round. */
  margin1: number
  margin2: number
  /** Exact swing = margin2 - margin1 (NOT the difference of the rounded margins). */
  swing: number
}

/** The same aggregate for the whole country (UF "zz" excluded). */
export interface NationalMargin {
  validos1: number
  validos2: number
  margin1: number
  margin2: number
  swing: number
}

export interface Margins {
  ano: number
  /** The two candidates of the round 2; ladoA is the "Lula side" (leads nationally in that round). */
  ladoA: PairMember
  ladoB: PairMember
  /** One row per UF with both rounds of the cycle, sorted by UF code. */
  states: StateMargin[]
  national: NationalMargin
}

export interface MarginsInput {
  ano: number
  turnout: readonly Turnout[]
  votes: readonly Vote[]
  /** Candidate names: only rows of `ano` are used (names are never shared across years). */
  candidates: readonly Candidate[]
}

/** One decimal, rounding half away from zero (so -7.65 -> -7.7), never a negative zero. */
export function roundPp(x: number): number {
  const r = Math.round(Math.abs(x) * 10) / 10
  return x < 0 && r !== 0 ? -r : r === 0 ? Math.abs(r) : r
}

/** Exact pp -> pt-BR with the leading sign and one decimal: -7.7 -> "-7,7"; 0 -> "+0,0". */
export function formatSwing(x: number): string {
  const abs = `${roundPp(Math.abs(x)).toFixed(1)}`.replace('.', ',')
  return `${x < 0 ? '-' : '+'}${abs}`
}

interface Tally {
  validos: [number, number] // by round (index 0 = round 1)
  votos: Map<number, [number, number]> // candidate number -> votes by round
}

function emptyTally(): Tally {
  return { validos: [0, 0], votos: new Map() }
}

/**
 * The numbers of both pages: per-UF rows plus the national aggregate, for one cycle.
 * A UF enters the list only when both rounds have at least one valid vote; the national aggregate
 * uses the same UFs (a state missing one round would distort the national share otherwise).
 */
export function computeMargins({ ano, turnout, votes, candidates }: MarginsInput): Margins {
  const tally = new Map<string, Tally>()
  for (const t of turnout) {
    if (t.ano !== ano || t.uf === OVERSEAS_UF) continue
    const s = tally.get(t.uf) ?? emptyTally()
    if (t.turno === 1) s.validos[0] += t.validos
    else s.validos[1] += t.validos
    tally.set(t.uf, s)
  }
  for (const v of votes) {
    if (v.ano !== ano || v.uf === OVERSEAS_UF) continue
    const s = tally.get(v.uf)
    if (!s) continue
    const list = s.votos.get(v.candidatoNumero) ?? [0, 0]
    if (v.turno === 1) list[0] += v.votos
    else list[1] += v.votos
    s.votos.set(v.candidatoNumero, list)
  }

  // National totals per candidate in the round 2, over the UFs kept below.
  let validos1 = 0
  let validos2 = 0
  const votosByRound = new Map<number, [number, number]>() // national, per candidate
  for (const s of tally.values()) {
    validos1 += s.validos[0]
    validos2 += s.validos[1]
    for (const [numero, list] of s.votos) {
      const all = votosByRound.get(numero) ?? [0, 0]
      votosByRound.set(numero, [all[0] + list[0], all[1] + list[1]])
    }
  }
  const top2 = [...votosByRound.entries()].sort((x, y) => y[1][1] - x[1][1] || x[0] - y[0]).slice(0, 2)
  const first = top2[0]
  const second = top2[1]
  if (!first || !second || validos1 <= 0 || validos2 <= 0) {
    throw new Error(`margins ${ano}: fewer than two candidates with valid votes in the round 2`)
  }
  const numA = first[0]
  const numB = second[0]
  const nome = new Map(candidates.filter((c) => c.ano === ano).map((c) => [c.candidatoNumero, c]))
  const member = (numero: number): PairMember => {
    const c = nome.get(numero)
    if (!c) throw new Error(`margins ${ano}: candidate ${numero} is not in candidates.csv of this set`)
    return { numero, nome: c.nomeUrna, partido: c.partido }
  }

  const states: StateMargin[] = []
  for (const uf of [...tally.keys()].sort()) {
    const s = tally.get(uf)!
    if (s.validos[0] <= 0 || s.validos[1] <= 0) continue
    const a = s.votos.get(numA) ?? [0, 0]
    const b = s.votos.get(numB) ?? [0, 0]
    const m1 = ((a[0] - b[0]) / s.validos[0]) * 100
    const m2 = ((a[1] - b[1]) / s.validos[1]) * 100
    states.push({
      uf,
      validos1: s.validos[0],
      validos2: s.validos[1],
      votosA1: a[0],
      votosB1: b[0],
      votosA2: a[1],
      votosB2: b[1],
      margin1: m1,
      margin2: m2,
      swing: m2 - m1,
    })
  }

  const [a1, a2] = votosByRound.get(numA)!
  const [b1, b2] = votosByRound.get(numB)!
  const national1 = ((a1 - b1) / validos1) * 100
  const national2 = ((a2 - b2) / validos2) * 100
  return {
    ano,
    ladoA: member(numA),
    ladoB: member(numB),
    states,
    national: { validos1, validos2, margin1: national1, margin2: national2, swing: national2 - national1 },
  }
}