/**
 * Pure model of the three-cycle view of one city (no HTML, no data access). The numbers come from the shared
 * `buildCityResult` (never recomputed here); this file only decides which side a candidate is on, whether a cycle has
 * data, and what text fits a segment.
 *
 * Product decisions (ticket #6, see CONTRACT.md):
 * - Round comes from `?turno=1|2`; real data defaults to round 2 (all three cycles have it).
 * - Side order = ballot number, the lower on the left, in every cycle. Round 1: the two leaders of the city by votes,
 *   placed by number, and "Outros" (everyone else) on the right. Names come from (ano, turno, numero), never from the number.
 * - A cycle without data is a "no-data" block with a one-sentence reason, never zeros.
 */
import type { Turno } from '../../data'
import { sideTone } from '../../shared/candidates'
import type { CityResult, Segment } from '../../shared/city-model'

export const DEFAULT_TURNO: Turno = 2

/** `?turno=1` or `?turno=2`; anything else is the default (round 2). */
export function parseTurno(query: URLSearchParams): Turno {
  const t = query.get('turno')
  return t === '1' ? 1 : t === '2' ? 2 : DEFAULT_TURNO
}

/** A segment of the voted bar, in screen order (left to right). `a` is drawn dark, `b` mid grey, `outros` light. */
export interface Side {
  key: 'a' | 'b' | 'outros'
  /** Candidate name ("Lula"), "Candidato A" in the fixture, or "Outros". */
  label: string
  votos: number
  /** Whole percent of the valid votes; the sides of one bar add up to 100. */
  pct: number
  numero?: number
  /** Colour side from the identity table (#84): `outros` for a round 1 runner-up beside a runoff candidate. */
  tone?: 'a' | 'b' | 'outros'
  /** The table's short form of the name: the step before the share alone. */
  short?: string
}

/** Leaders by ballot number (lower first), then "Outros". Percentages are the shared model's, only the order changes. */
export function orderedSides(r: CityResult): Side[] {
  const leaders = r.voted.filter((s) => s.key === 'a' || s.key === 'b')
  const outros = r.voted.find((s) => s.key === 'outros')
  const sorted = [...leaders].sort((x, y) => (x.numero ?? 0) - (y.numero ?? 0))
  const sides: Side[] = sorted.map((s, i) => ({ key: i === 0 ? 'a' : 'b', label: s.label, votos: s.votos, pct: s.pct, numero: s.numero, short: s.short, tone: sideTone(r.ano, s.numero, sorted[1 - i]?.numero, i === 0 ? 'a' : 'b') }))
  if (outros) sides.push({ key: 'outros', label: 'Outros', votos: outros.votos, pct: outros.pct })
  return sides
}

export type CycleBlock =
  | {
      status: 'data'
      ano: number
      turno: Turno
      votedPct: number
      notVotedPct: number
      /** Valid votes; 0 means nobody voted for a candidate (the bar is empty, not split). */
      validos: number
      sides: Side[]
      notVoted: Segment[]
    }
  | { status: 'no-data'; ano: number; turno: Turno; reason: string }

/** One sentence of why a cycle has no data, from the dataset's `ciclos` column of the city. */
export function noDataReason(ciclos: readonly number[], ano: number, turno: Turno): string {
  const first = ciclos.length ? Math.min(...ciclos) : undefined
  if (first !== undefined && first > ano) return `Este município só tem dados a partir de ${first}.`
  return `Não há resultado deste município no ${turno}º turno de ${ano}.`
}

export function buildCycleBlock(p: { ano: number; turno: Turno; city: { ciclos: readonly number[] }; result: CityResult | undefined }): CycleBlock {
  const { ano, turno, result: r } = p
  if (!r || r.aptos <= 0) return { status: 'no-data', ano, turno, reason: noDataReason(p.city.ciclos, ano, turno) }
  return { status: 'data', ano, turno, votedPct: r.votedPct, notVotedPct: r.notVotedPct, validos: r.validos, sides: orderedSides(r), notVoted: r.notVoted }
}

/** Width of the content column of the page at 390 px, and rough bold 11px glyph width: used to decide how much text fits. */
const BAR_PX = 318
const GLYPH_PX = 6.4
const PAD_PX = 12

/** The text that fits a candidate segment: "Lula 55%", "Flavio 40%", "20%", or '' in a sliver. The full name is always in `title`. */
export function sideText(s: Pick<Side, 'key' | 'label' | 'pct' | 'short'>): string {
  const room = Math.floor(((s.pct / 100) * BAR_PX - PAD_PX) / GLYPH_PX)
  // the middle step is the table's short form ("Haddad", "Flávio"), never an arbitrary first word, so a narrow bar names the
  // candidate the way every other screen does (#84)
  const tries = [`${s.label} ${s.pct}%`, `${s.short ?? s.label.split(' ')[0]} ${s.pct}%`, `${s.pct}%`]
  return tries.find((t) => t.length <= room) ?? ''
}

type NotVotedKey = 'abstencao' | 'brancos' | 'nulos'
const NOT_VOTED: Record<NotVotedKey, string> = { abstencao: 'Abstenção', brancos: 'Brancos', nulos: 'Nulos' }

/** Text of a "Não votaram" segment: "Abstenção 82%", "Brancos", or nothing when the word does not fit whole (#89: never initials; the list under the bars has the share). */
export function notVotedText(key: NotVotedKey, pct: number): string {
  // 7 px a glyph: the 13 px bold of the type scale (#86), as the card's bars measure it
  const room = Math.floor(((pct / 100) * BAR_PX - 10) / 7)
  return [`${NOT_VOTED[key]} ${pct}%`, NOT_VOTED[key]].find((t) => t.length <= room) ?? ''
}
