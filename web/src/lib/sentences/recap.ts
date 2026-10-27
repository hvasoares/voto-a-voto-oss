/**
 * The words of the state recap (#28), PURE: the catalog's `recap.*` filled from a `Recap`. The headline reads the bars aloud, the
 * same words for both sides ("PT 32,0% e Bolsonaro 68,0%"): it names no winner and gives no reason. The same sentence is the
 * picture's text alternative and the share text (plus the link).
 */
import { span, type Recap } from '../recap'
import { DEFAULT_LOCALE, DEFAULT_REGISTER, message as say, type Locale, type MessageKey, type Register } from './catalog'

export interface RecapPlace {
  /** "São Paulo". */
  stateName: string
  locale?: Locale
  register?: Register
}

const voiceOf = (p: RecapPlace) => ({ locale: p.locale ?? DEFAULT_LOCALE, register: p.register ?? DEFAULT_REGISTER })

export function recapHeadline(recap: Recap, place: RecapPlace): string {
  const message = (key: MessageKey, params: Record<string, string | number> = {}) => say(voiceOf(place), key, params)
  const rows = recap.rows.filter((r) => r.status === 'data')
  if (!rows.length) return message('recap.noData', { state: place.stateName })
  const parts = rows.map((r) => message('recap.part', { ano: r.ano, a: r.left!.label, pa: r.left!.pct, b: r.rival!.label, pb: r.rival!.pct }))
  return `${message('recap.lead', { state: place.stateName })}${parts.join('; ')}.`
}

/** "São Paulo · Presidente, 2º turno, 2018 a 2026". */
export function recapSubtitle(recap: Recap, place: RecapPlace): string {
  const message = (key: MessageKey, params: Record<string, string | number> = {}) => say(voiceOf(place), key, params)
  const s = span(recap)
  return message('recap.sub', { state: place.stateName, years: s ? message('recap.cycles', { first: s.first, last: s.last }) : '' })
}

/** The line under a row's year: where the series starts, or the change in points against the previous cycle. */
export function recapChange(row: Recap['rows'][number], place: Pick<RecapPlace, 'locale' | 'register'> = {}): string {
  const message = (key: MessageKey, params: Record<string, string | number> = {}) => say(voiceOf({ stateName: '', ...place }), key, params)
  if (row.status !== 'data') return message('recap.rowNoData')
  return row.changePp === undefined ? message('recap.start') : message('recap.change', { pp: row.changePp, ano: row.changeVs! })
}

export const recapBase = (place: Pick<RecapPlace, 'locale' | 'register'> = {}) => say(voiceOf({ stateName: '', ...place }), 'recap.base')
export const recapTitle = (place: Pick<RecapPlace, 'locale' | 'register'> = {}) => say(voiceOf({ stateName: '', ...place }), 'recap.title')
