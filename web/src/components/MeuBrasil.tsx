import { useEffect, useMemo, useState } from 'react'
import { SHARD_VERSION } from 'virtual:data-shards'
import { getAnalytics } from '@/analytics'
import PlacePicker, { type PickedPlace } from '@/components/PlacePicker'
import ShareActions from '@/components/ShareActions'
import { withBase } from '@/paths'
import type { CityShard } from '@/lib/city-shard'
import type { CycleBlock } from '@/slots/city-cycles/cycles-model'
import { buildPlaceCard, parsePlaces, placesQuery, ROLES, type PlaceCard, type PlaceRef, type Role } from '@/lib/meu-brasil'
import { meuBrasilContent } from '@/lib/meu-brasil-content'
import { DEFAULT_VOICE, message, type MessageKey } from '@/lib/sentences/catalog'
import { readRegister } from '@/lib/sentences/register-store'

/**
 * Meu Brasil (#27): up to three places (where the visitor lives, votes and was born), picked with the same city field as the
 * generator, and ONE card comparing them across 2018, 2022 and 2026. The places are the ADDRESS (`?mora=…&vota=…&nasceu=…`): reloading
 * or forwarding the link reproduces the card, and nothing is stored on the device. Each place is read from its own city shard.
 * The card is drawn by `meuBrasilCardSvg`; its text alternative is the generated headline; it shares through the existing flow.
 */
export interface MeuBrasilProps {
  base: string
  origin: string
  fixture: boolean
  /** The id of the data edition: the picture carries it with its other keys (#38). */
  edition: string
}

type Shards = Record<string, CityShard | 'failed'>
const keyOf = (r: PlaceRef) => `${r.uf}/${r.slug}`
const say = (key: MessageKey) => message(DEFAULT_VOICE, key)

const SIDE_FILL = { a: 'bg-[var(--c-cand-a)]', b: 'bg-[var(--c-cand-b)]', outros: 'bg-[var(--c-cand-outros)]' } as const
/** "Candidato A" reads "A" (the frame's wording); real names stay. */
const shortLabel = (label: string) => (/^Candidato [A-Z]$/.test(label) ? label.slice(-1) : label)

/** One place as a column of the desktop frame: the three cycles, each with the votes split between the candidates and the share that did not vote. */
function PlaceColumn({ card }: { card: PlaceCard }) {
  return (
    <section className="rounded-md border border-foreground p-5" aria-label={`${card.name} · ${card.ufLabel}`} data-place-column={card.ref.role}>
      <h3 className="text-body font-bold leading-[18px]">{card.name} · {card.ufLabel}</h3>
      {card.cycles.map((b: CycleBlock) => (
        <div key={b.ano} className="mt-3" data-cycle={b.ano}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-serif text-[20px] leading-6">{b.ano}</span>
            {b.status === 'data' && <span className="text-tiny leading-[12px] text-muted-foreground">{message(DEFAULT_VOICE, 'mb.votedLine', { sides: b.sides.filter((x) => x.key !== 'outros').map((x) => `${shortLabel(x.label)} ${x.pct}%`).join(' · ') })}</span>}
          </div>
          {b.status === 'data' && b.validos > 0 ? (
            <div className="mt-1 flex h-[26px] w-full overflow-hidden">
              {b.sides.filter((x) => x.pct > 0).map((x) => <span key={x.key} className={SIDE_FILL[x.key]} style={{ width: `${x.pct}%` }} />)}
            </div>
          ) : (
            <div className="mt-1 h-[26px] w-full bg-secondary" />
          )}
          {b.status === 'data' ? (
            <>
              <div className="mt-1.5 h-[18px] bg-[var(--c-abstencao)]" style={{ width: `${Math.max(2, b.notVotedPct)}%` }} />
              <p className="mt-1 text-tiny leading-[12px] text-muted-foreground">{message(DEFAULT_VOICE, 'mb.notVotedFull', { pct: b.notVotedPct })}</p>
            </>
          ) : (
            <p className="mt-1.5 text-tiny leading-[12px] text-muted-foreground">{say('recap.rowNoData')}</p>
          )}
        </div>
      ))}
    </section>
  )
}

