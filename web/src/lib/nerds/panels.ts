import { int, pct1 } from './format'
import type { Candidate, LevelShard, Metric } from './types'
import type { Level } from './paths'

/**
 * The panel catalogue machinery of "Dados para nerds" (#73). A panel is a RECORD: `{ id, level, shard, transform, kind, measure, series, title, footer }`; a pure function turns
 * (record, shards) into a chart/table spec and the page (or an island) only draws the spec. There is no per-panel component: a new measure or a new place is a new record.
 *
 * Two gates run when the page is built, and a failure stops the build with the panel and the field named:
 *  - the kind registry is closed (seven kinds) and a record naming a kind with no renderer fails;
 *  - the provenance footer: definição, fonte (with the edition and its date), cálculo and "não mede" - four fields, no interpretation field.
 */
export const PANEL_KINDS = ['stat', 'bar', 'line', 'histogram', 'heatmap', 'table', 'map'] as const
export type PanelKind = (typeof PANEL_KINDS)[number]

/** Kinds that have a renderer. Each later ticket adds its own: bar (#75), histogram (#78), map (#77) ... */
export const RENDERERS: ReadonlySet<PanelKind> = new Set<PanelKind>(['stat', 'table'])

/** The measure families: participação (turno series) and candidatos (candidate series). */
export const MEASURE_FAMILIES = {
  participacao: ['eleitorado', 'comparecimento', 'abstencao', 'brancos_nulos', 'validos'],
  candidatos: ['votos', 'parcela'],
} as const
export type Family = keyof typeof MEASURE_FAMILIES
export type Series = 'turno' | 'candidatos'

export interface Footer {
  definicao: string
  /** Must carry `{edicao}`: the page writes the edition and its date there. */
  fonte: string
  calculo: string
  naoMede: string
}
export const FOOTER_FIELDS = ['definicao', 'fonte', 'calculo', 'naoMede'] as const

export interface PanelRecord {
  id: string
  /** Where the panel appears; `todos` for every level. */
  level: Level | 'todos'
  /** Which shard it reads: the one of its own level, for the chosen cycle (and turno). */
  shard: 'nivel'
  transform: string
  kind: PanelKind
  measure: { family: Family; id: string }
  series: Series
  /** The title is the question the panel answers. */
  title: string
  footer: Footer
}

/** Problems of one record, one line each; empty when the record passes the gates. */
export function validatePanel(record: PanelRecord, renderers: ReadonlySet<PanelKind> = RENDERERS): string[] {
  const name = `panel "${record.id}"`
  const problems: string[] = []
  if (!PANEL_KINDS.includes(record.kind)) problems.push(`${name}: kind "${record.kind}" is not one of ${PANEL_KINDS.join(', ')}`)
  else if (!renderers.has(record.kind)) problems.push(`${name}: kind "${record.kind}" has no renderer`)
  if (!record.title.trim().endsWith('?')) problems.push(`${name}: the title must be the question the panel answers`)
  const family = MEASURE_FAMILIES[record.measure.family] as readonly string[] | undefined
  if (!family) problems.push(`${name}: unknown measure family "${record.measure.family}"`)
  else if (!family.includes(record.measure.id)) problems.push(`${name}: measure "${record.measure.id}" is not in the ${record.measure.family} family`)
  if ((record.measure.family === 'participacao') !== (record.series === 'turno')) problems.push(`${name}: series "${record.series}" does not go with the ${record.measure.family} family`)
  const footer = record.footer as unknown as Record<string, unknown> | undefined
  for (const field of FOOTER_FIELDS) {
    const value = footer?.[field]
    if (typeof value !== 'string' || value.trim() === '') problems.push(`${name}: footer field "${field}" is missing`)
  }
  for (const extra of Object.keys(footer ?? {})) if (!(FOOTER_FIELDS as readonly string[]).includes(extra)) problems.push(`${name}: footer field "${extra}" is not allowed (a footer has the four provenance fields and no interpretation)`)
  if (typeof footer?.fonte === 'string' && !footer.fonte.includes('{edicao}')) problems.push(`${name}: footer field "fonte" must name the edition and its date ({edicao})`)
  return problems
}

