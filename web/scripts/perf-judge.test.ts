/**
 * The fast guard of ticket #120: the pure judge, the record schema and the "no stale measured table" doc rule.
 * Nothing here builds: the inputs are fixed numbers, so "CI turns red on a breach" holds at the unit level too.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildRecord, judge, parseRecord, renderTable, serializeRecord, type BudgetKb, type Measured } from './perf-judge'

const budgets: Record<string, BudgetKb> = { city: { html: 6, css: 16, eagerJs: 3, islandJs: 3 } } // 6144 / 16384 / 3072 / 3072 B
const comfortable: Measured = { html: 1000, css: 1000, eagerJs: 1000, islandJs: 1000 }
const measuring = (overrides: Partial<Measured>): Record<string, Measured> => ({ city: { ...comfortable, ...overrides } })

describe('judge', () => {
  it('fails a metric one byte over its limit and names route, metric, measured and limit', () => {
    const { failures, rows } = judge(measuring({ html: 6145 }), budgets)
    expect(failures).toEqual(['city.html: 6145 B > limit 6144 B (over by 1 B)'])
    expect(rows.find((r) => r.metric === 'html')).toMatchObject({ status: 'OVER', headroom: -1 })
  })

  it('passes exactly at the limit with headroom 0 (inside the warn band)', () => {
    const { failures, warnings, rows } = judge(measuring({ html: 6144 }), budgets)
    expect(failures).toEqual([])
    expect(rows.find((r) => r.metric === 'html')).toMatchObject({ headroom: 0, status: 'WARN' })
    expect(warnings).toHaveLength(1)
  })

  it.each([
    // the band is max(3% of the limit, 100 B): 184.32 B for the 6144 B html, 491.52 B for the 16384 B css, the 100 B floor for the 3072 B eagerJs (3% = 92.16)
    ['html', 6144 - 184, 'WARN'],
    ['html', 6144 - 185, 'ok'],
    ['eagerJs', 3072 - 99, 'WARN'],
    ['eagerJs', 3072 - 100, 'ok'],
    ['css', 16384 - 491, 'WARN'],
    ['css', 16384 - 492, 'ok'],
  ] as const)('%s at %i bytes is %s', (metric, measured, status) => {
    const { rows, failures } = judge(measuring({ [metric]: measured }), budgets)
    expect(failures).toEqual([])
    expect(rows.find((r) => r.metric === metric)?.status).toBe(status)
  })

  it('fails a route that is in the budgets but was not built', () => {
    const { failures } = judge({}, budgets)
    expect(failures).toEqual(['city: in BUDGETS but not built (no measurement)'])
  })

  it.each([
    ['a NaN measurement', measuring({ html: Number.NaN })],
    ['a negative measurement', measuring({ css: -1 })],
    ['a missing metric', { city: { html: 1, css: 1, eagerJs: 1 } as Measured }],
  ])('throws a clear error on %s', (_name, metrics) => {
    expect(() => judge(metrics, budgets)).toThrow(/malformed perf input: measured city\./)
  })
})

describe('the record', () => {
  const { rows } = judge(measuring({}), budgets)
  const record = buildRecord(rows, { city: 'rj/cidade-exemplo/index.html' }, 15697)

  it('is byte-identical for the same input (no timestamp, commit or run id)', () => {
    const again = buildRecord(judge(measuring({}), budgets).rows, { city: 'rj/cidade-exemplo/index.html' }, 15697)
    expect(serializeRecord(again)).toBe(serializeRecord(record))
  })

  it('keeps headroom as limit minus measured, so a negative one is exactly "over"', () => {
    const over = buildRecord(judge(measuring({ html: 6145 }), budgets).rows, { city: 'p' }, 1)
    expect(over.routes.city!.html).toEqual({ measured: 6145, limit: 6144, headroom: -1 })
  })

  it('round-trips through parseRecord', () => {
    expect(parseRecord(serializeRecord(record))).toEqual(record)
  })

  it.each([
    ['not JSON', '{'],
    ['an unknown version', JSON.stringify({ ...record, version: 2 })],
    ['a missing metric', JSON.stringify({ ...record, routes: { city: { path: 'p', html: record.routes.city!.html } } })],
    ['a headroom that disagrees', JSON.stringify({ ...record, routes: { city: { ...record.routes.city, html: { measured: 1, limit: 10, headroom: 3 } } } })],
    ['no sharedCss', JSON.stringify({ ...record, sharedCss: {} })],
  ])('rejects %s instead of reading it as zero', (_name, text) => {
    expect(() => parseRecord(text)).toThrow(/perf (record|input)|malformed perf input/)
  })

  it('renders one table row per route and metric, flagging WARN and OVER', () => {
    const table = renderTable(judge(measuring({ html: 6145, css: 16384 }), budgets).rows).split('\n')
    expect(table).toHaveLength(2 + 4)
    expect(table.find((l) => l.startsWith('| city | html'))).toMatch(/OVER/)
    expect(table.find((l) => l.startsWith('| city | css'))).toMatch(/WARN/)
  })
})

describe('docs/perf-budgets.md', () => {
  it('carries no measured figure in bold (those live in perf-record.json, ticket #120)', () => {
    const doc = readFileSync(fileURLToPath(new URL('../docs/perf-budgets.md', import.meta.url)), 'utf8')
    expect(doc.match(/\*\*\d+\.\dK\*\*/g) ?? []).toEqual([])
    expect(doc).toContain('perf-record.json')
  })
})
