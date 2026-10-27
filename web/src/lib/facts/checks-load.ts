/** Build-time loader of the seal's checks (#62): runs them once per build over the dataset the pages are drawn from; a failed check fails the build. */
import { currentEdition } from '../editions-load'
import { loadCityShard, loadSearchShard, loadTotalsFile } from '../shard-files'
import type { CityShard } from '../city-shard'
import { failedChecks, runChecks, type Check } from './checks'

let memo: Promise<Check[]> | undefined
export function loadChecks(): Promise<Check[]> {
  return (memo ??= (async () => {
    const totals = await loadTotalsFile()
    if (!totals) throw new Error('seal checks: the totals shard is missing')
    const rows = (await loadSearchShard()) ?? []
    const cities = (await Promise.all(rows.map(([, slug, uf]) => loadCityShard(uf, slug)))).filter((s): s is CityShard => !!s)
    const checks = runChecks(cities, totals, (await currentEdition()).totals)
    const failed = failedChecks(checks)
    if (failed.length > 0) throw new Error(`seal checks failed:\n  - ${failed.join('\n  - ')}`)
    return checks
  })())
}
