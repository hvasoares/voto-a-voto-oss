/**
 * The sentences of the city card's headline and its share text (#23): where and when, who did not vote, and who got how
 * many votes, with the same words for every candidate. Kept out of `catalog.ts` like `catalog-duel.ts`: only the
 * headline's own modules import this file, and importing it registers the sentences in `CATALOG`. Same rules as the
 * catalog: data, templates with `{name}` slots, both registers, reviewed like code.
 *
 * Wording rule: say what the data shows, with the same words and treatment for every candidate; never why people voted
 * as they did, never a winner label. `headline.note` is the small line under the headline: where the sentence comes from.
 */
import { registerSentences, type Key } from './catalog'

export const HEADLINE_KEYS = [
  'headline.note',
  'lead.city',
  'lead.overseas',
  'noElectorate',
  'nobodyTurnedOut.one',
  'nobodyTurnedOut.other',
  'noValidVotes',
  'everyoneVoted',
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
  'numberWords',
  'label.article',
] as const satisfies readonly Key[]

export const HEADLINE_STANDARD: Record<(typeof HEADLINE_KEYS)[number], string> = {
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
}

/**
 * Linguagem simples: short sentences, one idea each, everyday words ("pessoas que podiam votar", not "eleitorado"),
 * the same figures and the same neutrality as the standard register. The slots are the same as the standard template's.
 */
export const HEADLINE_PLAIN: Record<(typeof HEADLINE_KEYS)[number], string> = {
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
}

registerSentences('pt-BR', 'standard', HEADLINE_STANDARD)
registerSentences('pt-BR', 'plain', HEADLINE_PLAIN)

// The English and Spanish skeletons translate the city card's opening lines; everything else falls back to Portuguese.
registerSentences('en', 'standard', {
  'lead.city': 'In {city}, in round {turno} of {ano}, ',
  'lead.overseas': 'Abroad, in {city}, in round {turno} of {ano}, ',
  noElectorate: '{lead}there are no registered voters.',
})
registerSentences('es', 'standard', {
  'lead.city': 'En {city}, en la {turno}.ª vuelta de {ano}, ',
  'lead.overseas': 'En el exterior, en {city}, en la {turno}.ª vuelta de {ano}, ',
  noElectorate: '{lead}no hay electores registrados.',
})
