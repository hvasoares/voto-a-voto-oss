import type { City } from '@/data'
import { withBase } from '@/paths'
import { SHARD_VERSION } from 'virtual:data-shards'

/**
 * The ONE place that decides where the search gets its cities: the pre-rendered search index shard of ticket #49
 * (`data/v<fingerprint>/search.json`, `[nome, slug, uf]` rows), fetched only when the search is used. Callers stay
 * on the `City[]` shape they already have; the shard has the three fields searching needs, so every other City
 * field comes back empty on purpose — nothing may infer data the shard does not carry.
 */
export async function loadSearchCities(base: string): Promise<City[]> {
  const res = await fetch(withBase(base, `data/v${SHARD_VERSION}/search.json`))
  if (!res.ok) throw new Error(`search.json shard: HTTP ${res.status}`)
  const rows = (await res.json()) as unknown
  if (!Array.isArray(rows) || rows.some((r) => !Array.isArray(r) || r.length !== 3)) throw new Error('search.json shard: unexpected rows')
  return (rows as [string, string, string][]).map(([nome, slug, uf]) => ({ uf, slug, nome, cdMunicipio: '', cdIbge: '', regiao: '', ciclos: [] }))
}