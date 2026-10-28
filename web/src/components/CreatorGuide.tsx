import { useEffect, useState, type ReactNode } from 'react'
import { useCityShards } from '@/components/use-city-shards'
import PlacePicker, { type PickedPlace } from '@/components/PlacePicker'
import { creatorPhrases } from '@/lib/creator-phrases'
import { DEFAULT_VOICE, message, type MessageKey, type Register } from '@/lib/sentences/catalog'
import '@/lib/sentences/catalog-guide'
import { parsePlaces } from '@/lib/meu-brasil'
import { shortAddress } from '@/lib/share-text'
import { cityUrl } from '@/lib/share-url'
import { displayName } from '@/shared/city-search'

/**
 * "Pode dizer" and "Como citar" of the creator guide (#67): for the city in the address (`?mora=uf/cidade`) or chosen in the field, the ready phrases (participation,
 * result, sequence) in the chosen register, each with a copy button, and the citation line with the current edition. Everything is computed in the browser from the
 * city's own shard; nothing is sent anywhere and no analytics is called (this file does not import it).
 */
export interface CreatorGuideProps {
  base: string
  origin: string
  /** `26/10/2026`: the current edition's label. */
  edition: string
  /** The static sections between the phrases and the citation (the "Não diga" list and the rules), as the frame orders them. */
  children?: ReactNode
}

const say = (key: string, params: Record<string, string | number> = {}) => message(DEFAULT_VOICE, key as MessageKey, params)

export default function CreatorGuide({ base, origin, edition, children }: CreatorGuideProps) {
  const [place, setPlace] = useState<PickedPlace>()
  const [register, setRegister] = useState<Register>('standard')
  const [status, setStatus] = useState('')
  const code = place ? `${place.uf}/${place.slug}` : undefined
  const shards = useCityShards(base, code ? [code] : [])
  const shard = code ? shards[code] : undefined

  useEffect(() => {
    const [first] = parsePlaces(location.search)
    if (first) setPlace({ uf: first.uf, slug: first.slug, nome: first.slug })
  }, [])

  const pick = (p: PickedPlace) => {
    setPlace(p)
    setStatus('')
    try {
      history.replaceState(null, '', `?mora=${p.uf}/${p.slug}`)
    } catch {
      /* the address stays as it is */
    }
  }
  const copy = (text: string) => {
    void navigator.clipboard.writeText(text).then(
      () => setStatus(say('guide.copied')),
      () => setStatus(say('guide.copy.failed')),
    )
  }

  const loaded = shard && shard !== 'loading' && shard !== 'failed' ? shard : undefined
  const out = loaded ? creatorPhrases(loaded, register) : undefined
  const address = loaded ? shortAddress(cityUrl(origin, base, loaded.city.uf, loaded.city.slug)) : undefined
  const citation = say('guide.cite.line', { edition }) + (address ? say('guide.cite.place', { address }) : '')

  return (
    <div data-guide>
      <div className="mt-4 flex items-center justify-between gap-3">
        <h2 className="font-serif text-step-3 font-normal">{say('guide.can.title')}</h2>
        <button type="button" role="switch" aria-checked={register === 'plain'} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-[var(--c-paper-2)] px-3 text-step-1" onClick={() => setRegister(register === 'plain' ? 'standard' : 'plain')} data-register-toggle>
          <span aria-hidden="true" className={`size-4 rounded-full ${register === 'plain' ? 'bg-primary' : 'bg-[#a8a090]'}`} />
          {say('guide.plain.toggle')}
        </button>
      </div>
      <div className="mt-2">
        <PlacePicker base={base} label={say('guide.picker')} value={place ? { ...place, nome: loaded ? displayName(loaded.city.nome) : place.nome } : undefined} onPick={pick} />
      </div>
      {!place && <p className="mt-2 text-step-2 text-muted-foreground" data-placeholder>{say('guide.choose')}</p>}
      {place && shard === 'loading' && <p className="mt-2 text-step-2" role="status">{say('guide.loading')}</p>}
      {shard === 'failed' && <p className="mt-2 text-step-2" role="status">{say('guide.failed')}</p>}
      {out?.noData && <p className="mt-2 text-step-2" data-nodata>{out.noData}</p>}
      <ul className="mt-2 grid gap-2">
        {out?.phrases.map((p) => (
          <li key={p.kind} className="flex items-center justify-between gap-3 rounded-md border border-border bg-[var(--c-paper-2)] p-3" data-phrase={p.kind}>
            <div>
              <p className="text-step-1 uppercase text-muted-foreground">{say(`guide.kind.${p.kind}`)}</p>
              <p className="mt-1 font-serif text-step-2" data-phrase-text>{p.text}</p>
            </div>
            <button type="button" className="min-h-11 shrink-0 rounded-md bg-primary px-4 text-step-2 font-bold text-primary-foreground" onClick={() => copy(p.text)} data-copy={p.kind}>
              {say('guide.copy')}
            </button>
          </li>
        ))}
      </ul>
      <p className="min-h-6 text-step-1 text-muted-foreground" role="status" aria-live="polite" data-status>{status}</p>
      {children}
      <h2 className="mt-4 border-t border-border pt-3 font-serif text-step-3 font-normal">{say('guide.cite.title')}</h2>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-border bg-[var(--c-paper-2)] p-3">
        <p className="font-mono text-step-1 wrap-anywhere" data-citation>{citation}</p>
        <button type="button" className="min-h-11 shrink-0 rounded-md bg-primary px-4 text-step-2 font-bold text-primary-foreground" onClick={() => copy(citation)} data-copy="citation">
          {say('guide.copy')}
        </button>
      </div>
    </div>
  )
}
