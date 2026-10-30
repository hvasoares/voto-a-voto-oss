/**
 * Pure part of `check:dist-size` (private#204): from a list of built files (path relative to the build folder, bytes)
 * it computes the table by page family, the budget verdict and the cost of one more edition. No file system here;
 * the family of a path is `classifyPath` (private#203), the only path-matching table.
 */
import { PAGE_FAMILIES, classifyPath, type PageFamily } from '../src/shared/page-family'

export interface BuiltFile {
  path: string
  bytes: number
}

export interface FamilyRow {
  family: PageFamily
  /** HTML files of the family. */
  pages: number
  /** Every file of the family (a page's data file counts here, under `data-shards`). */
  files: number
  bytes: number
}

export interface Summary {
  rows: FamilyRow[]
  total: FamilyRow
}

export function summarize(files: BuiltFile[]): Summary {
  const by = new Map<PageFamily, FamilyRow>(PAGE_FAMILIES.map((family) => [family, { family, pages: 0, files: 0, bytes: 0 }]))
  for (const { path, bytes } of files) {
    const row = by.get(classifyPath(path))!
    row.files += 1
    row.bytes += bytes
    if (path.endsWith('.html')) row.pages += 1
  }
  const rows = [...by.values()].filter((r) => r.files > 0).sort((a, b) => b.bytes - a.bytes || a.family.localeCompare(b.family))
  const total: FamilyRow = { family: 'other', pages: 0, files: 0, bytes: 0 }
  for (const r of rows) {
    total.pages += r.pages
    total.files += r.files
    total.bytes += r.bytes
  }
  return { rows, total }
}

const mb = (bytes: number) => (bytes / 1e6).toFixed(1)
const kb = (bytes: number) => (bytes / 1e3).toFixed(1)
const count = (n: number) => n.toLocaleString('en-US')

export function renderTable({ rows, total }: Summary): string {
  const head = ['family', 'pages', 'files', 'MB', 'avg KB/file']
  const line = (name: string, r: FamilyRow) => [name, count(r.pages), count(r.files), mb(r.bytes), r.files ? kb(r.bytes / r.files) : '0.0']
  const cells = [head, ...rows.map((r) => line(r.family, r)), line('total', total)]
  const widths = head.map((_, i) => Math.max(...cells.map((c) => c[i]!.length)))
  const fmt = (c: string[]) => c.map((v, i) => (i === 0 ? v.padEnd(widths[i]!) : v.padStart(widths[i]!))).join('  ')
  return [fmt(cells[0]!), widths.map((w) => '-'.repeat(w)).join('  '), ...cells.slice(1, -1).map(fmt), widths.map((w) => '-'.repeat(w)).join('  '), fmt(cells.at(-1)!)].join('\n')
}

export interface Verdict {
  ok: boolean
  /** Positive: room below the budget; negative: over it. */
  headroomBytes: number
  message: string
}

export function judgeBudget(totalBytes: number, budgetBytes: number): Verdict {
  const headroomBytes = budgetBytes - totalBytes
  const ok = headroomBytes >= 0
  const message = ok
    ? `OK: ${mb(totalBytes)} MB of ${mb(budgetBytes)} MB budget (${mb(headroomBytes)} MB of headroom)`
    : `OVER BUDGET: ${mb(totalBytes)} MB > ${mb(budgetBytes)} MB (over by ${mb(-headroomBytes)} MB)`
  return { ok, headroomBytes, message }
}

/** An edition label as it appears in a path: `<cycle>-<round>`, e.g. `2026-2`. */
const EDITION = /^\d{4}-\d$/

/** The edition a built file belongs to, or undefined: a `fato` page `fato/<...>/<cycle>-<round>/index.html` or its data file `data/<v>/fato/<...>/<cycle>-<round>.json`. */
export function editionOf(path: string): string | undefined {
  const segs = path.replace(/\\/g, '/').split('/').filter(Boolean)
  const isPage = segs[0] === 'fato' && segs.at(-1) === 'index.html'
  const isData = segs[0] === 'data' && segs[2] === 'fato' && segs.at(-1)!.endsWith('.json')
  if (!isPage && !isData) return undefined
  const label = isPage ? segs.at(-2)! : segs.at(-1)!.replace(/\.json$/, '')
  return EDITION.test(label) ? label : undefined
}

export interface EditionCost {
  /** Per edition label, bytes of its pages and data files. */
  perEdition: Record<string, number>
  /** Mean over the editions found (an ESTIMATE: a real new round adds the pages of the cities that have it). */
  meanBytes: number
}

export function editionCost(files: BuiltFile[]): EditionCost {
  const perEdition: Record<string, number> = {}
  for (const { path, bytes } of files) {
    const ed = editionOf(path)
    if (ed) perEdition[ed] = (perEdition[ed] ?? 0) + bytes
  }
  const values = Object.values(perEdition)
  return { perEdition, meanBytes: values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0 }
}

/** Whole editions that fit in `limitBytes - totalBytes` (0 when over or when no edition was found). */
export function editionsOfHeadroom(totalBytes: number, limitBytes: number, costBytes: number): number {
  return costBytes > 0 && limitBytes > totalBytes ? Math.floor((limitBytes - totalBytes) / costBytes) : 0
}

export function renderEditionCost(cost: EditionCost, totalBytes: number, budgetBytes: number, finalBytes: number): string {
  const labels = Object.keys(cost.perEdition).sort()
  if (labels.length === 0) return 'cost of one more edition (ESTIMATE): no `fato/**/<cycle>-<round>/` page found in this build'
  const per = labels.map((l) => `${l} ${mb(cost.perEdition[l]!)} MB`).join(', ')
  const at = (limit: number) => editionsOfHeadroom(totalBytes, limit, cost.meanBytes)
  return [
    `cost of one more edition (ESTIMATE, mean of ${labels.length} edition(s) found in the fato pages and their data files): ${mb(cost.meanBytes)} MB`,
    `  per edition: ${per}`,
    `  editions of headroom: ${at(budgetBytes)} below the budget, ${at(finalBytes)} below the recommended final ${mb(finalBytes)} MB`,
  ].join('\n')
}
