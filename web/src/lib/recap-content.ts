/**
 * Everything the state recap page needs for ONE state, pure: the self-describing picture (#38), the headline and the share
 * text in both registers, the address and the file name. Used at build time by the page (pre-rendered).
 */
import { annotateSvg, type CardKeys } from './card-keys'
import type { Recap } from './recap'
import { recapCardSvg } from './recap-card'
import { recapHeadline } from './sentences/recap'
import { DEFAULT_LOCALE, REGISTERS, type Locale, type Register } from './sentences/catalog'
import { shortAddress } from './share-text'

export interface RecapContent {
  svg: string
  height: number
  variants: Record<Register, { alt: string; text: string }>
  url: string
  address: string
  filename: string
  keys?: CardKeys
}

export interface RecapContentOptions {
  stateName: string
  origin: string
  base: string
  fixture: boolean
  edition?: string
  locale?: Locale
}

/** `https://votoavoto.exemplo.br/sp/resumo/` */
export function recapUrl(origin: string, base: string, uf: string): string {
  const b = base.endsWith('/') ? base : `${base}/`
  return `${origin}${b.startsWith('/') ? b : `/${b}`}${uf}/resumo/`
}

export function recapContent(recap: Recap, o: RecapContentOptions): RecapContent {
  const locale = o.locale ?? DEFAULT_LOCALE
  const url = recapUrl(o.origin, o.base, recap.uf)
  const address = shortAddress(url)
  const variants = Object.fromEntries(
    REGISTERS.map((register) => {
      const alt = recapHeadline(recap, { stateName: o.stateName, locale, register })
      return [register, { alt, text: `${alt} ${url}` }]
    }),
  ) as RecapContent['variants']
  const drawn = recapCardSvg(recap, { stateName: o.stateName, address, fixture: o.fixture, locale, alt: variants.standard.alt })
  const keys: CardKeys | undefined = o.edition ? { view: 'recap', places: [recap.uf], edition: o.edition, lang: locale } : undefined
  return { svg: keys ? annotateSvg(drawn.svg, keys, { address }) : drawn.svg, height: drawn.height, variants, url, address, filename: `voto-a-voto-${recap.uf}-resumo-do-estado.png`, keys }
}
