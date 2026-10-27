import { withBase } from '@/paths'
import { SHARD_VERSION } from 'virtual:data-shards'
import type { CentroidShard } from './nearest-city'

/** The pre-rendered city-centre shard (`data/v<fingerprint>/centroids.json`), fetched only when "Usar minha localização" is tapped. */
export async function loadCentroids(base: string): Promise<CentroidShard> {
  const res = await fetch(withBase(base, `data/v${SHARD_VERSION}/centroids.json`))
  if (!res.ok) throw new Error(`centroids.json shard: HTTP ${res.status}`)
  const shard = (await res.json()) as unknown
  if (typeof shard !== 'object' || shard === null || Array.isArray(shard)) throw new Error('centroids.json shard: unexpected shape')
  return shard as CentroidShard
}
