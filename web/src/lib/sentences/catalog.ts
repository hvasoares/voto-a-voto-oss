/**
 * The message catalog: every sentence the city card, the share text and the picture's text alternative say lives HERE
 * as data (templates with `{name}` slots), reviewed like code. No CMS, no free text elsewhere.
 *
 * - `KEYS` is the one list of catalog keys. A key ending in `.one`/`.other` is a plural pair, picked with the locale's
 *   `Intl.PluralRules`.
 * - Two registers: `standard` and `plain` ("linguagem simples": short sentences, one idea each, no jargon). Portuguese
 *   (pt-BR) is complete in both (a missing key is a type error; only the `STANDARD_ONLY_KEYS` have no plain version). English and
 *   Spanish are skeletons: they translate what they have and everything else falls back (see `template`) without an error.
 * - Wording rule: say what the data shows, with the same words and treatment for every candidate; never why people
 *   voted as they did, never a winner label.
 */
import { DEFAULT_REGISTER, REGISTERS, type Register } from './register'

export const KEYS = [
  /** Shown instead of a sentence when the city has no data in the cycle. */
  'noData',
  /** The small line under the headline: where the sentence comes from. */
  'headline.note',
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
  /** The register switch of the city card: its group label and the two choices. */
  'register.label',
  'register.standard',
  'register.plain',
  /** The meta description of a city page (what a link preview says): standard register only. */
  'preview.fixture',
  'preview.intro',
  'preview.noResult',
  'preview.noElectorate',
  'preview.noValidVotes',
  'preview.default',
] as const

export type Key = (typeof KEYS)[number]
export type Locale = 'pt-BR' | 'en' | 'es'
export const DEFAULT_LOCALE: Locale = 'pt-BR'
export { DEFAULT_REGISTER, REGISTERS, type Register }

/** Keys that read the same in both registers, so they have no plain version: the register switch's own labels and the page-head description for crawlers. */
export const STANDARD_ONLY_KEYS = ['register.label', 'register.standard', 'register.plain', 'preview.fixture', 'preview.intro', 'preview.noResult', 'preview.noElectorate', 'preview.noValidVotes', 'preview.default'] as const satisfies readonly Key[]
type StandardOnly = (typeof STANDARD_ONLY_KEYS)[number]

const ptBR: Record<Key, string> = {
  noData: 'Sem dados nesse ciclo.',
  'headline.note': 'Frase gerada dos números · também o texto alternativo',
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
  'register.label': 'Estilo da frase',
  'register.standard': 'Padrão',
  'register.plain': 'Linguagem simples',
  'preview.fixture': 'Dados fictícios (EXEMPLO). ',
  'preview.intro': 'Resultado de {place}',
  'preview.noResult': '{note}{intro}: o arquivo do TSE não traz votação para os ciclos do site.',
  'preview.noElectorate': '{note}{intro}, {ano}, {turno}º turno: sem eleitores aptos registrados.',
  'preview.noValidVotes': '{note}{intro}, {ano}, {turno}º turno: nenhum voto válido; {notVoted}% do eleitorado não votou.',
  'preview.default': '{note}{intro}, {ano}, {turno}º turno: votaram {voted}% do eleitorado e {leader} recebeu {pct}% dos votos válidos.',
}

/**
 * Linguagem simples: short sentences, one idea each, everyday words ("pessoas que podiam votar", not "eleitorado"),
 * the same figures and the same neutrality as the standard register. The slots are the same as the standard template's.
 */
const ptBRPlain: Record<Exclude<Key, StandardOnly>, string> = {
  noData: 'Não temos dados dessa eleição para este lugar.',
  'headline.note': 'Frase feita com os números desta página · também é a descrição do gráfico',
  'lead.city': 'Em {city}, no {turno}º turno de {ano}, ',
  'lead.overseas': 'No exterior, em {city}, no {turno}º turno de {ano}, ',
  noElectorate: '{lead}não havia pessoas registradas para votar.',
  'nobodyTurnedOut.one': '{lead}a única pessoa que podia votar não foi votar.',
  'nobodyTurnedOut.other': '{lead}nenhuma das {aptos} pessoas que podiam votar foi votar.',
  noValidVotes: '{lead}nenhum candidato recebeu votos. Todos os votos foram em branco ou anulados.',
  everyoneVoted: '{lead}todas as pessoas votaram em algum candidato.',
  'nonVoters.share': '{share} das pessoas que podiam votar não votaram',
  'nonVoters.count.one': '{n} de {aptos} pessoas que podiam votar não votou',
  'nonVoters.count.other': '{n} de {aptos} pessoas que podiam votar não votaram',
  'votes.count.one': '{n} voto',
  'votes.count.other': '{n} votos',
  'share.ofElectorate': 'votos de {share} das pessoas que podiam votar',
  'tie.two': '{lead}{a} e {b} ficaram empatados na frente. Cada um recebeu {each}. {nonVoters}.',
  'tie.many': '{lead}{count} candidatos ficaram empatados na frente. Cada um recebeu {each}. {nonVoters}.',
  single: '{lead}{nonVoters}. {name} recebeu todos os votos dados a candidatos: {value}.',
  vsLeader: '{lead}{nonVoters}. {phrase} {name}, o mais votado, recebeu: {value}.',
  vsRunnerUp: '{lead}{nonVoters}. {phrase} {who}{role} recebeu: {value}.',
  'phrase.above': 'Isso é mais do que',
  'phrase.slightly': 'Isso é um pouco mais do que',
  'phrase.equal': 'Isso é igual ao que',
  'phrase.almost': 'Isso é quase igual ao que',
  'phrase.below': 'Isso é menos do que',
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

type Messages = Partial<Record<Key, string>>
export const CATALOG: { [L in Locale]: { standard: Messages; plain: Messages } } = {
  'pt-BR': { standard: ptBR, plain: ptBRPlain },
  en: { standard: en, plain: {} },
  es: { standard: es, plain: {} },
}

/** What a sentence is said in: a language and a register. */
export interface Voice {
  locale: Locale
  register: Register
}
export const DEFAULT_VOICE: Voice = { locale: DEFAULT_LOCALE, register: DEFAULT_REGISTER }

/**
 * The template of `key` for `voice`. A missing translation never errors: the voice's own register, then the same locale's
 * standard register, then Portuguese in the asked register, and last standard Portuguese (which is always complete).
 */
export function template({ locale, register }: Voice, key: Key): string {
  return CATALOG[locale]?.[register]?.[key] ?? CATALOG[locale]?.standard?.[key] ?? CATALOG['pt-BR'][register][key] ?? ptBR[key]
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

/** What `message` takes: a key, or the base of a plural pair (then `count` picks `.one` or `.other`). */
export type MessageKey = Exclude<Key, `${string}.one` | `${string}.other`> | PluralKey

/** The sentence of `key` for `voice` with its slots filled; a plural key takes `count`. */
export function message(voice: Voice, key: MessageKey, params: Record<string, string | number> = {}, count?: number): string {
  const k = (count === undefined ? key : `${key}.${pluralCategory(voice.locale, count)}`) as Key
  return fill(template(voice, k), params)
}
