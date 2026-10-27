/** The `centroids.json` shard of ticket #40: where each city's IBGE centre is, for "Usar minha localização". */
import type { City } from '@/data'
import type { CentroidShard } from '../src/lib/nearest-city'
import type { Centroid } from '@/data/csv'

/** A city of the dataset without a centre (Boa Esperança do Norte, newer than IBGE's mesh) is left out; a centre without a city is an error. */
export function encodeCentroids(cities: City[], centroids: Centroid[], fail: (message: string) => never = (m) => { throw new Error(m) }): CentroidShard {
  const byIbge = new Map(cities.filter((c) => c.cdIbge).map((c) => [c.cdIbge, c]))
  const shard: Record<string, [string, number, number][]> = {}
  for (const c of centroids) {
    const city = byIbge.get(c.cdIbge)
    if (!city) fail(`centroids.csv: ${c.cdIbge} is not the IBGE code of any city of cities.csv`)
    ;(shard[city!.uf] ??= []).push([city!.slug, c.lat, c.lon])
  }
  const out: CentroidShard = {}
  for (const uf of Object.keys(shard).sort()) out[uf] = shard[uf]!.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return out
}