/** Throws one error naming every problem of every panel. */
export function assertCatalog(records: readonly PanelRecord[], renderers?: ReadonlySet<PanelKind>): void {
  const ids = records.map((r) => r.id)
  const problems = [...ids.filter((id, i) => ids.indexOf(id) !== i).map((id) => `panel "${id}": declared twice`), ...records.flatMap((r) => validatePanel(r, renderers))]
  if (problems.length) throw new Error(`Dados para nerds: the panel catalogue fails its gates:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
}

/** `fonte` with the edition written in: "TSE, edição 26/10/2026 (2026-10-26)". */
export function fonteText(record: PanelRecord, edicao: string): string {
  return record.footer.fonte.replace('{edicao}', edicao)
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------
// Specs: what a transform returns. Plain data, serialisable, shared by the server render and the islands.

export interface StatValue {
  turno: 1 | 2
  /** The printed value; null when that turno did not happen ("sem 2º turno"). */
  text: string | null
  /** The absolute figure behind a percent. */
  sub?: string
}
export interface StatCard {
  key: string
  label: string
  /** True when the dataset does not carry the measure (printed as such, never as a number). */
  unavailable?: string
  values: StatValue[]
}
export interface StatSpec {
  kind: 'stat'
  cards: StatCard[]
}
export interface TableColumn {
  key: string
  label: string
  numeric: boolean
}
export interface TableRow {
  id: string
  cells: (string | null)[]
  href?: string
  total?: boolean
}
export interface TableSpec {
  kind: 'table'
  caption: string
  columns: TableColumn[]
  rows: TableRow[]
}
export type Spec = StatSpec | TableSpec

/** The shards a panel reads: one per turno of the chosen cycle (a turno that did not happen is absent). */
export type Shards = Partial<Record<1 | 2, LevelShard>>

const LABELS: Record<Metric, string> = {
  eleitorado: 'Eleitorado', comparecimento: 'Comparecimento', abstencao: 'Abstenção', brancos_nulos: 'Brancos + nulos', validos: 'Votos válidos', nao_instalados: 'Seções não instaladas',
}
export const SEM_SEGUNDO_TURNO = 'sem 2º turno'

/** Placar: eleitorado, comparecimento, abstenção, brancos + nulos and votos válidos as a 1º/2º turno pair, and the seções apuradas the dataset does not carry. */
export function placar(shards: Shards): StatSpec {
  const pair = (value: (s: LevelShard) => { text: string | null; sub?: string }): StatValue[] =>
    ([1, 2] as const).map((turno) => {
      const shard = shards[turno]
      return shard ? { turno, ...value(shard) } : { turno, text: null }
    })
  const percent = (part: Metric, whole: Metric) => (s: LevelShard) => ({ text: pct1(s.total[part], s.total[whole]), sub: int(s.total[part]) })
  return {
    kind: 'stat',
    cards: [
      { key: 'eleitorado', label: LABELS.eleitorado, values: pair((s) => ({ text: int(s.total.eleitorado) })) },
      { key: 'comparecimento', label: LABELS.comparecimento, values: pair(percent('comparecimento', 'eleitorado')) },
      { key: 'abstencao', label: LABELS.abstencao, values: pair(percent('abstencao', 'eleitorado')) },
      { key: 'brancos_nulos', label: LABELS.brancos_nulos, values: pair(percent('brancos_nulos', 'comparecimento')) },
      { key: 'validos', label: LABELS.validos, values: pair(percent('validos', 'comparecimento')) },
      { key: 'secoes', label: 'Seções apuradas', unavailable: 'não consta nos dados publicados', values: pair(() => ({ text: null })) },
    ],
  }
}

/** The candidatos family as a table: one row per candidate of the cycle, in ballot-number order (never by result), votes and share of votos válidos per turno. */
export function candidatosTabela(shards: Shards): TableSpec {
  const turnos = ([1, 2] as const).filter((t) => shards[t])
  const columns: TableColumn[] = [
    { key: 'numero', label: 'Nº', numeric: true },
    { key: 'candidato', label: 'Candidato', numeric: false },
    ...turnos.flatMap((t): TableColumn[] => [
      { key: `votos-${t}`, label: `Votos ${t}º turno`, numeric: true },
      { key: `parcela-${t}`, label: `% dos válidos ${t}º turno`, numeric: true },
    ]),
  ]
  const all = new Map<number, Candidate>()
  for (const t of turnos) for (const c of shards[t]!.candidatos) all.set(c.numero, c)
  const rows = [...all.values()].sort((a, b) => a.numero - b.numero).map((c): TableRow => ({
    id: String(c.numero),
    cells: [
      String(c.numero),
      `${c.nome} (${c.partido})`,
      ...turnos.flatMap((t) => {
        const shard = shards[t]!
        const i = shard.candidatos.findIndex((x) => x.numero === c.numero)
        return i < 0 ? [null, null] : [int(shard.total.votos[i]!), pct1(shard.total.votos[i]!, shard.total.validos)]
      }),
    ],
  }))
  return { kind: 'table', caption: 'Votos por candidato, em ordem do número na urna', columns, rows }
}

export type Transform = (shards: Shards) => Spec
export const TRANSFORMS: Record<string, Transform> = { placar, 'candidatos-tabela': candidatosTabela }

/** (record, shards) -> spec. */
export function specFor(record: PanelRecord, shards: Shards): Spec {
  const transform = TRANSFORMS[record.transform]
  if (!transform) throw new Error(`panel "${record.id}": transform "${record.transform}" does not exist`)
  return transform(shards)
}
