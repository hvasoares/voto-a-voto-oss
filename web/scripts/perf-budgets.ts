/**
 * Weight budgets for the four audited routes (ticket #19). PURE + static: no browser, no server.
 *
 * For each route the script reads the BUILT `index.html` out of the dist directory and sums,
 * gzipped, what the browser transfers:
 *   - `html`        the page document itself;
 *   - `css`         every stylesheet the document links (the site ships one shared CSS file);
 *   - `eagerJs`     every `<script src>` in the document (page scripts; islands do not count here);
 *   - `islandJs`    every React island the document declares (astro-island `component-url` and
 *                   `renderer-url`) — NOT loaded at page load for `client:interaction` islands
 *                   (they hydrate on the first pointer/focus) but loaded by `client:idle`; the
 *                   script reports the total the route can put on the wire, and the doc splits it;
 *   - `total`       html + css + eagerJs + islandJs, i.e. everything the route can ever request.
 *
 * All numbers are gzip (node:zlib on the built bytes) — what a 4G phone would download with the
 * server's plain compression. Run after a build: `npm run build && npm run check:perf`. Exits 1
 * when a budget is exceeded. Budgets live in BUDGETS below; the measured numbers and the headroom are not
 * in the docs but in `web/perf-record.json`, which every run writes (git-ignored, deterministic; ticket #120).
 * The judging is pure and lives in `perf-judge.ts`; this file is the shell (measure, write, print, exit).
 */
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildRecord, judge, renderTable, serializeRecord, type Measured } from './perf-judge'

const here = dirname(fileURLToPath(import.meta.url))
const distDir = process.env.OUT_DIR ?? resolve(here, '..', 'dist')
const recordFile = process.env.PERF_RECORD ?? resolve(here, '..', 'perf-record.json')

export type RouteId = 'home' | 'city' | 'mapa' | 'report'

/** The four audited routes, as paths under the dist root. */
export const ROUTES: Record<RouteId, string> = {
  home: 'index.html',
  city: 'rj/cidade-exemplo/index.html',
  mapa: 'mapa/index.html',
  report: 'relatorios/cidades-que-viraram/index.html',
}

export interface Budget {
  /** Page document, gzip. */
  html: number
  /** Stylesheets the document links, gzip. */
  css: number
  /** Scripts the document loads at parse time (page scripts), gzip. */
  eagerJs: number
  /** React islands the route declares (hydrate on interaction or idle), gzip. */
  islandJs: number
}

/** Budgets in KB, gzip. Set from #19's intent (see docs/perf-budgets.md); the script fails loudly on a miss. */
export const BUDGETS: Record<RouteId, Budget> = {
  // Home eagerJs 3 -> 4.2 KB (#35/#40): the Sua cidade shortcut and the location button run on the home page (docs/perf-budgets.md).
  home: { html: 12, css: 16, eagerJs: 4.2, islandJs: 120 },
  // City html 4 -> 5.2 KB (#51, #52): the desktop top bar's pre-rendered markup (~0.7 KB gzip) is in every page's HTML, and the two-column card adds
  // its second column's wrappers and the links' one-line descriptions (~0.5 KB); no script, no new request.
  // City html 5.2 -> 6.2 KB (G2, #26 #41 #31 #33): the margin line, the arc, the twin and the curiosities card are all pre-rendered text
  // in the page, in both registers (~0.95 KB gzip: curiosities 0.4, margin 0.27, twin 0.15, arc 0.13); no script, no new request.
  // City html 6.2 -> 6.4 KB (G6, #61): the the calculation link links, 54 of them in the six pre-rendered views (1 per figure, the sentence and the margin line), +369 B gzip (6106 -> 6475 B);
  // no script, no new request, and the css grew by 92 B gzip (the .calc rules), still under its 16 KB budget (docs/perf-budgets.md).
  // City html 6.4 -> measured 6.17 KB (#155): the 54 per-figure links give way to the page's one calculation entry (-305 B gzip); the budget stays, the script grew ~40 B (eagerJs 3054 of 3072).
  city: { html: 6.4, css: 16, eagerJs: 3, islandJs: 3 },
  mapa: { html: 12, css: 16, eagerJs: 3, islandJs: 85 },
  report: { html: 12, css: 16, eagerJs: 3, islandJs: 3 },
}

export interface Metric {
  html: number
  css: number
  eagerJs: number
  islandJs: number
  total: number
  /** Gzipped size of every asset that took part, by path. */
  parts: { path: string; kind: 'html' | 'css' | 'eagerJs' | 'islandJs'; gzip: number }[]
}

