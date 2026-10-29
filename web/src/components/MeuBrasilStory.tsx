import { useEffect, useMemo, useRef, useState } from 'react'
import { getAnalytics } from '@/analytics'
import StorySequence, { type StoryCardView } from '@/components/StorySequence'
import { useIslandReady } from '@/components/use-island-ready'
import { usePlaceCards } from '@/components/use-place-cards'
import { SHARD_VERSION } from 'virtual:data-shards'
import { cityArc } from '@/lib/arcs'
import { cityShardResult, type CityShard } from '@/lib/city-shard'
import { factsOf, type CuriositiesFile } from '@/lib/curiosities'
import { calcLink } from '@/lib/facts/link'
import { placesQuery } from '@/lib/meu-brasil'
import { meuStoryContent } from '@/lib/meu-story-content'
import type { MeuStoryInput, StoryPlace, StoryTwin } from '@/lib/meu-story'
import { twinOf, type PeersFile } from '@/lib/peers'
import { storySay } from '@/lib/story'
import { displayName, ufLabel } from '@/shared/city-search'
import { withBase } from '@/paths'

/**
 * Meu Brasil as a story (#97): the places come from the address (`?mora=…&vota=…&nasceu=…`) and the card on show from its fragment (`#3`), so reloading or forwarding the link reproduces the same card. Each
 * place is read from its own city shard (the same files Meu Brasil reads); for the FIRST place the twin (#31) and the first curiosity (#33) come from `peers.json` and `curiosities.json` and the twin's own shard,
 * only on this page, never on the Meu Brasil page. Nothing is stored (the places are the address). The sequence is the one of #47 (`StorySequence`); the cards are `meu-story.ts`. Only the latest load
 * counts: a newer set of places makes an older answer drop itself. `data-ready` and `data-cards` are for the specs.
 */
export interface MeuBrasilStoryProps {
  base: string
  origin: string
  fixture: boolean
  words: { region: string; dots: string; dot: string; share: string; linkNote: string; nojs: string; none: string; loading: string; failed: string }
}

interface Extras {
  twin?: StoryTwin
  curiosity?: MeuStoryInput['curiosity']
}

const fetchJson = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

export default function MeuBrasilStory({ base, origin, fixture, words }: MeuBrasilStoryProps) {
  const { refs, shards, failed, parsed } = usePlaceCards(base)
  const island = useIslandReady('meu-brasil-story')
  const [extras, setExtras] = useState<{ for: string; value: Extras } | undefined>()
  const first = refs[0]
  const firstKey = first ? `${first.uf}/${first.slug}` : undefined
  const firstShard = firstKey ? shards[firstKey] : undefined

  const places = useMemo<StoryPlace[]>(
    () =>
      refs.flatMap((r) => {
        const sh = shards[`${r.uf}/${r.slug}`]
        if (typeof sh !== 'object') return []
        return [{ name: displayName(sh.city.nome), ufLabel: ufLabel(sh.city.uf), key: `${r.uf}/${r.slug}`, arc: cityArc(sh), results: Object.fromEntries([2018, 2022, 2026].map((a) => [a, cityShardResult(sh, a, 2)])) }]
      }),
    [refs, shards],
  )
  const loaded = refs.length > 0 && places.length === refs.length

  // The twin and the curiosity of the first place, once it is known (the latest first place wins).
  useEffect(() => {
    if (!firstKey || typeof firstShard !== 'object') return
    let live = true
    void (async () => {
      const value: Extras = {}
      try {
        const peers = await fetchJson<PeersFile>(withBase(base, `data/v${SHARD_VERSION}/peers.json`))
        const twinKey = twinOf(peers, first!.uf, first!.slug)
        if (twinKey) {
          const sh = await fetchJson<CityShard>(withBase(base, `data/v${SHARD_VERSION}/city/${twinKey}.json`))
          const result = cityShardResult(sh, 2026, 2)
          if (result && result.aptos > 0) value.twin = { name: displayName(sh.city.nome), ufLabel: ufLabel(sh.city.uf), key: twinKey, result }
        }
      } catch {
        // no twin card: the sequence is told without it
      }
      try {
        const curio = await fetchJson<CuriositiesFile>(withBase(base, `data/v${SHARD_VERSION}/curiosities.json`))
        value.curiosity = factsOf(curio, first!.uf, first!.slug)[0]
      } catch {
        // no curiosity card
      }
      if (live) setExtras({ for: firstKey, value })
    })()
    return () => {
      live = false
    }
  }, [firstKey, typeof firstShard !== 'object' ? undefined : 'ok', base])

  const ready = loaded && extras?.for === firstKey
  const cards = useMemo<StoryCardView[]>(() => {
    if (!ready) return []
    const input: MeuStoryInput = { places, twin: extras!.value.twin, curiosity: extras!.value.curiosity }
    return meuStoryContent(input, refs, { origin, base, fixture }).map((c) => ({
      n: c.n,
      svg: c.svg,
      text: c.text,
      link: c.url,
      filename: c.filename,
      caption: c.caption,
      address: c.address,
      calc: c.calc ? calcLink(`${withBase(base, `/${c.calc.path}`)}#${c.calc.anchor}`).toString() : undefined,
    }))
  }, [ready, places, extras, refs, origin, base, fixture])

  // The back link keeps the places.
  useEffect(() => {
    const a = document.querySelector<HTMLAnchorElement>('[data-back-meu-brasil]')
    if (a && refs.length) a.href = `${withBase(base, '/meu-brasil/')}${placesQuery(refs)}`
  }, [refs, base])

  const opened = useRef(false)
  useEffect(() => {
    if (cards.length && !opened.current) {
      opened.current = true
      getAnalytics().event('meu_story_opened', { places: refs.length })
    }
  }, [cards.length, refs.length])

  const wordsOf = { region: words.region, dots: words.dots, dot: words.dot, share: words.share, linkNote: words.linkNote, nojs: words.nojs }

  // data-ready (#122): no while the shards can still come back; a shard that cannot be read is the terminal
  // failure; no place in the address IS the answer (yes, and the placeholder carries data-places="0").
  useEffect(() => {
    if (!parsed) return
    if (failed) return island.markFailed('city shard')
    // The drawn story (the sequence carries the visitor-facing gate) is the ready answer too.
    if (!refs.length || cards.length) island.markReady()
  }, [parsed, failed, refs.length, cards.length, island.markReady, island.markFailed])

  if (failed) return <p className="mt-4 text-step-1 text-muted-foreground" data-placeholder role="status" data-ready={island.dataReady} data-error={island.dataError}>{words.failed}</p>
  if (!refs.length && parsed) return <p className="mt-4 text-step-1 text-muted-foreground" data-placeholder role="status" data-ready={island.dataReady} data-places="0">{words.none}</p>
  if (!cards.length) return <p className="mt-4 text-step-1 text-muted-foreground" data-placeholder role="status" data-ready={island.dataReady}>{words.loading}</p>
  return (
    <>
      <p className="mt-1 text-step-1 text-muted-foreground" data-subtitle>{storySay('mbstory.sub', {}, { n: cards.length })}</p>
      <StorySequence cards={cards} words={wordsOf} onReached={(n) => getAnalytics().event('meu_story_card_reached', { position: n })} onShared={(n) => getAnalytics().event('meu_story_card_shared', { position: n })} onClose={() => location.assign(`${withBase(base, '/meu-brasil/')}${placesQuery(refs)}`)} />
    </>
  )
}
