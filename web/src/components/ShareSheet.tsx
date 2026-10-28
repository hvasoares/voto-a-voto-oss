import { useEffect, useState } from 'react'
import { parseView, type View } from '@/slots/city/city-view'
import { cityShardResult, type CityShard } from '@/lib/city-shard'
import { pictureSvg, shareContent, type ShareContent } from '@/lib/share-model'
import { readRegister } from '@/lib/sentences/register-store'
import { browserStorage, readGuess, type Guess } from '@/lib/guess-store'
import { guessContent } from '@/lib/guess-card'
import type { Question } from '@/lib/question'
import { DEFAULT_LOCALE, message, type Register } from '@/lib/sentences/catalog'
import { SHARD_VERSION } from 'virtual:data-shards'
import ShareActions from './ShareActions'

const NOTE = 'O link vai no texto da mensagem; a imagem leva só o endereço curto, sem QR.'

/**
 * The share sheet's content (ticket #50): owns the picture and the message text around the ShareActions island
 * (which owns the Compartilhar / Baixar imagem / Copiar buttons and the status line). Pre-rendered for the city
 * card's default view; when the address asks another view of the card (?ciclo/?turno), the sheet fetches ONLY this
 * city's own shard (data/v…/city/<uf>/<slug>.json) and shows that view — nothing else is ever fetched. Server-rendered
 * markup keeps the picture and the text working without JavaScript (for the view that was pre-rendered).
 */
export interface ShareSheetProps {
  uf: string
  slug: string
  /** The view the page pre-rendered (the card's default). */
  view: View
  /** The content for that default view, null when the city has no data in it (the catalog's `noData`). */
  initial: ShareContent | null
  origin: string
  base: string
  /** Fictitious data (manifest.fixture). */
  fixture: boolean
  /** The id of the data edition: the picture carries it with its other keys (#38). */
  edition: string
  /** The question of the city and its name (#44, #45): with a guess kept in this browser the sheet shows the guess card instead of the bars. */
  question: Question
  cityName: string
}

export default function ShareSheet({ uf, slug, view, initial, origin, base, fixture, edition, question, cityName }: ShareSheetProps) {
  const [content, setContent] = useState<ShareContent | null>(initial)
  const [viewId, setViewId] = useState(`${view.ano}-${view.turno}`)
  // The register the reader chose on the city card (remembered in this browser only); the server renders the standard one.
  const [register, setRegister] = useState<Register>('standard')
  useEffect(() => setRegister(readRegister()), [])
  // The guess to the city's question (#44), read from this browser only. With none, the normal card; with one, the guess card (#45). Nothing is fetched for it.
  // `undefined` until the browser has been asked (the server cannot know), then the guess or `null`: the picture says so in `data-card`, so a test waits for the real answer.
  const [guess, setGuess] = useState<Guess | null>()
  useEffect(() => setGuess(readGuess(`${uf}/${slug}`, browserStorage()) ?? null), [uf, slug])

  useEffect(() => {
    // Only the build-time view is known up front; a query view is validated against CYCLES by parseView (whose
    // `has` stays "only the pre-rendered view here" until the shard arrives) and then fetched from this city's own shard.
    const asked = parseView(new URLSearchParams(location.search), (a, t) => a === view.ano && t === view.turno && !!initial)
    if (`${asked.ano}-${asked.turno}` === `${view.ano}-${view.turno}`) return
    let live = true
    void (async () => {
      const res = await fetch(`${base}data/v${SHARD_VERSION}/city/${uf}/${slug}.json`)
      if (!res.ok) throw new Error(`city shard: HTTP ${res.status}`)
      const shard = (await res.json()) as CityShard
      const result = cityShardResult(shard, asked.ano, asked.turno)
      if (!live) return
      setContent(result ? shareContent(result, shard.city, { origin, base, fixture, edition }) : null)
      setViewId(`${asked.ano}-${asked.turno}`)
    })().catch(() => {
      if (live) {
        setContent(initial)
        setViewId(`${view.ano}-${view.turno}`)
      }
    })
    return () => {
      live = false
    }
  }, [uf, slug, view.ano, view.turno, initial, origin, base, fixture, edition])

  const guessCard = guess ? guessContent(question, guess, { uf, slug, nome: cityName }, { origin, base, fixture }) : undefined
  const shown = guessCard ?? content

  // The sheet frame states the view it draws (the [data-view] and [data-filename] contract of the page).
  useEffect(() => {
    const sheet = document.querySelector('[data-share-sheet]')
    sheet?.setAttribute('data-view', viewId)
    sheet?.setAttribute('data-filename', shown?.filename ?? '')
  }, [viewId, shown?.filename])

  return (
    <>
      {shown ? (
        <div
          className="mx-auto mt-2 flex-none md:max-w-[240px] [&>svg]:mx-auto [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          data-share-picture
          data-card={guess === undefined ? 'pending' : guessCard ? 'guess' : 'city'}
          dangerouslySetInnerHTML={{ __html: pictureSvg(shown, register) }}
        />
      ) : (
        <p className="mt-4 text-step-2" data-nodata>
          {message({ locale: DEFAULT_LOCALE, register }, 'noData')}
        </p>
      )}
      {shown && <p className="mt-3 text-step-1 text-muted-foreground" data-note>{NOTE}</p>}
      {shown && <ShareActions text={shown.variants[register].text} svg={pictureSvg(shown, register)} filename={shown.filename} link={shown.url} />}
    </>
  )
}