/**
 * Everything the Meu Brasil card needs for one set of places, pure: the self-describing picture (#38), the headline and the share
 * text in both registers, the address, the page link with the places in it, and the file name. The page's island (browser) and the
 * reopening of a dropped file both use it, so a card and its recomputation are the same picture.
 */
import { annotateSvg, type CardKeys } from './card-keys'
import { meuBrasilCardSvg } from './meu-brasil-card'
import { placeCodes, placesQuery, type PlaceCard } from './meu-brasil'
import { meuBrasilHeadline } from './sentences/meu-brasil'
import { DEFAULT_LOCALE, REGISTERS, type Locale, type Register } from './sentences/catalog'
import { shortAddress } from './share-text'

export interface MeuBrasilContent {
  svg: string
  height: number
  variants: Record<Register, { alt: string; text: string }>
  /** The card's own address, with the places in it: what "Compartilhar" sends and the QR of the sticker encodes. */
  url: string
  /** `votoavoto.exemplo.br/meu-brasil`: what the picture prints (no query: it must stay short). */
  address: string
  filename: string
  keys?: CardKeys
}

export interface MeuBrasilContentOptions {
  origin: string
  base: string
  fixture: boolean
  edition?: string
  locale?: Locale
}

export const meuBrasilPageUrl = (origin: string, base: string) => `${origin}${base.endsWith('/') ? base : `${base}/`}meu-brasil/`

export function meuBrasilContent(cards: readonly PlaceCard[], o: MeuBrasilContentOptions): MeuBrasilContent {
  const locale = o.locale ?? DEFAULT_LOCALE
  const refs = cards.map((c) => c.ref)
  const url = `${meuBrasilPageUrl(o.origin, o.base)}${placesQuery(refs)}`
  const address = shortAddress(meuBrasilPageUrl(o.origin, o.base))
  const variants = Object.fromEntries(
    REGISTERS.map((register) => {
      const alt = meuBrasilHeadline(cards, { locale, register })
      return [register, { alt, text: `${alt} ${url}` }]
    }),
  ) as MeuBrasilContent['variants']
  const drawn = meuBrasilCardSvg(cards, { address, fixture: o.fixture, locale, alt: variants.standard.alt })
  const keys: CardKeys | undefined = o.edition && cards.length ? { view: 'meu-brasil', places: placeCodes(refs), edition: o.edition, lang: locale } : undefined
  return { svg: keys ? annotateSvg(drawn.svg, keys, { address }) : drawn.svg, height: drawn.height, variants, url, address, filename: 'voto-a-voto-meu-brasil.png', keys }
}
