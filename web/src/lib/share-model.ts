/**
 * Everything the sheet needs for ONE view of ONE city, pure: the picture, the text, the address and the file name.
 * Used by the Astro page (build time, pre-rendered) and by the ShareSheet island (browser). No HTML.
 */
import type { City } from '@/data'
import { displayName, ufLabel } from '@/shared/city-search'
import type { CityResult } from '@/shared/city-model'
import { shareCardSvg, withAlt } from './share-card'
import { annotateSvg, type CardKeys } from './card-keys'
import { DEFAULT_LOCALE, REGISTERS, type Locale, type Register } from './sentences/catalog'
import { headline } from './sentences/headline'
import { shareText, shortAddress } from './share-text'
import { cityUrl } from './share-url'

export interface ShareContent {
  /** The picture, with the standard sentence as its `<title>`; `pictureSvg(content, register)` swaps the sentence. */
  svg: string
  /** The standard sentence and message (the headline + link); see `variants` for each register. */
  text: string
  /** The headline sentence (the picture's text alternative) and the message text, per register. */
  variants: Record<Register, { alt: string; text: string }>
  url: string
  /** `votoavoto.exemplo.br/rj/cidade-exemplo`: the only address the picture carries. */
  address: string
  /** `voto-a-voto-rj-cidade-exemplo-2026-turno-2.png` (ASCII: slugs are). */
  filename: string
  /** What the picture carries to be reopened (#38); present when the options named an edition. */
  keys?: CardKeys
}

export interface ShareContentOptions {
  origin: string
  base: string
  /** Fictitious data (manifest.fixture). */
  fixture: boolean
  /** The id of the data edition the card shows: given, the picture is the self-describing one (#38: keys, description, language). */
  edition?: string
  /** The language of the card's words; Portuguese by default. */
  locale?: Locale
  /** Display size of the picture (the drawing stays the viewBox of the share card); the card size when omitted. */
  width?: number
  height?: number
}

export function shareContent(result: CityResult, city: Pick<City, 'uf' | 'slug' | 'nome'>, o: ShareContentOptions): ShareContent {
  const url = cityUrl(o.origin, o.base, city.uf, city.slug)
  const address = shortAddress(url)
  const names = { cityName: displayName(city.nome), ufLabel: ufLabel(city.uf) }
  const overseas = city.uf === 'zz'
  const locale = o.locale ?? DEFAULT_LOCALE
  const variants = Object.fromEntries(
    REGISTERS.map((register) => [register, { alt: headline(result, { cityName: names.cityName, overseas, register, locale }), text: shareText(result, { cityName: names.cityName, overseas, url, register, locale }) }]),
  ) as ShareContent['variants']
  const alt = variants.standard.alt
  const keys: CardKeys | undefined = o.edition ? { view: `city:${result.ano}-${result.turno}`, places: [`${city.uf}/${city.slug}`], edition: o.edition, lang: locale } : undefined
  const drawn = shareCardSvg(result, { ...names, alt, address, fixture: o.fixture, width: o.width, height: o.height, locale })
  return {
    svg: keys ? annotateSvg(drawn, keys, { address }) : drawn,
    keys,
    text: variants.standard.text,
    variants,
    url,
    address,
    filename: `voto-a-voto-${city.uf}-${city.slug}-${result.ano}-turno-${result.turno}.png`,
  }
}
/** The picture of `content` with the text alternative of the chosen register. */
export function pictureSvg(content: ShareContent, register: Register): string {
  return withAlt(content.svg, content.variants[register].alt)
}