export default function MeuBrasil({ base, origin, fixture, edition }: MeuBrasilProps) {
  const [refs, setRefs] = useState<PlaceRef[]>([])
  const [shards, setShards] = useState<Shards>({})
  const [picked, setPicked] = useState<Partial<Record<Role, PickedPlace>>>({})

  // The address asks for the places: read once, in the browser.
  useEffect(() => setRefs(parsePlaces(location.search)), [])

  // Each place needs its own shard, once.
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
  const content = useMemo(() => (cards.length ? meuBrasilContent(cards, { origin, base, fixture, edition }) : undefined), [cards, origin, base, fixture, edition])
  const register = typeof window === 'undefined' ? 'standard' : readRegister()

  const setPlace = (role: Role, p: PickedPlace | undefined) => {
    const next = [...refs.filter((r) => r.role !== role), ...(p ? [{ role, uf: p.uf, slug: p.slug }] : [])]
    const ordered = ROLES.flatMap((x) => next.filter((r) => r.role === x))
    setRefs(ordered)
    setPicked((s) => ({ ...s, [role]: p }))
    history.replaceState(null, '', `${location.pathname}${placesQuery(ordered)}`)
    if (p) getAnalytics().event('meu_brasil_place_added', { role, places: ordered.length })
  }

  const nameOf = (role: Role): PickedPlace | undefined => {
    const r = refs.find((x) => x.role === role)
    if (!r) return undefined
    if (picked[role] && picked[role]!.uf === r.uf && picked[role]!.slug === r.slug) return picked[role]
    const card = cards.find((c) => c.ref.role === role)
    return card ? { uf: r.uf, slug: r.slug, nome: card.name } : { uf: r.uf, slug: r.slug, nome: r.slug }
  }
  const failed = refs.some((r) => shards[keyOf(r)] === 'failed')

  return (
    <div data-meu-brasil data-places={refs.length} data-ready={content ? 'yes' : 'no'}>
      {/* From 1024 px (the desktop frame) the headline sits over the fields and each place is a column; the picture below is the one that is shared. */}
      {content && <p className="mt-4 hidden font-serif text-[28px] leading-[36px] lg:block" data-headline>{content.variants.standard.alt}</p>}
      <div className="mt-3 grid gap-2 lg:grid-cols-3 lg:gap-[30px]">
        {ROLES.map((role) => (
          <PlacePicker key={role} base={base} inside label={say(`mb.role.${role}`)} value={nameOf(role)} onPick={(p) => setPlace(role, p)} onClear={() => setPlace(role, undefined)} placeholder="Busque uma cidade" />
        ))}
      </div>

      {cards.length > 0 && (
        <div className="mt-6 hidden gap-[30px] lg:grid lg:grid-cols-3" data-place-columns>
          {cards.map((c) => <PlaceColumn key={c.ref.role} card={c} />)}
        </div>
      )}

      <div className="mt-4 lg:hidden" data-card>
        {content ? (
          <div className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full" data-card-picture dangerouslySetInnerHTML={{ __html: content.svg }} />
        ) : (
          <p className="text-small leading-[17px] text-muted-foreground" data-placeholder role="status">
            {failed ? 'Não foi possível carregar os dados de um dos lugares agora.' : refs.length ? 'Carregando…' : say('mb.none')}
          </p>
        )}
      </div>

      {content && (
        <div className="lg:mx-auto lg:max-w-[320px]">
        <ShareActions
          text={content.variants[register].text}
          svg={content.svg}
          filename={content.filename}
          link={content.url}
          primaryLabel={say('mb.share')}
          compact
          onShared={() => getAnalytics().event('meu_brasil_shared', { places: cards.length })}
        />
        </div>
      )}
      <p className="mt-2 text-center text-[11px] leading-[14px] text-muted-foreground" data-note>{say('mb.addressNote')}</p>
    </div>
  )
}
