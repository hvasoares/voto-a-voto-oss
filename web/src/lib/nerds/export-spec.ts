import { candidatosFicha, ficha, printedRow } from './escada'
import type { ExportTable } from './actions'
import { printedFive } from './distribuicao'
import { SEM_SEGUNDO_TURNO, type Spec } from './panels'
import { UF_NOME } from '../uf-names'

/**
 * The table behind every panel, as the CSV and the image print it (#80): one structure per panel kind, made from the same spec the page draws, so the export and the screen cannot
 * disagree. Panels whose table depends on what is on screen (the map's and the histogram's measure and turno) give one variant per view; the Tabela de detalhe is read from the page's
 * own table (it can hold hundreds of rows, which are already in the HTML).
 */
export interface PanelExport {
  single?: ExportTable
  variants?: Record<string, ExportTable>
}

const dash = (cell: string | null) => cell ?? SEM_SEGUNDO_TURNO

export function exportOf(spec: Spec): PanelExport | undefined {
  if (spec.kind === 'stat') {
    if ('strip' in spec) return { single: { headers: ['Sinal', 'Valor', 'Nota'], rows: spec.strip.map((s) => [s.label, s.value, s.note]) } }
    return {
      single: {
        headers: ['Medida', '1º turno', '2º turno'],
        rows: spec.cards.map((c) => [c.label, ...c.values.map((v) => (c.unavailable ? c.unavailable : `${v.text ?? (v.turno === 2 ? SEM_SEGUNDO_TURNO : 'sem dados')}${v.sub && v.text ? ` · ${v.sub}` : ''}`))]),
      },
    }
  }
  if (spec.kind === 'table') return { single: { headers: spec.columns.map((c) => c.label), rows: spec.rows.map((r) => r.cells.map(dash)) } }
  if (spec.kind === 'bar') {
    const f = ficha(spec)
    return {
      single: { headers: f.columns.map((c) => c.label), rows: f.rows.map((_, i) => printedRow(f, i)) },
      ...(spec.candidatos ? { variants: { 'candidatos-1': candidatosFicha(spec, 1), 'candidatos-2': candidatosFicha(spec, 2) } } : {}),
    }
  }
  if (spec.kind === 'map') {
    return {
      variants: Object.fromEntries(
        Object.entries(spec.views).map(([key, v]) => [key, { headers: ['Estado', 'Valor', 'Faixa'], rows: Object.entries(v.cells).map(([uf, c]) => [UF_NOME[uf] ?? uf, c.text, v.shading.legend[c.step]!]).sort((a, b) => a[0]!.localeCompare(b[0]!, 'pt-BR')) }]),
      ),
    }
  }
  if (spec.kind === 'histogram') {
    return {
      variants: Object.fromEntries(
        Object.entries(spec.byKey).map(([key, d]) => [key, { headers: ['Faixa', spec.unit === 'UFs' ? 'UFs' : 'Municípios'], rows: [...d.bins.map((b) => [`${b.lo}–${b.hi}%`, String(b.count)]), ...printedFive(d.five).map((f) => [f.label, f.text])] }]),
      ),
    }
  }
  return undefined
}

/** The JSON of the `<script type="application/json" data-export>` block: `<` is escaped so the page can never be broken out of. */
export const exportJson = (e: PanelExport): string => JSON.stringify(e).replace(/</g, '\\u003c')
