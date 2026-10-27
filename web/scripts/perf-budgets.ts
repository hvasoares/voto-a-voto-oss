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
 * when a budget is exceeded. Budgets live in BUDGETS below and are documented, with the measured
 * numbers, in docs/perf-budgets.md.
 */
import { existsSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const distDir = process.env.OUT_DIR ?? resolve(here, '..', 'dist')

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
  // City html 4 -> 4.6 KB (#51): the desktop top bar's pre-rendered markup (~0.7 KB gzip) is in every page's HTML; no script, no new request.
  city: { html: 4.6, css: 16, eagerJs: 3, islandJs: 3 },
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

const failures: string[] = []
const runs = (m: number, b: number): string => `${kb(m)} / ${kb(b)} ${m <= b ? 'OK' : 'OVER'}`
for (const [id, metric] of Object.entries(measureDist(distDir)) as [RouteId, Metric][]) {
  const b = BUDGETS[id]
  console.log(`\n${id} (${ROUTES[id]})`)
  for (const part of metric.parts) console.log(`  ${part.kind.padEnd(8)} ${kb(part.gzip).padStart(6)}  ${part.path}`)
  console.log(`  html     ${runs(metric.html, b.html * 1024)}`)
  console.log(`  css      ${runs(metric.css, b.css * 1024)}`)
  console.log(`  eagerJs  ${runs(metric.eagerJs, b.eagerJs * 1024)}`)
  console.log(`  islandJs ${runs(metric.islandJs, b.islandJs * 1024)} (hydration JS; not loaded at parse for client:interaction islands)`)
  console.log(`  total    ${kb(metric.total)} gzip`)
  for (const [key, kind] of [['html', metric.html], ['css', metric.css], ['eagerJs', metric.eagerJs], ['islandJs', metric.islandJs]] as const) {
    if (kind > b[key] * 1024) failures.push(`${id}.${key}: ${kb(kind)} > budget ${kb(b[key] * 1024)}`)
  }
}
if (failures.length) {
  console.error(`\nBUDGET EXCEEDED:\n${failures.join('\n')}`)
  process.exit(1)
} else {
  console.log('\nAll budgets met.')
}