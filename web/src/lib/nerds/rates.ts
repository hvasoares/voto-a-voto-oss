import { int, pct1 } from './format'
import type { LevelShard, Metric } from './types'

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
  const def = rateDef(id)
  const text = pct1(shard.total[def.part], shard.total[def.whole])
  if (text === null) return null
  return { value: Number(text.replace('%', '').replace(',', '.')), text, sub: int(shard.total[def.part]) }
}
