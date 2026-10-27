/**
 * The text that goes with the picture, PURE: the card's headline sentence (`headline()`, the catalog's wording, the same
 * sentence as the picture's text alternative) followed by the link. Same treatment for every candidate.
 *
 *   {headline} {url}
 */
import type { CityResult } from '@/shared/city-model'
import { headline } from './sentences/headline'

export interface ShareTextOptions {
  cityName: string
  /** Overseas posts read "No exterior, em ...". */
  overseas?: boolean
  /** The city page's full address, scheme included (it is what the recipient taps). */
  url: string
}

/** `https://votoavoto.exemplo.br/rj/cidade-exemplo/` -> `votoavoto.exemplo.br/rj/cidade-exemplo` (what the picture shows). */
export function shortAddress(url: string): string {
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '')
}

export function shareText(r: CityResult, o: ShareTextOptions): string {
  return `${headline(r, { cityName: o.cityName, overseas: o.overseas })} ${o.url}`
}
