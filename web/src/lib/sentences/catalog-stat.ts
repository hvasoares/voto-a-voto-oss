/**
 * The sentences of the one-stat card (#25): the line printed under ONE number, per measure. The number is printed
 * apart; the line never says why. Kept out of `catalog.ts` like `catalog-duel.ts`: only `stat.ts` (and who imports it)
 * loads this file, and importing it registers the sentences in `CATALOG`. Same rules as the catalog: data, templates
 * with `{name}` slots, both registers, reviewed like code.
 */
import { registerSentences, type Key } from './catalog'

export const STAT_KEYS = ['stat.nonVoters', 'stat.margin.one', 'stat.margin.other', 'stat.turnout', 'stat.unavailable'] as const satisfies readonly Key[]

export const STAT_STANDARD: Record<(typeof STAT_KEYS)[number], string> = {
  'stat.nonVoters': 'do eleitorado de {city} não votou no {turno}º turno de {ano}.',
  'stat.margin.one': 'voto separou os dois candidatos mais votados em {city}, no {turno}º turno de {ano}.',
  'stat.margin.other': 'votos separaram os dois candidatos mais votados em {city}, no {turno}º turno de {ano}.',
  'stat.turnout': 'do eleitorado de {city} compareceu no {turno}º turno de {ano}.',
  'stat.unavailable': 'Esta medida não se aplica a {city} no {turno}º turno de {ano}.',
}

export const STAT_PLAIN: Record<(typeof STAT_KEYS)[number], string> = {
  'stat.nonVoters': 'das pessoas que podiam votar em {city} não votaram no {turno}º turno de {ano}.',
  'stat.margin.one': 'voto de diferença entre os dois candidatos mais votados em {city}, no {turno}º turno de {ano}.',
  'stat.margin.other': 'votos de diferença entre os dois candidatos mais votados em {city}, no {turno}º turno de {ano}.',
  'stat.turnout': 'das pessoas que podiam votar em {city} foram votar no {turno}º turno de {ano}.',
  'stat.unavailable': 'Não há esse número para {city} no {turno}º turno de {ano}.',
}

registerSentences('pt-BR', 'standard', STAT_STANDARD)
registerSentences('pt-BR', 'plain', STAT_PLAIN)
