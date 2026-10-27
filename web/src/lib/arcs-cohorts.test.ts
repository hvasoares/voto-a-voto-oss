import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildShards, type ShardSources } from '../../integrations/shards'
import { FINGERPRINT_FILES } from '../../integrations/shards-fingerprint'
import { ARC_KINDS, type ArcsFile } from './arcs'
import { loadCohortData } from './cohorts-load'
import { dataDir } from './data-dir'

/** The arcs.json of a dataset directory, and the cities per arc the cohort table of "Como cada grupo votou" implies. */
async function both(dir: string) {
  const sources = Object.fromEntries(FINGERPRINT_FILES.map((f) => [f, readFileSync(resolve(dir, f), 'utf8')])) as ShardSources
  const built = buildShards(sources)
  const arcs = JSON.parse(built.files.find((f) => f.path.endsWith('/arcs.json'))!.json) as ArcsFile
  const { report, labels } = await loadCohortData(dir)
  const camp = (ano: number, n: number) => labels[`${ano}|${n}`]!.camp
  const expected = Object.fromEntries(ARC_KINDS.map((k) => [k, 0])) as ArcsFile['counts']
  for (const g of report.groups) {
    const [c18, c22] = [camp(2018, g.winner2018), camp(2022, g.winner2022)]
    for (const p of g.parts) {
      const c26 = camp(2026, p.candidate)
      const kind = c18 === c22 ? (c26 === c22 ? 'same' : 'switched2026') : c26 === c22 ? 'switched2022' : c26 === c18 ? 'returned' : 'switchedTwice'
      expected[kind] += p.cities
    }
    // a city that ties in 2026 is in the group of the table (outside its bars) and has the arc `tie`
    expected.tie += g.ties2026
  }
  expected.tie += report.tieCases.length
  expected.missing += report.noData.length
  return { arcs, expected, report }
}

describe('arcs.json matches the cohort table', () => {
  it('the fixture dataset: same count per arc, and every city (overseas apart) in exactly one', async () => {
    const { arcs, expected, report } = await both(dataDir())
    expect(arcs.counts).toEqual(expected)
    expect(Object.values(arcs.counts).reduce((a, b) => a + b, 0)).toBe(report.totals.cities2026)
  })

  const real = existsSync(resolve('../data/votes.csv'))
  it.skipIf(!real)('the real dataset: same count per arc as the cohort table, 5.571 cities, the overseas posts apart', { timeout: 120_000 }, async () => {
    const { arcs, expected, report } = await both(resolve('../data'))
    expect(arcs.counts).toEqual(expected)
    expect(report.totals.cities2026).toBe(5571)
    expect(Object.values(arcs.counts).reduce((a, b) => a + b, 0)).toBe(5571)
    expect(Object.values(arcs.overseas).reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
  })
})
