/**
 * The sentences of the ready-made texts of a city (#65): the WhatsApp/SMS block and the read-aloud bulletin. Kept out of `catalog.ts` like `catalog-duel.ts`:
 * only `city-texts.ts` (and the pages that print it) import this file, and importing it registers the sentences in `CATALOG`. Same rules as the catalog: data,
 * templates with `{name}` slots, both registers, reviewed like code.
 *
 * Wording rule: numbers and where they come from, nothing else. No cause, no adjective, no winner label; the bulletin spells every number (it is heard, not
 * seen) and says what the data does not show.
 */
import { CATALOG } from './catalog'

export const TEXTS_STANDARD: Record<string, string> = {
  /** WhatsApp / SMS block: the card's headline and margin line come from `headline()` / `marginLine()`; these are the lines around them. */
  'text.wa.turnout': 'Votaram {voted} de {aptos} eleitores ({votedShare}). Não votaram {not} ({notShare}).',
  'text.wa.source': 'Fonte: TSE, dados finais. Edição de {date}.',
  'text.wa.source.fixture': 'Dados fictícios, só de exemplo. Fonte real: TSE.',
  /** Read-aloud bulletin (about 90 seconds): every number is spelled in words. */
  'text.radio.open': 'Resultado do {turno} turno de {ano} em {city}, {uf}.',
  'text.radio.open.overseas': 'Resultado do {turno} turno de {ano} no exterior, em {city}.',
  'text.radio.noData': 'Esta cidade não tem dados do {turno} turno de {ano} na base.',
  'text.radio.electorate': 'Eram {aptos} eleitores aptos a votar.',
  'text.radio.nobody': 'Ninguém compareceu.',
  'text.radio.turnout': 'Votaram {voted} eleitores, ou seja, {votedShare} do total. Não votaram {not}, ou seja, {notShare}. Quem não votou inclui ausências, votos em branco e votos nulos.',
  'text.radio.candidate': '{name} recebeu {votes} votos, {share} dos votos válidos.',
  'text.radio.others': 'Os outros candidatos somaram {votes} votos, {share} dos votos válidos.',
  'text.radio.margin.tie': 'Os dois primeiros ficaram com o mesmo número de votos.',
  'text.radio.margin.gap.one': 'A diferença entre os dois primeiros foi de {n} voto.',
  'text.radio.margin.gap.other': 'A diferença entre os dois primeiros foi de {n} votos.',
  'text.radio.margin.fits.one': ' Esse número cabe {times} vez no total de eleitores que não votaram.',
  'text.radio.margin.fits.other': ' Esse número cabe {times} vezes no total de eleitores que não votaram.',
  'text.radio.margin.exceeds': ' Esse número é maior que o total de eleitores que não votaram.',
  'text.radio.source': 'Os dados são do Tribunal Superior Eleitoral, resultado final, edição de {date}. Não são dados ao vivo.',
  'text.radio.source.fixture': 'Estes são dados fictícios, para ilustrar o layout. A fonte real é o Tribunal Superior Eleitoral.',
  'text.radio.limits': 'Os números não mostram por que as pessoas votaram ou deixaram de votar.',
  'text.radio.close': 'Para ver os números na tela, procure o Voto a Voto e escolha a cidade.',
  'text.radio.round.1': 'primeiro',
  'text.radio.round.2': 'segundo',
  'text.months': 'janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro',
  'text.date': '{day} de {month} de {year}',
  'text.candidate.fallback': 'O candidato número {n}',
  /** Page: the section on the share page. */
  'text.section.title': 'Textos prontos',
  'text.section.note': 'Os dois textos usam só os números da cidade e a fonte. Não dizem por que as pessoas votaram.',
  'text.wa.title': 'Texto para WhatsApp e SMS',
  'text.radio.title': 'Boletim para ler em voz alta',
  'text.radio.note': 'Cerca de 90 segundos. Os números estão escritos por extenso.',
  'text.copy': 'Copiar',
  'text.copied': 'Copiado.',
  'text.copy.failed': 'A cópia não funcionou neste navegador. Selecione o texto acima e copie.',
  'text.state.link': 'Baixar os textos de todas as cidades do estado (.txt)',
}

export const TEXTS_PLAIN: Record<string, string> = {
  ...TEXTS_STANDARD,
  'text.wa.turnout': 'Foram votar {voted} de {aptos} eleitores ({votedShare}). {not} não votaram ({notShare}).',
  'text.radio.open': 'Resultado do {turno} turno de {ano} em {city}, {uf}.',
  'text.radio.turnout': 'Foram votar {voted} eleitores: {votedShare} do total. Não votaram {not} eleitores: {notShare} do total. Aqui entram quem faltou e quem votou em branco ou nulo.',
  'text.radio.candidate': '{name} teve {votes} votos. Isso é {share} dos votos válidos.',
  'text.radio.others': 'Os outros candidatos tiveram {votes} votos juntos. Isso é {share} dos votos válidos.',
  'text.radio.margin.fits.one': ' Esse número cabe {times} vez no total de eleitores que não votaram.',
  'text.radio.source': 'Os dados vêm do Tribunal Superior Eleitoral. É o resultado final, da edição de {date}. Não é ao vivo.',
  'text.radio.limits': 'Os números não dizem por que cada pessoa votou ou não votou.',
  'text.radio.close': 'Quer ver os números na tela? Procure o Voto a Voto e escolha a cidade.',
  'text.section.note': 'Os dois textos têm só os números da cidade e a fonte. Não dizem por que as pessoas votaram.',
  'text.radio.note': 'Dura cerca de 90 segundos. Os números estão escritos com palavras.',
}

Object.assign(CATALOG['pt-BR'].standard, TEXTS_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, TEXTS_PLAIN)
