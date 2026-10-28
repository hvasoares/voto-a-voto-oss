/**
 * The city replay (#46), PURE: the frames of the short replay of a city across 2018, 2022 and 2026, built from the numbers the three-cycle page already carries in its static
 * blocks (the shares of the valid votes of each cycle's bar). Nothing is computed, nothing is fetched: the replay only lays the same shares out one cycle after the other.
 * A cycle with no result is not a frame; `missing` names it, and the replay says so. The words are `catalog-replay.ts` (data only: this file stays small for the browser).
 */
import { REPLAY_STANDARD as SAY } from './sentences/catalog-replay'

export const REPLAY_YEARS = [2018, 2022, 2026] as const
export interface ReplaySide {
  key: 'a' | 'b' | 'outros'
  /** "Candidato A", "Lula", "Outros". */
  label: string
  /** Whole percent of the valid votes (the shared model's). */
  pct: number
}
export interface ReplayFrame {
  ano: number
  sides: ReplaySide[]
}
export interface Replay {
  frames: ReplayFrame[]
  missing: number[]
}

/** The cycles in order: `sides` undefined (or empty) is a cycle with no result. */
export function buildReplay(cycles: { ano: number; sides?: ReplaySide[] }[]): Replay {
  const ordered = REPLAY_YEARS.map((ano) => cycles.find((c) => c.ano === ano) ?? { ano })
  return {
    frames: ordered.filter((c): c is ReplayFrame => !!c.sides?.length).map((c) => ({ ano: c.ano, sides: c.sides })),
    missing: ordered.filter((c) => !c.sides?.length).map((c) => c.ano),
  }
}

const fill = (tpl: string, params: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (whole, k: string) => (k in params ? String(params[k]) : whole))
const list = (items: string[]) => new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' }).format(items)

/** "A 55% e B 45%" */
export const sidesText = (f: ReplayFrame) => list(f.sides.map((s) => fill(SAY['replay.side']!, { label: s.label, pct: s.pct })))

/** The text alternative: the result of every cycle the replay shows. */
export function replayAlt(r: Replay, city: string, turno: number): string {
  const parts = r.frames.map((f) => fill(SAY['replay.part']!, { ano: f.ano, sides: sidesText(f) }))
  return fill(SAY['replay.alt']!, { turno, city, parts: parts.join('; ') })
}

/** The sentence that names the cycles the replay does not have; undefined when it has all three. */
export const missingText = (r: Replay) => (r.missing.length ? fill(SAY['replay.missing']!, { years: list(r.missing.map(String)) }) : undefined)

export const say = (key: keyof typeof SAY | string) => SAY[key]!
