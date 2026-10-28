import { toQuery, type NerdsState } from './url-state'

/**
 * The panel actions (#80): Citar, CSV and Imagem. Pure: the island only wires them to buttons. Every export carries the same four provenance fields as the panel footer
 * (definição, fonte, cálculo, não mede), so nothing leaves the site without its provenance; the permalink is the canonical query-string address of the panel and reopens the same
 * panel with the same numbers.
 */
export interface Panel {
  id: string
  title: string
  footer: { definicao: string; fonte: string; calculo: string; naoMede: string }
}
export interface EditionInfo {
  id: string
  /** `27/10/2026` */
  label: string
}

/** `https://voto-a-voto.com/dados-para-nerds/estado/sp/?ciclo=2026&turno=1&cargo=presidente&medida=abstencao#painel-escada`: the one address of a panel and its state. */
export function permalink(origin: string, base: string, path: string, state: NerdsState, panelId: string): string {
  const root = base.endsWith('/') ? base : `${base}/`
  return `${origin}${root}${path}${toQuery(state)}#painel-${panelId}`
}

export type CiteFormat = 'texto' | 'bibtex' | 'markdown'
export const CITE_FORMATS: { id: CiteFormat; label: string }[] = [
  { id: 'texto', label: 'Texto simples' },
  { id: 'bibtex', label: 'BibTeX' },
  { id: 'markdown', label: 'Markdown' },
]

const escapeBib = (s: string) => s.replace(/[{}\\]/g, '')

/** "Fonte: TSE, edição [id], processado por voto-a-voto em [data], [URL do painel]" as plain text, BibTeX or Markdown. */
export function citation(format: CiteFormat, o: { edition: EditionInfo; url: string; panel: Panel; place: string; siteUrl: string }): string {
  const { edition, url, panel } = o
  if (format === 'texto') return `Fonte: TSE, edição ${edition.id}, processado por voto-a-voto em ${edition.label}, ${url}`
  if (format === 'markdown') return `Fonte: TSE, edição ${edition.id}, processado por [voto-a-voto](${o.siteUrl}) em ${edition.label}, [${panel.title}](${url})`
  const year = edition.label.slice(-4)
  return [
    `@misc{votoavoto_${edition.id.replace(/-/g, '')}_${panel.id},`,
    `  author = {{Tribunal Superior Eleitoral (TSE)}},`,
    `  title = {${escapeBib(panel.title)} (${escapeBib(o.place)})},`,
    `  howpublished = {Processado por voto-a-voto},`,
    `  note = {Edição ${edition.id}, ${edition.label}},`,
    `  year = {${year}},`,
    `  url = {${url}}`,
    `}`,
  ].join('\n')
}

// ---- export tables and CSV -----------------------------------------------------------------------------------------------------------------------------------------

export interface ExportTable {
  headers: string[]
  rows: string[][]
}

export const LICENCE = 'CC BY 4.0 (conjunto de dados), com atribuição ao TSE'

/** The provenance block that starts every CSV and carries the panel's four footer fields; `#` lines, then the table. */
export function provenanceLines(o: { panel: Panel; edition: EditionInfo; editionId: string; place: string; url: string; fonte: string }): string[] {
  return [
    `# Painel: ${o.panel.title}`,
    `# Lugar: ${o.place}`,
    `# Definição: ${o.panel.footer.definicao}`,
    `# Fonte: ${o.fonte}`,
    `# Edição: ${o.editionId}`,
    `# Data: ${o.edition.label}`,
    `# Cálculo: ${o.panel.footer.calculo}`,
    `# Não mede: ${o.panel.footer.naoMede}`,
    `# Licença: ${LICENCE}`,
    `# Endereço: ${o.url}`,
  ]
}

const quote = (cell: string) => (/[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)

/** The CSV: the provenance block, then the header and the rows exactly as printed (`;` separated, a BOM is added by the download). */
export function csvText(block: string[], table: ExportTable): string {
  return `${[...block, table.headers.map(quote).join(';'), ...table.rows.map((r) => r.map(quote).join(';'))].join('\n')}\n`
}

/** Parses a CSV made by `csvText` back into its provenance lines and its table (the test compares it with the screen). */
export function parseCsv(text: string): { block: string[]; table: ExportTable } {
  const lines = text.replace(/^\ufeff/, '').trimEnd().split('\n')
  const block = lines.filter((l) => l.startsWith('# '))
  const split = (line: string): string[] => {
    const cells: string[] = []
    let cell = ''
    let quoted = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]!
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') (cell += '"'), i++
        else if (c === '"') quoted = false
        else cell += c
      } else if (c === '"') quoted = true
      else if (c === ';') (cells.push(cell), (cell = ''))
      else cell += c
    }
    cells.push(cell)
    return cells
  }
  const rest = lines.filter((l) => !l.startsWith('# ')).map(split)
  return { block, table: { headers: rest[0] ?? [], rows: rest.slice(1) } }
}
