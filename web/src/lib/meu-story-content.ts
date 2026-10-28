/**
 * Everything the Meu Brasil story needs for one set of places, PURE: for each card its picture (the vertical card of #47), text alternative, message text (which ends with the link to the card's position,
 * places included), the short address the picture prints (`votoavoto.exemplo.br/meu-brasil/historia#2`, no query: it must stay short), file name, caption and the address of the page that explains its number.
 * Used in the browser by the story page, from the shards of the picked places.
 */
import { shortAddress } from './share-text'
import { storyCardSvg } from './story-card'
import { storySay } from './story'
import { meuStoryPlan, meuStoryText, type MeuStoryInput } from './meu-story'
import { placesQuery, type PlaceRef } from './meu-brasil'
import { DEFAULT_LOCALE, type Locale } from './sentences/catalog'

export interface MeuStoryCard {
  n: number
  kind: string
  surprising: boolean
  svg: string
  alt: string
  /** The message: the alternative and the link to this card. */
  text: string
  /** `https://votoavoto.exemplo.br/meu-brasil/historia/?mora=rj/x#2` */
  url: string
  address: string
  filename: string
  caption: string
  /** The page that explains the number, relative to the site root (`fato/rj/x/2026-2/`), and the fragment. */
  calc?: { path: string; anchor: string }
}

export interface MeuStoryOptions {
  origin: string
  base: string
  fixture: boolean
  locale?: Locale
}

export const meuStoryPageUrl = (origin: string, base: string) => `${origin}${base.endsWith('/') ? base : `${base}/`}meu-brasil/historia/`

/** The cards of the places, or [] when there is no place. A sequence under six cards (a place with one cycle) is returned as it is: it says what it has. */
export function meuStoryContent(input: MeuStoryInput, refs: readonly PlaceRef[], o: MeuStoryOptions): MeuStoryCard[] {
  const locale = o.locale ?? DEFAULT_LOCALE
  const plan = meuStoryPlan(input)
  const page = meuStoryPageUrl(o.origin, o.base)
  const query = placesQuery(refs)
  const total = plan.length
  return plan.map((step, i) => {
    const n = i + 1
    const t = meuStoryText(step, input, total, { locale })
    const alt = [t.big, t.sentence].join(' ')
    const address = `${shortAddress(page)}#${n}`
    const url = `${page}${query}#${n}`
    return {
      n,
      kind: step.kind,
      surprising: !!step.surprising,
      svg: storyCardSvg({ kicker: t.kicker, big: t.big, sentence: t.sentence, address, alt, fixture: o.fixture, locale }),
      alt,
      text: `${alt} ${url}`,
      url,
      address,
      filename: `voto-a-voto-meu-brasil-historia-${n}.png`,
      caption: storySay(step.surprising ? 'story.caption.surprising' : 'story.caption', { locale }, { n, total }),
      calc: t.calc,
    }
  })
}
