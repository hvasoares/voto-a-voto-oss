import { int } from './format'
import { rateDef, rateOf, RATES, type Rate } from './rates'
import type { PanelData, PanelRecord } from './panels'

/**
 * The Escada and its Ficha (#75): cycles as rows, the 1º and 2º turno as a pair, for one selectable measure; the Ficha is the SAME structure as a table (cycles as rows,
 * measures x turnos as columns) and the CSV reads it too, so chart, Ficha and CSV cannot disagree. Bars start at 0%; a turno that did not happen is absent
 * ("sem 2º turno"), never a zero bar. No panel orders or ranks places.
 */
export interface EscadaRow {
  ciclo: number
  /** `[1º turno, 2º turno]` per measure id; null where the turno did not happen. */
  cells: Record<string, [Rate | null, Rate | null]>
}

export interface Reference {
  /** `Brasil, 1º turno de 2026`. */
  label: string
  /** The national value of each measure, for the same cycle and turno. */
  byMeasure: Record<string, Rate>
}

export interface BarSpec {
  kind: 'bar'
  recordId: string
  /** The measure the panel opens on, and what its picker offers (both read from the record). */
  measure: string
  options: { id: string; label: string }[]
  rows: EscadaRow[]
  /** Printed on região and estado only. */
  reference?: Reference
  /** "Lê N arquivos, X kB": the weight of the shards behind the panel, printed in its footer. */
  weight: { files: number; gzipBytes: number }
}

export function buildEscada(record: PanelRecord, data: PanelData): BarSpec {
  const ids = record.measure.options ?? RATES.map((r) => r.id)
  const cycles = [...new Set([...data.all.values()].map((s) => s.ano))].sort((a, b) => a - b)
  const rows = cycles.map((ciclo): EscadaRow => ({
    ciclo,
    cells: Object.fromEntries(ids.map((id) => [id, [rateOf(data.all.get(`${ciclo}-1`), id), rateOf(data.all.get(`${ciclo}-2`), id)] as [Rate | null, Rate | null]])),
  }))
  let reference: Reference | undefined
  if (data.reference?.size) {
    const latest = Math.max(...cycles)
    const national = data.reference.get(`${latest}-1`)
    if (national) {
      reference = {
        label: `Brasil, 1º turno de ${latest}`,
        byMeasure: Object.fromEntries(ids.flatMap((id) => { const r = rateOf(national, id); return r ? [[id, r] as const] : [] })),
      }
    }
  }
  const read = [...data.all.values(), ...(reference ? [data.reference!.get(`${Math.max(...cycles)}-1`)!] : [])]
  return {
    kind: 'bar',
    recordId: record.id,
    measure: record.measure.id,
    options: ids.map((id) => ({ id, label: rateDef(id).label })),
    rows,
    reference,
    weight: { files: read.length, gzipBytes: read.reduce((sum, s) => sum + s.gzipBytes, 0) },
  }
}

// ---- the Ficha: the same rows as a table -------------------------------------------------------------------------------------------------------------------------

export interface FichaColumn {
  key: string
  label: string
  /** The measure and turno behind a value column; absent on the cycle column. */
  measure?: string
  turno?: 1 | 2
}
export interface Ficha {
  columns: FichaColumn[]
  /** One per cycle: `cells[i]` goes with `columns[i]`; the first is the cycle. null = "sem 2º turno". */
  rows: { ciclo: number; cells: (Rate | null)[] }[]
}

export function ficha(spec: BarSpec): Ficha {
  const columns: FichaColumn[] = [{ key: 'ciclo', label: 'Ciclo' }]
  for (const o of spec.options) for (const turno of [1, 2] as const) columns.push({ key: `${o.id}-${turno}`, label: `${o.label} ${turno}º turno`, measure: o.id, turno })
  const rows = spec.rows.map((r) => ({ ciclo: r.ciclo, cells: columns.slice(1).map((c) => r.cells[c.measure!]![c.turno! - 1]!) }))
  return { columns, rows }
}

/** The question each measure answers; the panel's title follows the measure picked (the h2 of the record is the default). */
export const QUESTIONS: Record<string, string> = {
  comparecimento: 'Como o comparecimento mudou de um ciclo para o outro?',
  abstencao: 'Como a abstenção mudou de um ciclo para o outro?',
  brancos_nulos: 'Como os brancos e nulos mudaram de um ciclo para o outro?',
  validos: 'Como os votos válidos mudaram de um ciclo para o outro?',
}

export type SortDir = 'asc' | 'desc'

/** Stable sort by a column (the cycle is column 0); "sem 2º turno" (null) goes last in either direction; ties keep the cycle order. */
export function sortFicha(f: Ficha, column: number, dir: SortDir): Ficha {
  const indexed = f.rows.map((row, i) => ({ row, i }))
  const sign = dir === 'asc' ? 1 : -1
  const key = (row: Ficha['rows'][number]) => (column === 0 ? row.ciclo : row.cells[column - 1]?.value ?? null)
  indexed.sort((a, b) => {
    const [x, y] = [key(a.row), key(b.row)]
    if (x === null && y === null) return a.i - b.i
    if (x === null) return 1
    if (y === null) return -1
    return x === y ? a.i - b.i : (x - y) * sign
  })
  return { columns: f.columns, rows: indexed.map((x) => x.row) }
}

export const SEM_2 = 'sem 2º turno'

/** The cells as printed (cycle, then the percent text or "sem 2º turno"); the table, the chart labels and the CSV all use these strings. */
export const printedRow = (f: Ficha, i: number): string[] => [String(f.rows[i]!.ciclo), ...f.rows[i]!.cells.map((c, j) => c?.text ?? (f.columns[j + 1]!.turno === 2 ? SEM_2 : 'sem dados'))]

/** The panel's CSV body (the provenance header block is added by the export, #79): the rows as printed. */
export function fichaCsv(f: Ficha): string {
  const quote = (cell: string) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
  const lines = [f.columns.map((c) => c.label), ...f.rows.map((_, i) => printedRow(f, i))]
  return lines.map((l) => l.map(quote).join(';')).join('\n') + '\n'
}

/** `6 arquivos, 5,1 kB comprimidos`. */
export function weightText(weight: BarSpec['weight']): string {
  const kb = (Math.round(weight.gzipBytes / 100) / 10).toFixed(1).replace('.', ',')
  return `Lê ${int(weight.files)} ${weight.files === 1 ? 'arquivo' : 'arquivos'} de dados, ${kb} kB comprimidos`
}
