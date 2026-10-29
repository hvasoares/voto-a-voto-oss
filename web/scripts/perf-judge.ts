/**
 * The pure core of `check:perf` (ticket #120): measured bytes + budgets in, rows / failures / warnings out, plus the
 * record schema and its renderers. No file, no process, no clock: `perf-budgets.ts` is the shell that measures, writes
 * `perf-record.json`, prints and exits. A route is any string key here, so the tests need no build.
 *
 * Rules (docs/perf-budgets.md): a metric FAILS when measured > limit (limit = floor(KB * 1024), gzip bytes); it WARNS when
 * it passes with headroom below max(3 percent of the limit, 100 B). Exceeding is the only failing rule: no stored baseline.
 */
export const METRICS = ['html', 'css', 'eagerJs', 'islandJs'] as const
export type MetricKey = (typeof METRICS)[number]
export type Measured = Record<MetricKey, number>
export type BudgetKb = Record<MetricKey, number>

export const WARN_FRACTION = 0.03
export const WARN_MIN_BYTES = 100

export interface Row {
  route: string
  metric: MetricKey
  measured: number
  limit: number
  headroom: number
  status: 'ok' | 'WARN' | 'OVER'
}
export interface Judgement {
  rows: Row[]
  failures: string[]
  warnings: string[]
}

export const limitBytes = (kb: number): number => Math.floor(kb * 1024)
export const warnBand = (limit: number): number => Math.max(limit * WARN_FRACTION, WARN_MIN_BYTES)

const count = (value: unknown, what: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`malformed perf input: ${what} is ${JSON.stringify(value)}, expected a number`)
  return value
}
const size = (value: unknown, what: string): number => {
  const n = count(value, what)
  if (n < 0) throw new Error(`malformed perf input: ${what} is ${n}, expected a non-negative number`)
  return n
}

export function judge(metrics: Record<string, Measured | undefined>, budgets: Record<string, BudgetKb>): Judgement {
  const rows: Row[] = []
  const failures: string[] = []
  const warnings: string[] = []
  for (const [route, budget] of Object.entries(budgets)) {
    const measured = metrics[route]
    if (!measured) {
      failures.push(`${route}: in BUDGETS but not built (no measurement)`)
      continue
    }
    for (const metric of METRICS) {
      const limit = limitBytes(size(budget[metric], `budget ${route}.${metric}`))
      const bytes = size(measured[metric], `measured ${route}.${metric}`)
      const headroom = limit - bytes
      const status = headroom < 0 ? 'OVER' : headroom < warnBand(limit) ? 'WARN' : 'ok'
      rows.push({ route, metric, measured: bytes, limit, headroom, status })
      if (status === 'OVER') failures.push(`${route}.${metric}: ${bytes} B > limit ${limit} B (over by ${-headroom} B)`)
      if (status === 'WARN') warnings.push(`${route}.${metric}: ${bytes} B of ${limit} B, only ${headroom} B of headroom`)
    }
  }
  return { rows, failures, warnings }
}

export interface Cell { measured: number; limit: number; headroom: number }
export interface PerfRecord {
  version: 1
  unit: 'bytes-gzip'
  build: 'fixture'
  base: '/'
  routes: Record<string, { path: string } & Record<MetricKey, Cell>>
  sharedCss: { measured: number }
}

/** Deterministic: no timestamp, commit or run id, so two runs on one build write identical bytes. */
export function buildRecord(rows: Row[], paths: Record<string, string>, sharedCss: number): PerfRecord {
  const routes: PerfRecord['routes'] = {}
  for (const { route, metric, measured, limit, headroom } of rows) {
    routes[route] ??= { path: paths[route] ?? '' } as PerfRecord['routes'][string]
    routes[route]![metric] = { measured, limit, headroom }
  }
  return { version: 1, unit: 'bytes-gzip', build: 'fixture', base: '/', routes, sharedCss: { measured: size(sharedCss, 'sharedCss') } }
}

export const serializeRecord = (record: PerfRecord): string => `${JSON.stringify(record, null, 2)}\n`

/** Parses and validates a record for a consumer; a missing or invalid field throws, it never reads as zero. */
export function parseRecord(text: string): PerfRecord {
  let raw: any
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new Error(`perf record is not JSON: ${(error as Error).message}`)
  }
  if (raw?.version !== 1) throw new Error(`perf record: unsupported version ${JSON.stringify(raw?.version)}`)
  if (raw.unit !== 'bytes-gzip') throw new Error('perf record: unit must be "bytes-gzip"')
  if (!raw.routes || typeof raw.routes !== 'object' || !Object.keys(raw.routes).length) throw new Error('perf record: routes missing or empty')
  for (const [route, entry] of Object.entries<any>(raw.routes)) {
    if (typeof entry?.path !== 'string') throw new Error(`perf record: routes.${route}.path missing`)
    for (const metric of METRICS) {
      const cell = entry[metric]
      const where = `routes.${route}.${metric}`
      const measured = size(cell?.measured, `${where}.measured`)
      const limit = size(cell?.limit, `${where}.limit`)
      if (count(cell?.headroom, `${where}.headroom`) !== limit - measured) throw new Error(`perf record: ${where}.headroom is not limit - measured`)
    }
  }
  size(raw.sharedCss?.measured, 'sharedCss.measured')
  return raw as PerfRecord
}

/** The markdown table of the job summary (and of the console): one row per route and metric. */
export function renderTable(rows: Row[]): string {
  const lines = ['| route | metric | measured (B) | limit (B) | headroom (B) | status |', '|---|---|---:|---:|---:|---|']
  for (const r of rows) lines.push(`| ${r.route} | ${r.metric} | ${r.measured} | ${r.limit} | ${r.headroom} | ${r.status === 'ok' ? '' : r.status} |`)
  return lines.join('\n')
}
