import { useEffect, useState } from 'react'
import { SHARD_VERSION } from 'virtual:data-shards'
import { linkHref } from '@/paths'
import type { CityShard } from '@/lib/city-shard'

export type ShardState = CityShard | 'loading' | 'failed'

/**
 * The city shards of the places a page shows (`rj/cidade-exemplo`): each is fetched once, the first time its code appears, from the site's
 * own files; nothing else is requested. `failed` stands for a shard that could not be read (an unknown city or a network error).
 */
export function useCityShards(base: string, codes: readonly string[]): Record<string, ShardState> {
  const [shards, setShards] = useState<Record<string, ShardState>>({})
  const key = codes.join('|')

  useEffect(() => {
    for (const code of codes) {
      if (shards[code]) continue
      setShards((s) => ({ ...s, [code]: 'loading' }))
      fetch(linkHref(`data/v${SHARD_VERSION}/city/${code}.json`, base))
        .then((res) => (res.ok ? (res.json() as Promise<CityShard>) : Promise.reject(new Error(`city shard: HTTP ${res.status}`))))
        .then((shard) => setShards((s) => ({ ...s, [code]: shard })))
        .catch(() => setShards((s) => ({ ...s, [code]: 'failed' })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, base])

  return shards
}
