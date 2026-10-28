import { int, pct1 } from './format'
import type { Candidate, LevelShard, Metric, Row } from './types'

/**
 * The rate measures of the participação family and how each is calculated (the same definitions the Placar and the Escada print and the footers state):
 * comparecimento and abstenção are shares of the eleitorado; brancos + nulos and votos válidos are shares of the comparecimento.
 */
export interface RateDef {
  id: 'comparecimento' | 'abstencao' | 'brancos_nulos' | 'validos'
  label: string
  part: Metric
  whole: Metric
}

export const RATES: readonly RateDef[] = [
  { id: 'comparecimento', label: 'Comparecimento', part: 'comparecimento', whole: 'eleitorado' },
  { id: 'abstencao', label: 'Abstenção', part: 'abstencao', whole: 'eleitorado' },
  { id: 'brancos_nulos', label: 'Brancos + nulos', part: 'brancos_nulos', whole: 'comparecimento' },
  { id: 'validos', label: 'Votos válidos', part: 'validos', whole: 'comparecimento' },
]
/** The candidatos family as a rate: `cand-13` = the share of votos válidos of the candidate with ballot number 13 (in the cycle and turno where that number is on the ballot). */
export const CAND = 'cand-'
export const isCandidateMeasure = (id: string): boolean => id.startsWith(CAND)
export const candidateNumber = (id: string): number => Number(id.slice(CAND.length))
export const GROUP_PARTICIPACAO = 'Participação'
export const GROUP_CANDIDATOS = 'Votos por candidato'

export interface MeasureOption {
  id: string
  label: string
  group: string
}

/** The picker options of a panel: the participação measures of its record, then (when the record opens the candidatos family) one option per ballot number found in the shards, ascending. */
export function measureOptions(ids: readonly string[], shards: Iterable<LevelShard>, withCandidates: boolean): MeasureOption[] {
  const base = ids.map((id) => ({ id, label: rateDef(id).label, group: GROUP_PARTICIPACAO }))
  if (!withCandidates) return base
  const numbers = [...new Set([...shards].flatMap((s) => s.candidatos.map((c) => c.numero)))].sort((a, b) => a - b)
  return [...base, ...numbers.map((n) => ({ id: `${CAND}${n}`, label: `Nº ${n}`, group: GROUP_CANDIDATOS }))]
}

export const rateDef = (id: string): RateDef => {
  const def = RATES.find((r) => r.id === id)
  if (!def) throw new Error(`unknown rate measure "${id}"`)
  return def
}

export interface Rate {
  /** Percent with one decimal (82.3), for the length of a bar; the printed text is `text`. */
  value: number
  text: string
  /** The absolute figure behind it, printed with thousand separators. */
  sub: string
}

/** The rate of a shard's total; null when the whole is zero. */
export function rateOf(shard: LevelShard | undefined, id: string): Rate | null {
  if (!shard) return null
  if (isCandidateMeasure(id)) return rateOfRow(shard.total, id, shard.candidatos)
  const def = rateDef(id)
  const text = pct1(shard.total[def.part], shard.total[def.whole])
  if (text === null) return null
  return { value: Number(text.replace('%', '').replace(',', '.')), text, sub: int(shard.total[def.part]) }
}

/** The rate of any row (a UF row of a Brasil or região shard), same definition as the totals'. */
export function rateOfRow(row: Row | undefined, id: string, candidatos?: Candidate[]): Rate | null {
  if (!row) return null
  if (isCandidateMeasure(id)) {
    const i = candidatos?.findIndex((c) => c.numero === candidateNumber(id)) ?? -1
    const text = i < 0 || row.votos[i] === undefined ? null : pct1(row.votos[i]!, row.validos)
    return text === null ? null : { value: Number(text.replace('%', '').replace(',', '.')), text, sub: int(row.votos[i]!) }
  }
  const def = rateDef(id)
  const text = pct1(row[def.part], row[def.whole])
  return text === null ? null : { value: Number(text.replace('%', '').replace(',', '.')), text, sub: int(row[def.part]) }
}
