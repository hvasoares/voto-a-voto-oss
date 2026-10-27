/**
 * The message catalog: every sentence the city card, the share text and the picture's text alternative say lives HERE
 * as data (templates with `{name}` slots), reviewed like code. No CMS, no free text elsewhere.
 *
 * - `KEYS` is the one list of catalog keys. A key ending in `.one`/`.other` is a plural pair, picked with the locale's
 *   `Intl.PluralRules`.
 * - Portuguese (pt-BR) is complete (`Record<Key, string>`: a missing key is a type error). English and Spanish are
 *   skeletons: they translate what they have and everything else falls back to Portuguese without an error.
 * - Wording rule: say what the data shows, with the same words and treatment for every candidate; never why people
 *   voted as they did, never a winner label.
 */
export const KEYS = [
  /** Shown instead of a sentence when the city has no data in the cycle. */
  'noData',
  /** The start of every sentence: where and when. */
  'lead.city',
  'lead.overseas',
  'noElectorate',
  'nobodyTurnedOut.one',
  'nobodyTurnedOut.other',
  'noValidVotes',
  'everyoneVoted',
  /** The "who did not vote" clause, in shares of the electorate or (tiny electorates) in head counts. */
  'nonVoters.share',
  'nonVoters.count.one',
  'nonVoters.count.other',
  'votes.count.one',
  'votes.count.other',
  'share.ofElectorate',
  'tie.two',
  'tie.many',
  'single',
  'vsLeader',
  'vsRunnerUp',
  'phrase.above',
  'phrase.slightly',
  'phrase.equal',
  'phrase.almost',
  'phrase.below',
  'runnerUp.tied',
  'runnerUp.role',
  /** Pipe-separated words for the counts 0 to 10; a larger count is written in digits. */
  'numberWords',
  /** Put before a label that already says "Candidato X" (fixture, unnamed candidates). */
  'label.article',
  'pct.lessThan',
  'pct.moreThan',
] as const

export type Key = (typeof KEYS)[number]
export type Locale = 'pt-BR' | 'en' | 'es'
export const DEFAULT_LOCALE: Locale = 'pt-BR'

const ptBR: Record<Key, string> = {
  noData: 'Sem dados nesse ciclo.',
  'lead.city': 'Em {city}, no {turno}º turno de {ano}, ',
  'lead.overseas': 'No exterior, em {city}, no {turno}º turno de {ano}, ',
  noElectorate: '{lead}não há eleitores aptos registrados.',
  'nobodyTurnedOut.one': '{lead}o único eleitor apto não compareceu.',
  'nobodyTurnedOut.other': '{lead}nenhum dos {aptos} eleitores aptos compareceu.',
  noValidVotes: '{lead}nenhum candidato recebeu votos válidos: todos os votos foram em branco ou nulos.',
  everyoneVoted: '{lead}todo o eleitorado votou em algum candidato.',
  'nonVoters.share': '{share} do eleitorado não votou',
  'nonVoters.count.one': '{n} dos {aptos} eleitores não votou',
  'nonVoters.count.other': '{n} dos {aptos} eleitores não votaram',
  'votes.count.one': '{n} voto',
  'votes.count.other': '{n} votos',
  'share.ofElectorate': '{share} do eleitorado',
  'tie.two': '{lead}{a} e {b} empataram na frente, com {each} cada um; {nonVoters}.',
  'tie.many': '{lead}{count} candidatos empataram na frente, com {each} cada um; {nonVoters}.',
  single: '{lead}{nonVoters}; {name} recebeu todos os votos válidos ({value}).',
  vsLeader: '{lead}{nonVoters}, {phrase} o mais votado, {name}, recebeu ({value}).',
  vsRunnerUp: '{lead}{nonVoters}, {phrase} {who}{role} recebeu ({value}).',
  'phrase.above': 'mais do que',
  'phrase.slightly': 'um pouco mais do que',
  'phrase.equal': 'tanto quanto',
  'phrase.almost': 'quase tanto quanto',
  'phrase.below': 'menos do que',
  'runnerUp.tied': 'cada um dos {count} candidatos empatados em segundo lugar ({names})',
  'runnerUp.role': ', o segundo mais votado,',
  numberWords: 'zero|um|dois|três|quatro|cinco|seis|sete|oito|nove|dez',
  'label.article': 'o {name}',
  'pct.lessThan': 'menos de {pct}',
  'pct.moreThan': 'mais de {pct}',
}

/** Skeletons: a few keys each, to show the shape of a translation. Everything missing reads in Portuguese. */
const en: Partial<Record<Key, string>> = {
  noData: 'No data for this cycle.',
  'lead.city': 'In {city}, in round {turno} of {ano}, ',
  'lead.overseas': 'Abroad, in {city}, in round {turno} of {ano}, ',
  noElectorate: '{lead}there are no registered voters.',
}

const es: Partial<Record<Key, string>> = {
  noData: 'Sin datos en este ciclo.',
  'lead.city': 'En {city}, en la {turno}.ª vuelta de {ano}, ',
  'lead.overseas': 'En el exterior, en {city}, en la {turno}.ª vuelta de {ano}, ',
  noElectorate: '{lead}no hay electores registrados.',
}

export const CATALOG: { 'pt-BR': Record<Key, string>; en: Partial<Record<Key, string>>; es: Partial<Record<Key, string>> } = { 'pt-BR': ptBR, en, es }

/** The template of `key` in `locale`, or the Portuguese one when that locale has not translated it. */
export function template(locale: Locale, key: Key): string {
  return CATALOG[locale]?.[key] ?? ptBR[key]
}

/** Fills `{slot}`s; an unknown slot is left visible as `{slot}` so a typo cannot pass silently in a test. */
export function fill(tpl: string, params: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole))
}

/** The keys that come as a `.one` / `.other` pair. */
export type PluralKey = 'nobodyTurnedOut' | 'nonVoters.count' | 'votes.count'

/** Zero reads as "other" ("0 votos"), although CLDR files 0 under "one" for Portuguese. */
export function pluralCategory(locale: Locale, count: number): 'one' | 'other' {
  return count !== 0 && new Intl.PluralRules(locale).select(count) === 'one' ? 'one' : 'other'
}

/** The sentence of `key` in `locale` with its slots filled; a plural key takes `count` and picks `.one` or `.other`. */
export function message(locale: Locale, key: Exclude<Key, `${string}.one` | `${string}.other`>, params?: Record<string, string | number>): string
export function message(locale: Locale, key: PluralKey, params: Record<string, string | number>, count: number): string
export function message(locale: Locale, key: string, params: Record<string, string | number> = {}, count?: number): string {
  const k = (count === undefined ? key : `${key}.${pluralCategory(locale, count)}`) as Key
  return fill(template(locale, k), params)
}
