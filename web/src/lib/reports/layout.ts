/**
 * The typed input contract of the shared report layout (ticket #118): the pure half of
 * `layouts/ReportLayout.astro`, `components/ReportTable.astro`, `ReportNotice.astro` and `ReportShare.astro`.
 * The components only draw; what a report page may hand them is checked here, so malformed input fails the BUILD
 * with a message naming the page and the field, never as a silent empty render.
 */

/** The rank badge of a list row (a number in the primary colour). One copy, shared by every ranked list. */
export const RANK_BADGE = 'flex size-8 flex-none items-center justify-center rounded-full bg-primary pb-px text-step-1 font-bold text-primary-foreground'

/** One row of a ranked list: the city link, the two lines of words and the fact record of its figure. */
export interface ReportRow {
  /** The value of the row's marker attribute (`data-race="<slug>"`); numbers are written as text. */
  id: string | number
  uf: string
  slug: string
  /** The bold first line ("Cidade/UF"), already written by the page. */
  name: string
  /** The muted second line (the figures), already written by the page. */
  detail: string
  /** The fact record anchor of the row's figure (the calculation link beside the row). */
  factKey: string
}

const blank = (v: unknown): boolean => typeof v !== 'string' || v.trim() === ''

/** Throws a clear Error naming `where` when a row cannot be drawn. */
export function assertReportRows(where: string, rows: readonly ReportRow[]): void {
  if (!Array.isArray(rows)) throw new Error(`${where}: rows must be an array, got ${typeof rows}`)
  rows.forEach((r, i) => {
    const at = `${where}: row ${i}`
    if (r === null || typeof r !== 'object') throw new Error(`${at} is not an object`)
    if (typeof r.id !== 'string' && typeof r.id !== 'number') throw new Error(`${at} has no id`)
    for (const field of ['uf', 'slug', 'name', 'detail', 'factKey'] as const) if (blank(r[field])) throw new Error(`${at} has an empty ${field}`)
  })
}

/** What the layout needs of a page; the components' own Props are this plus drawing options. */
export interface ReportPageInput {
  title: string
  heading: string
  seal: string[]
  report?: string
  notice?: string
}

/** Throws a clear Error naming the page when the layout input is malformed. */
export function assertReportPage(page: ReportPageInput): void {
  const where = `report page "${page?.title ?? '(no title)'}"`
  if (blank(page?.title)) throw new Error(`report page has no title`)
  if (blank(page.heading)) throw new Error(`${where}: heading is empty`)
  if (!Array.isArray(page.seal)) throw new Error(`${where}: seal must be the lines of sealOf(), got ${typeof page.seal}`)
  if (page.report !== undefined && blank(page.report)) throw new Error(`${where}: report must be a non-empty data-report key`)
  if (page.notice !== undefined && blank(page.notice)) throw new Error(`${where}: notice must be non-empty text when given`)
}
