import { SEM_SEGUNDO_TURNO, type PanelData, type PanelRecord, type TableRow, type TableSpec } from './panels'
import { rateOf } from './rates'
import type { LevelShard } from './types'

/**
 * Par 1º→2º turno (#79): two printed values side by side for the level and for its reference rows (the next level up, and Brasil). No difference is calculated and there is no
 * causal text; only a short fixed note on when a 2º turno exists. Where there was none, the column reads "sem 2º turno".
 */
export const PAR_NOTE = 'Quando existe 2º turno? Há 2º turno quando nenhum candidato alcança mais da metade dos votos válidos no 1º turno. Onde não houve, a coluna diz “sem 2º turno”.'

export interface ParInput {
  own: { name: string; shards: Partial<Record<1 | 2, LevelShard>> }
  /** The next level up (the região of an estado, Brasil for a região), when there is one. */
  parent?: { name: string; shards: Partial<Record<1 | 2, LevelShard>> }
  brasil?: Partial<Record<1 | 2, LevelShard>>
}

export function par(record: PanelRecord, input: ParInput): TableSpec {
  const measure = record.measure.id
  const row = (id: string, name: string, shards: Partial<Record<1 | 2, LevelShard>>): TableRow => {
    const cells = ([1, 2] as const).map((t) => rateOf(shards[t], measure)?.text ?? null)
    return { id, cells: [name, ...cells], values: [null, ...([1, 2] as const).map((t) => rateOf(shards[t], measure)?.value ?? null)] }
  }
  const rows = [row('lugar', input.own.name, input.own.shards)]
  if (input.parent) rows.push(row('acima', input.parent.name, input.parent.shards))
  if (input.brasil && input.own.name !== 'Brasil' && input.parent?.name !== 'Brasil') rows.push(row('brasil', 'Brasil', input.brasil))
  return {
    kind: 'table',
    caption: 'Os dois valores lado a lado: nenhuma diferença é calculada',
    columns: [{ key: 'lugar', label: 'Lugar', numeric: false }, { key: 'turno-1', label: '1º turno', numeric: true }, { key: 'turno-2', label: '2º turno', numeric: true }],
    rows,
    note: PAR_NOTE,
  }
}

export { SEM_SEGUNDO_TURNO }
