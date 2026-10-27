import { useEffect, useMemo, useState } from 'react'
import { SHARD_VERSION } from 'virtual:data-shards'
import { withBase } from '@/paths'
import type { CityShard } from '@/lib/city-shard'
import { buildPlaceCard, parsePlaces, type PlaceCard, type PlaceRef } from '@/lib/meu-brasil'

type Shards = Record<string, CityShard | 'failed'>
const keyOf = (r: PlaceRef) => `${r.uf}/${r.slug}`

/**
 * The places of the address and their cards (Meu Brasil, #27, and its sticker, #37): the places are read once from the address in the
 * browser, each place's own city shard is fetched once, and nothing else is requested. `failed` is true when a shard could not be read.
 */
export function usePlaceCards(base: string) {
  const [refs, setRefs] = useState<PlaceRef[]>([])
  const [shards, setShards] = useState<Shards>({})

  useEffect(() => setRefs(parsePlaces(location.search)), [])

  useEffect(() => {
    for (const r of refs) {
      const k = keyOf(r)
      if (shards[k]) continue
      setShards((s) => ({ ...s, [k]: s[k] ?? ('failed' as const) }))
      fetch(withBase(base, `data/v${SHARD_VERSION}/city/${k}.json`))
        .then((res) => (res.ok ? (res.json() as Promise<CityShard>) : Promise.reject(new Error(`city shard: HTTP ${res.status}`))))
        .then((shard) => setShards((s) => ({ ...s, [k]: shard })))
        .catch(() => setShards((s) => ({ ...s, [k]: 'failed' })))
    }
  }, [refs, shards, base])

  const cards = useMemo<PlaceCard[]>(
    () => refs.flatMap((r) => { const sh = shards[keyOf(r)]; return sh && sh !== 'failed' ? [buildPlaceCard(r, sh)] : [] }),
    [refs, shards],
  )
  const failed = refs.some((r) => shards[keyOf(r)] === 'failed')
  return { refs, setRefs, cards, failed }
}
