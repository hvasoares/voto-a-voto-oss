/**
 * The state recap's numbers (#28), PURE: one state across 2018, 2022 and 2026, the two runoff candidates' shares of the valid
 * votes of each cycle, and the change in points between one cycle and the previous one that has data.
 *
 * The numbers are the three-cycle screen's (`compare.ts` `buildCycleBlocks`): shares of the cycle's own valid votes, percents
 * in tenths by largest remainder so the two sides of a bar add up to 100,0, and every change computed from the UNROUNDED shares.
 * What this file adds is the row shape the picture and the words read; the labels are the identity table's (#84: "Haddad" and "Bolsonaro" in 2018),
 * the same words as every other screen.
 */
import { formatOneDecimal, type CycleBlock } from './compare'

export interface RecapSide {
  label: string
  /** "32,0": one decimal, comma. */
  pct: string
  /** Percent in tenths (320), the bar's width. */
  tenths: number
}

export interface RecapRow {
  ano: number
  status: 'data' | 'no-data'
  left?: RecapSide
  rival?: RecapSide
  /** "+12,7" against `changeVs`, from the unrounded shares; undefined for the first cycle with data. */
  changePp?: string
  changeVs?: number
}

export interface Recap {
  uf: string
  rows: RecapRow[]
}

export function buildRecap(uf: string, blocks: readonly CycleBlock[]): Recap {
  const rows = blocks.map<RecapRow>((b) => {
    if (b.status !== 'data' || !b.left || !b.rival) return { ano: b.ano, status: 'no-data' }
    const side = (s: NonNullable<CycleBlock['left']>, label = s.label): RecapSide => ({ label, pct: formatOneDecimal(s.tenths), tenths: s.tenths })
    return { ano: b.ano, status: 'data', left: side(b.left), rival: side(b.rival), changePp: b.changePp, changeVs: b.changeVs }
  })
  return { uf, rows }
}

/** The cycles that have data, first and last (for "2018 a 2026"); undefined when none. */
export function span(recap: Recap): { first: number; last: number } | undefined {
  const years = recap.rows.filter((r) => r.status === 'data').map((r) => r.ano)
  return years.length ? { first: years[0]!, last: years[years.length - 1]! } : undefined
}
