/**
 * The one-stat card's words (#25), PURE: ONE number and ONE line for a measure of a city's round, from the numbers of a
 * CityResult and the catalog (`stat.*`). Same family as `headline()`: the same rounding of percentages, the same
 * "no cause, no winner" rule, the same function for the card in the browser and for any build-time use.
 *
 *   nonVoters  the share of the electorate that did not vote        "30%" + "do eleitorado de X não votou no 1º turno de 2026."
 *   margin     the votes between the two most voted candidates       "1.234" + "votos separaram os dois candidatos mais votados em X, ..."
 *   turnout    the share of the electorate that turned out           "70%" + "do eleitorado de X compareceu no ..."
 *
 * A measure that does not exist for the round (no electorate, no pair of candidates with votes) says so in `stat.unavailable`
 * and carries no number: the picture is never drawn with a made-up zero.
 */
import type { CityResult } from '@/shared/city-model'
import { DEFAULT_LOCALE, DEFAULT_REGISTER, message as say, type MessageKey } from './catalog'
import type { Place } from './headline'
import { marginVotes } from './margin'

export const MEASURES = ['nonVoters', 'margin', 'turnout'] as const
export type Measure = (typeof MEASURES)[number]

export interface Stat {
  measure: Measure
  /** "30%" or "1.234"; undefined when the measure does not exist for this round. */
  number: string | undefined
  /** The sentence under the number (or the `stat.unavailable` sentence). */
  line: string
  /** The card's text alternative: the number and the line read as one sentence. */
  alt: string
}

const round1 = (x: number) => Math.round(x * 10) / 10

export function statCard(r: CityResult | undefined, measure: Measure, place: Place & { ano?: number; turno?: number }): Stat {
  const locale = place.locale ?? DEFAULT_LOCALE
  const voice = { locale, register: place.register ?? DEFAULT_REGISTER }
  const message = (key: MessageKey, params?: Record<string, string | number>, count?: number) => say(voice, key, params, count)
  const where = { city: place.cityName, turno: r?.turno ?? place.turno ?? 2, ano: r?.ano ?? place.ano ?? 2026 }
  const none = (): Stat => {
    const line = message('stat.unavailable', where)
    return { measure, number: undefined, line, alt: line }
  }
  if (!r || r.aptos <= 0) return none()

  const pct = (x: number) => {
    const v = round1(x)
    if (x > 0 && v === 0) return message('pct.lessThan', { pct: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(0.001) })
    if (x < 100 && v >= 100) return message('pct.moreThan', { pct: new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(0.999) })
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(v / 100)
  }
  let number: string
  let line: string
  if (measure === 'margin') {
    const margin = marginVotes(r)
    if (margin === undefined) return none()
    number = new Intl.NumberFormat(locale).format(margin)
    line = message('stat.margin', where, margin)
  } else if (measure === 'turnout') {
    number = pct((r.comparecimento / r.aptos) * 100)
    line = message('stat.turnout', where)
  } else {
    number = pct(r.notVotedShare)
    line = message('stat.nonVoters', where)
  }
  return { measure, number, line, alt: `${number} ${line}` }
}
