import type { PanelData, PanelRecord } from './panels'
import { rateDef, RATES } from './rates'
import type { LevelShard, Row } from './types'

/**
 * Distribuição (#79): how the children of a place spread on one measure - UFs for Brasil, the UFs of a região, the municípios of an estado - as a histogram in FIXED two-point bins
 * and a box plot with min, Q1, median, Q3 and max printed, plus the rule for what counts as an outlier (1.5 x the interquartile range). The panel names nobody: no outlier list, no best or
 * worst; the reader sorts the Tabela de detalhe for themselves. The numbers come from the same shard the table reads; the five-number summary is one pure function.
 */
export interface Five {
  min: number
  q1: number
  median: number
  q3: number
  max: number
}

/** Quartiles by linear interpolation between the closest ranks (the "type 7" rule of R and numpy): q(p) at rank p*(n-1) of the sorted values. */
export function fiveNumber(values: number[]): Five {
  if (!values.length) throw new Error('fiveNumber needs at least one value')
  const v = [...values].sort((a, b) => a - b)
  const q = (p: number) => {
    const rank = p * (v.length - 1)
    const lo = Math.floor(rank)
    return lo === rank ? v[lo]! : v[lo]! + (v[lo + 1]! - v[lo]!) * (rank - lo)
  }
  return { min: v[0]!, q1: q(0.25), median: q(0.5), q3: q(0.75), max: v[v.length - 1]! }
}

export const BIN = 2

export interface Bin {
  lo: number
  hi: number
  count: number
}

/** Fixed two-point bins aligned to even numbers, from the bin of the lowest value to the bin of the highest: the counts sum to the number of values. The last bin includes its upper edge (100). */
export function bins(values: number[]): Bin[] {
  const first = Math.floor(Math.min(...values) / BIN) * BIN
  const last = Math.min(100, Math.ceil((Math.max(...values) + 1e-9) / BIN) * BIN)
  const out: Bin[] = []
  for (let lo = first; lo < last; lo += BIN) out.push({ lo, hi: lo + BIN, count: 0 })
  for (const x of values) out[Math.min(out.length - 1, Math.floor((x - first) / BIN))]!.count += 1
  return out
}

export const fences = (f: Five): [number, number] => [f.q1 - 1.5 * (f.q3 - f.q1), f.q3 + 1.5 * (f.q3 - f.q1)]

export const oneDecimal = (n: number): string => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',')

export interface Distribution {
  n: number
  bins: Bin[]
  five: Five
  fences: [number, number]
}
export interface DistribuicaoSpec {
  kind: 'histogram'
  recordId: string
  /** "UFs", "municípios". */
  unit: string
  options: { id: string; label: string }[]
  initial: { measure: string; turno: 1 | 2 }
  /** `${turno}-${measure}` -> the distribution; absent where that turno did not happen. */
  byKey: Record<string, Distribution>
  /** The rule for an outlier, as printed. */
  rule: string
  turnos: (1 | 2)[]
  ano: number
}

const childrenOf = (s: LevelShard): { rows: Row[]; unit: string } =>
  s.level === 'brasil' ? { rows: (s.children.ufs ?? []).filter((r) => r.id !== 'zz'), unit: 'UFs' } : s.level === 'regiao' ? { rows: s.children.ufs ?? [], unit: 'UFs' } : { rows: s.children.municipios ?? [], unit: 'municípios' }

/** The unrounded rate of a row, in percent. */
export const rawRate = (row: Row, id: string): number | null => {
  const def = rateDef(id)
  return row[def.whole] === 0 ? null : (row[def.part] / row[def.whole]) * 100
}

export function buildDistribuicao(record: PanelRecord, data: PanelData): DistribuicaoSpec {
  const ids = record.measure.options ?? RATES.map((r) => r.id)
  const turnos = ([1, 2] as const).filter((t) => data.cycle[t])
  const any = data.cycle[1] ?? data.cycle[2]!
  const byKey: Record<string, Distribution> = {}
  for (const t of turnos) {
    for (const id of ids) {
      const values = childrenOf(data.cycle[t]!).rows.flatMap((r) => { const x = rawRate(r, id); return x === null ? [] : [x] })
      if (!values.length) continue
      const five = fiveNumber(values)
      byKey[`${t}-${id}`] = { n: values.length, bins: bins(values), five, fences: fences(five) }
    }
  }
  return {
    kind: 'histogram',
    recordId: record.id,
    unit: childrenOf(any).unit,
    options: ids.map((id) => ({ id, label: rateDef(id).label })),
    initial: { measure: record.measure.id, turno: 1 },
    byKey,
    rule: 'Regra: um valor é atípico se fica além de 1,5 × a amplitude interquartil (Q3 − Q1), acima de Q3 ou abaixo de Q1. Nenhum lugar é nomeado aqui; ordene a tabela de detalhe para ver cada um.',
    turnos: [...turnos],
    ano: any.ano,
  }
}

/** The five numbers as printed ("mín 70,6"). */
export const printedFive = (f: Five): { label: string; text: string }[] => [
  { label: 'mín', text: oneDecimal(f.min) },
  { label: 'Q1', text: oneDecimal(f.q1) },
  { label: 'mediana', text: oneDecimal(f.median) },
  { label: 'Q3', text: oneDecimal(f.q3) },
  { label: 'máx', text: oneDecimal(f.max) },
]

