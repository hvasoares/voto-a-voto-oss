/**
 * Everything the share of "Brasil e regiões" needs, pure: the self-describing picture (#38), the sentence in both registers, the address and the file name.
 * Used at build time by the page of the share sheet (pre-rendered). The text alternative states the numbers; the share text is the national headline and the link.
 */
import type { BrasilView } from './brasil'
import { annotateSvg, type CardKeys } from './card-keys'
import { brasilCardSvg } from './brasil-card'
import { brasilAlt, brasilHeadline } from './sentences/brasil'
import { DEFAULT_LOCALE, REGISTERS, type Locale, type Register } from './sentences/catalog'
import { shortAddress } from './share-text'

export interface BrasilContent {
  svg: string
  height: number
  variants: Record<Register, { alt: string; text: string }>
  url: string
  address: string
  filename: string
  keys?: CardKeys
}

export interface BrasilContentOptions {
  origin: string
  base: string
  fixture: boolean
  edition?: string
  locale?: Locale
}

/** `https://votoavoto.exemplo.br/brasil/` */
export function brasilUrl(origin: string, base: string): string {
  const b = base.endsWith('/') ? base : `${base}/`
  return `${origin}${b.startsWith('/') ? b : `/${b}`}brasil/`
}

export function brasilContent(view: BrasilView, o: BrasilContentOptions): BrasilContent {
  const locale = o.locale ?? DEFAULT_LOCALE
  const url = brasilUrl(o.origin, o.base)
  const address = shortAddress(url)
  const variants = Object.fromEntries(
    REGISTERS.map((register) => [register, { alt: brasilAlt(view, { locale, register }), text: `${brasilHeadline(view, { locale, register })} ${url}` }]),
  ) as BrasilContent['variants']
  const drawn = brasilCardSvg(view, { address, fixture: o.fixture, locale, alt: variants.standard.alt })
  const keys: CardKeys | undefined = o.edition ? { view: 'brasil', places: [], edition: o.edition, lang: locale } : undefined
  return { svg: keys ? annotateSvg(drawn.svg, keys, { address }) : drawn.svg, height: drawn.height, variants, url, address, filename: `voto-a-voto-brasil-${view.ano}-turno-${view.turno}.png`, keys }
}
