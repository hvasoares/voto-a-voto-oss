/**
 * The margin line of a city card (#26), PURE: how many votes would have changed the result (the votes between the two
 * most voted candidates) and how many times that number fits in the people who did not vote. Plain arithmetic from the
 * numbers of one CityResult; it says nothing about why anyone voted or stayed home. The wording is in the catalog
 * (`margin.*`); this file decides WHICH sentence applies:
 *   no valid votes, or fewer than two candidates with votes -> no line (nothing could have turned)
 *   a tie for the lead (margin 0)                           -> `margin.tie`
 *   margin larger than the non-voters                       -> gap + `margin.exceeds`
 *   nobody stayed home                                      -> gap + `margin.end`
 *   otherwise                                               -> gap + `margin.fits` (whole times: the margin fits N times)
 */
import type { CityResult } from '@/shared/city-model'
import { DEFAULT_LOCALE, template } from './catalog'
import { drawPhrase, phrase, type PhrasePart } from './phrase'
import './catalog-margin'
import { formatInteger } from '../number-format'
import { voiceOf } from './voice'
import type { Place } from './headline'

/** The votes between the first and the second most voted candidate of the round; undefined when there is no pair to compare. */
export function marginVotes(r: CityResult): number | undefined {
  const [first, second] = r.ranking
  if (r.validos <= 0 || !first || !second || second.votos <= 0) return undefined
  return first.votos - second.votos
}

/** The margin line as data (private#213); `marginLine` is this, drawn. */
export function marginSentence(r: CityResult | undefined, place: Omit<Place, 'register'>): PhrasePart | undefined {
  if (!r) return undefined
  const margin = marginVotes(r)
  if (margin === undefined) return undefined
  const locale = place.locale ?? DEFAULT_LOCALE
  if (margin === 0) return phrase('margin.tie')
  const int = (n: number) => formatInteger(n, locale)
  const gap = phrase('margin.gap', { n: int(margin) }, margin)
  if (r.naoVotaram <= 0) return [gap, phrase('margin.end')]
  const m = int(r.naoVotaram)
  if (margin > r.naoVotaram) return [gap, phrase('margin.exceeds', { m })]
  const times = Math.floor(r.naoVotaram / margin)
  return [gap, phrase('margin.fits', { times: int(times), m }, times)]
}

export function marginLine(r: CityResult | undefined, place: Place): string | undefined {
  const sentence = marginSentence(r, place)
  return sentence === undefined ? undefined : drawPhrase(sentence, voiceOf(place), template)
}
