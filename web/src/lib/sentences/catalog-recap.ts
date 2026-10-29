/**
 * The sentences of the state recap (#28): the three cycles of one state, the two runoff candidates' shares, the change
 * in points. Kept out of `catalog.ts` like `catalog-duel.ts`: only the recap's own modules import this file, and
 * importing it registers the sentences in `CATALOG`. Same rules as the catalog: data, templates with `{name}` slots,
 * both registers, reviewed like code.
 *
 * Wording rule: the headline reads the bars aloud, the same words for both sides; it names no winner and gives no
 * reason. The two words three-cycles page and Meu Brasil also print (`recap.start`, `recap.rowNoData`) stay in the core.
 */
import { registerSentences, type Key } from './catalog'

export const RECAP_KEYS = [
  'recap.title',
  'recap.sub',
  'recap.lead',
  'recap.part',
  'recap.noData',
  'recap.base',
  'recap.change',
  'recap.link',
  'recap.share',
  'recap.cycles',
] as const satisfies readonly Key[]

export const RECAP_STANDARD: Record<(typeof RECAP_KEYS)[number], string> = {
  'recap.title': 'Resumo do estado',
  'recap.sub': '{state} · Presidente, 2º turno, {years}',
  'recap.lead': 'Em {state}, no 2º turno, os votos válidos foram: ',
  'recap.part': '{ano}, {a} {pa}% e {b} {pb}%',
  'recap.noData': 'Sem dados do 2º turno em {state}.',
  'recap.base': 'Base: votos válidos do 2º turno, sem o exterior. Variações calculadas sem arredondar. Fonte: TSE.',
  'recap.change': '{pp} pp vs {ano}',
  'recap.link': 'Resumo do estado',
  'recap.share': 'Compartilhar o resumo',
  'recap.cycles': '{first} a {last}',
}

export const RECAP_PLAIN: Record<(typeof RECAP_KEYS)[number], string> = {
  'recap.title': 'Resumo do estado',
  'recap.sub': '{state} · Presidente, 2º turno, {years}',
  'recap.lead': 'Em {state}, no 2º turno, estes foram os votos dados a candidatos: ',
  'recap.part': 'em {ano}, {a} teve {pa}% e {b} teve {pb}%',
  'recap.noData': 'Não temos dados do 2º turno em {state}.',
  'recap.base': 'Contamos só os votos dados a candidatos no 2º turno, sem os votos do exterior. As diferenças usam os números exatos, sem arredondar. Fonte: TSE.',
  'recap.change': '{pp} pontos em relação a {ano}',
  'recap.link': 'Resumo do estado',
  'recap.share': 'Compartilhar o resumo',
  'recap.cycles': '{first} a {last}',
}

registerSentences('pt-BR', 'standard', RECAP_STANDARD)
registerSentences('pt-BR', 'plain', RECAP_PLAIN)