const gzip = (bytes: Buffer): number => gzipSync(bytes).length
const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)}K`

const HTML = (html: string, distRoot: string): Metric => {
  const parts: Metric['parts'] = []
  const htmlGzip = gzip(Buffer.from(html))
  parts.push({ path: 'index.html', kind: 'html', gzip: htmlGzip })

  const metric: Metric = { html: htmlGzip, css: 0, eagerJs: 0, islandJs: 0, total: 0, parts }
  const seen = new Set<string>()

  const asset = (path: string, kind: 'css' | 'eagerJs' | 'islandJs'): void => {
    const rel = path.replace(/^.*?_astro\//, '_astro/')
    if (seen.has(rel)) return
    seen.add(rel)
    const file = join(distRoot, rel)
    if (!existsSync(file)) throw new Error(`asset missing in dist: ${rel}`)
    const size = gzip(readFileSync(file))
    parts.push({ path: rel, kind, gzip: size })
    metric[kind] += size
  }

  // Stylesheets and plain scripts: links and module script tags.
  for (const m of html.matchAll(/(?:href|src)="([^"]*?_astro\/[^"]*?\.(?:css|js))"/g)) {
    const url = m[1]!
    const isCss = url.endsWith('.css') && /rel="stylesheet"/.test(html.slice(Math.max(0, m.index! - 80), m.index!))
    asset(url, isCss ? 'css' : 'eagerJs')
  }
  // React islands: component-url / renderer-url point at the island module and the Astro client.
  for (const m of html.matchAll(/(?:component-url|renderer-url)="([^"]+?)"/g)) asset(m[1]!, 'islandJs')

  metric.total = metric.html + metric.css + metric.eagerJs + metric.islandJs
  return metric
}

export function measureDist(distRoot: string): Record<RouteId, Metric> {
  const out = {} as Record<RouteId, Metric>
  for (const [id, rel] of Object.entries(ROUTES) as [RouteId, string][]) {
    const file = join(distRoot, rel)
    if (!existsSync(file)) throw new Error(`route not built: ${rel} (run npm run build)`)
    out[id] = HTML(readFileSync(file, 'utf8'), distRoot)
  }
  return out
}

function main(distRoot: string): void {
  const metrics = measureDist(distRoot)
  for (const [id, metric] of Object.entries(metrics) as [RouteId, Metric][]) {
    console.log(`\n${id} (${ROUTES[id]})`)
    for (const part of metric.parts) console.log(`  ${part.kind.padEnd(8)} ${kb(part.gzip).padStart(6)}  ${part.path}`)
    console.log(`  total    ${kb(metric.total)} gzip (islandJs is hydration JS; not loaded at parse for client:interaction islands)`)
  }
  const { rows, failures, warnings } = judge(metrics as Record<RouteId, Measured>, BUDGETS)
  const table = renderTable(rows)
  // The record is written before the verdict, so a red run still leaves the numbers behind.
  writeFileSync(recordFile, serializeRecord(buildRecord(rows, ROUTES, sharedCssBytes(metrics))), 'utf8')
  console.log(`\n${table}\n\nrecord: ${recordFile}`)
  const summary = process.env.GITHUB_STEP_SUMMARY
  if (summary) {
    const run = [process.env.GITHUB_SHA?.slice(0, 7), process.env.GITHUB_RUN_ID && `run ${process.env.GITHUB_RUN_ID}`].filter(Boolean).join(', ')
    appendFileSync(summary, `### check:perf (fixture build, base /, gzip bytes${run ? `; ${run}` : ''})\n\n${table}\n`)
  }
  if (warnings.length) console.warn(`\nWARN (headroom below max(3%, 100 B)):\n${warnings.join('\n')}`)
  if (failures.length) {
    console.error(`\nBUDGET EXCEEDED:\n${failures.join('\n')}`)
    process.exit(1)
  }
  console.log('\nAll budgets met.')
}

/** The one stylesheet linked from every audited route (what #119 measures); anything else is an error, never a guess. */
export function sharedCssBytes(metrics: Record<RouteId, Metric>): number {
  const sets = Object.values(metrics).map((m) => new Map(m.parts.filter((p) => p.kind === 'css').map((p) => [p.path, p.gzip])))
  const common = [...sets[0]!.keys()].filter((path) => sets.every((set) => set.has(path)))
  if (common.length !== 1) throw new Error(`expected exactly one stylesheet shared by all routes, found ${common.length}: ${common.join(', ') || '(none)'}`)
  return sets[0]!.get(common[0]!)!
}

// CLI: `tsx scripts/perf-budgets.ts` (npm run check:perf). The route-inventory guard (#110) imports ROUTES
// and BUDGETS in tests, so the run itself waits until the file is executed, like sample-manifest.ts.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(distDir)