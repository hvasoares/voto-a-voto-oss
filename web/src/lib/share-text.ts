/**
 * The text that goes with the picture, PURE: the card's headline sentence (`headline()`, the catalog's wording, the same
 * sentence as the picture's text alternative) followed by the link. Same treatment for every candidate.
 *
 *   {headline} {margin line} {url}
 *
 * The margin line (#26: the votes that would have changed the result, plain arithmetic) is left out when the round has none.
 */
import type { CityResult } from '@/shared/city-model'
import type { Locale, Register } from './sentences/catalog'
import { headline } from './sentences/headline'
import { marginLine } from './sentences/margin'

export interface ShareTextOptions {
  cityName: string
  /** Overseas posts read "No exterior, em ...". */
  overseas?: boolean
  /** The language of the words (Portuguese by default). */
  locale?: Locale
  /** `standard` (default) or `plain` (linguagem simples). */
  register?: Register
  /** The city page's full address, scheme included (it is what the recipient taps). */
  url: string
}

/** `https://votoavoto.exemplo.br/rj/cidade-exemplo/` -> `votoavoto.exemplo.br/rj/cidade-exemplo` (what the picture shows). */
export function shortAddress(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '')
}

export function shareText(r: CityResult, o: ShareTextOptions): string {
  const place = { cityName: o.cityName, overseas: o.overseas, register: o.register, locale: o.locale }
  return [headline(r, place), marginLine(r, place), o.url].filter(Boolean).join(' ')
}
