import { displayName } from '@/shared/city-search'
import { int, pct1 } from './format'
import type { PanelRecord, Shards, TableColumn, TableRow, TableSpec } from './panels'
import { rateDef } from './rates'
import { nerdsPath } from './paths'
import { placeName } from './view'
import type { LevelShard, Row } from './types'
import { regionLabel } from '../brasil'

/**
 * The Tabela de detalhe (#76): the same columns at every level, listing the level's children - Brasil its regiões (each opens into its UFs), a região its UFs (each opens into its
 * municípios), an estado every município, alphabetical by default, never by result - and the level total on the last row. The columns come from the measure FAMILY of the record
 * (participação here: eleitorado, then comparecimento, abstenção and brancos + nulos for each turno), so the candidate columns can be added without changing the table.
 */
export const DETALHE_MEASURES = ['comparecimento', 'abstencao', 'brancos_nulos'] as const
const SHORT: Record<(typeof DETALHE_MEASURES)[number], string> = { comparecimento: 'Compar.', abstencao: 'Abst.', brancos_nulos: 'Br.+nulos' }

export function detalheColumns(family: PanelRecord['measure']['family'], turnos: readonly (1 | 2)[]): TableColumn[] {
  if (family !== 'participacao') throw new Error(`the Tabela de detalhe has no columns for the ${family} family yet`)
  return [
    { key: 'nome', label: 'Nome', numeric: false },
    { key: 'eleitorado', label: 'Eleitorado', numeric: true },
    ...DETALHE_MEASURES.flatMap((m) => turnos.map((t): TableColumn => ({ key: `${m}-${t}`, label: `${rateDef(m).label} ${t}º turno`, short: `${SHORT[m]} ${t}º`, numeric: true }))),
  ]
}

/** `[eleitorado, comparecimento 1º, comparecimento 2º, abstenção 1º, ...]` as numbers (percent, one decimal) and as printed text. */
export function printedCells(row: (turno: 1 | 2) => Row | undefined): { cells: (string | null)[]; values: (number | null)[] } {
  const cells: (string | null)[] = []
  const values: (number | null)[] = []
  const first = row(1) ?? row(2)
  cells.push(first ? int(first.eleitorado) : null)
  values.push(first ? first.eleitorado : null)
  for (const m of DETALHE_MEASURES) {
    const def = rateDef(m)
    for (const t of [1, 2] as const) {
      const r = row(t)
      const text = r ? pct1(r[def.part], r[def.whole]) : null
      cells.push(text)
      values.push(text === null ? null : Number(text.replace('%', '').replace(',', '.')))
    }
  }
  return { cells, values }
}

function childRows(shard: LevelShard): { rows: Row[]; level: 'regiao' | 'estado' | 'cidade'; unit: string } {
  if (shard.level === 'brasil') return { rows: shard.children.regioes ?? [], level: 'regiao', unit: 'regiões' }
  if (shard.level === 'regiao') return { rows: shard.children.ufs ?? [], level: 'estado', unit: 'estados' }
  return { rows: shard.children.municipios ?? [], level: 'cidade', unit: 'municípios' }
}

export function detalhe(record: PanelRecord, shards: Shards, known: { regioes: readonly string[]; ufs: readonly string[] } = { regioes: [], ufs: [] }): TableSpec {
  const turnos = ([1, 2] as const).filter((t) => shards[t])
  const any = shards[1] ?? shards[2]!
  const { level, unit } = childRows(any)
  // Rows of either turno: a place absent from a turno has no row there ("sem 2º turno"), not a row of zeros.
  const ids = new Map<string, Row>()
  for (const t of turnos) for (const r of childRows(shards[t]!).rows) ids.set(r.id, ids.get(r.id) ?? r)
  const columns = detalheColumns(record.measure.family, [1, 2])
  const byId = (t: 1 | 2, id: string): Row | undefined => (shards[t] ? childRows(shards[t]!).rows.find((r) => r.id === id) : undefined)
  const nameOf = (r: Row) => (level === 'regiao' ? regionLabel(r.id) : level === 'estado' ? placeName('estado', r.id) : displayName(r.nome ?? r.id))
  const hrefOf = (r: Row): string | undefined => {
    if (level === 'regiao') return known.regioes.includes(r.id) ? nerdsPath({ level: 'regiao', id: r.id }) : undefined
    if (level === 'estado') return known.ufs.includes(r.id) ? nerdsPath({ level: 'estado', id: r.id }) : undefined
    return `${any.id}/${r.id}/`
  }
  const rows = [...ids.values()]
    .map((r): TableRow => {
      const { cells, values } = printedCells((t) => byId(t, r.id))
      return {
        id: r.id,
        cells: [nameOf(r), ...cells],
        values: [null, ...values],
        href: hrefOf(r),
        ...(level === 'regiao' && known.regioes.includes(r.id) ? { open: { level: 'regiao' as const, id: r.id } } : {}),
        ...(level === 'estado' && known.ufs.includes(r.id) ? { open: { level: 'uf' as const, id: r.id } } : {}),
      }
    })
    .sort((a, b) => a.cells[0]!.localeCompare(b.cells[0]!, 'pt-BR'))
  const total = printedCells((t) => shards[t]?.total)
  rows.push({ id: 'total', total: true, cells: [any.level === 'brasil' ? 'Brasil' : placeName(any.level === 'uf' ? 'estado' : 'regiao', any.id), ...total.cells], values: [null, ...total.values] })
  return { kind: 'table', caption: `Números de cada ${unit.replace(/s$/, '').replace('õe', 'ão')}, com o total na última linha`, columns, rows, ano: any.ano, unit }
}

/** "Brasil é a soma das regiões": the last row's eleitorado is the sum of the rows above it (the test and the footer claim it). */
export function childrenSum(spec: TableSpec): number {
  return spec.rows.filter((r) => !r.total).reduce((sum, r) => sum + (r.values?.[1] ?? 0), 0)
}
