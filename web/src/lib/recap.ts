/**
 * The state recap's numbers (#28), PURE: one state across 2018, 2022 and 2026, the two runoff candidates' shares of the valid
 * votes of each cycle, and the change in points between one cycle and the previous one that has data.
 *
 * The numbers are the three-cycle screen's (`compare.ts` `buildCycleBlocks`): shares of the cycle's own valid votes, percents
 * in tenths by largest remainder so the two sides of a bar add up to 100,0, and every change computed from the UNROUNDED shares.
 * What this file adds is the recap's labels (the 2018 pair is "PT" and "Bolsonaro") and the row shape the picture and the words read.
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

export interface RecapLabels {
  /** The 2018 runoff was run by the PT candidate (number 13) and number 17: the recap names them "PT" and "Bolsonaro". */
  pt2018: boolean
}

export const PT = 'PT'

export function buildRecap(uf: string, blocks: readonly CycleBlock[], labels: RecapLabels): Recap {
  const rows = blocks.map<RecapRow>((b) => {
    if (b.status !== 'data' || !b.left || !b.rival) return { ano: b.ano, status: 'no-data' }
    const side = (s: NonNullable<CycleBlock['left']>, label = s.label): RecapSide => ({ label, pct: formatOneDecimal(s.tenths), tenths: s.tenths })
    const pt = b.ano === 2018 && labels.pt2018
    return { ano: b.ano, status: 'data', left: side(b.left, pt ? PT : b.left.label), rival: side(b.rival), changePp: b.changePp, changeVs: b.changeVs }
  })
  return { uf, rows }
}

/** The cycles that have data, first and last (for "2018 a 2026"); undefined when none. */
export function span(recap: Recap): { first: number; last: number } | undefined {
  const years = recap.rows.filter((r) => r.status === 'data').map((r) => r.ano)
  return years.length ? { first: years[0]!, last: years[years.length - 1]! } : undefined
}
