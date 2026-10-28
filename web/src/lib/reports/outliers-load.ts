import { createStore } from '@/data/store'
import { diskSource } from '@/data/node'
import { dataDir } from '../data-dir'
import { computePeers } from '../peers'
import { UF_NOME } from '../uf-names'
import { MIN_OPTIONS, computeOutliers, pickOutliers, type OutlierFilter, type OutlierRow, type Outliers } from './outliers'

/**
 * Build-time loader of "Cidades fora da curva" (#34): reads DATA_DIR through the store, computes the peers (the same function the shard builder publishes
 * `peers.json` with) and the ranking, once per build process. The pages, the fact records and the hub all read it, so they cannot disagree.
 */
export interface OutlierSet extends Outliers {
  /** The states that have cities in the ranking, with their names, in alphabetical order of the name. */
  states: { uf: string; name: string }[]
  /** Every filter that has a page: all states and each state, at each minimum. */
  filters: OutlierFilter[]
  /** Each page's list. */
  pick(filter: OutlierFilter): ReturnType<typeof pickOutliers>
  /** The cities that any list shows (a city once). */
  listed: OutlierRow[]
  /** The counts the lists state, one per filter. */
  counts: { uf: string | undefined; min: number; n: number }[]
}

let memo: Promise<OutlierSet> | undefined

export function loadOutliers(): Promise<OutlierSet> {
  return (memo ??= (async () => {
    const store = createStore(diskSource(dataDir()))
    const [cities, turnout, votes, candidates] = await Promise.all([store.cities(), store.turnout(), store.votes(), store.candidates()])
    const outliers = computeOutliers({ cities, turnout, votes, candidates, peers: computePeers({ cities, turnout, votes }) })
    const ufs = [...new Set(outliers.rows.map((r) => r.uf))]
    const states = ufs.map((uf) => ({ uf, name: UF_NOME[uf] ?? uf.toUpperCase() })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    const filters = [undefined, ...states.map((s) => s.uf)].flatMap((uf) => MIN_OPTIONS.map((min) => ({ uf, min })))
    const picks = filters.map((f) => ({ f, p: pickOutliers(outliers.rows, f) }))
    const seen = new Map<string, OutlierRow>()
    for (const { p } of picks) for (const r of p.shown) seen.set(`${r.uf}/${r.slug}`, r)
    return {
      ...outliers,
      states,
      filters,
      pick: (f) => pickOutliers(outliers.rows, f),
      listed: [...seen.values()],
      counts: picks.map(({ f, p }) => ({ uf: f.uf, min: f.min, n: p.compared })),
    }
  })())
}
