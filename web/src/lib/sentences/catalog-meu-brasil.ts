/**
 * The sentences of Meu Brasil (#27) and its sticker (#37): up to three places across the three cycles, one headline,
 * the card's legend and the sticker's chrome. Kept out of `catalog.ts` like `catalog-duel.ts`: only Meu Brasil's own
 * modules (the headline, the card, the sticker, the islands and the pages) import this file, and importing it
 * registers the sentences in `CATALOG`. Same rules as the catalog: data, templates with `{name}` slots, both registers,
 * reviewed like code.
 *
 * Wording rule: the same words for every place and candidate, numbers only (the share of the electorate that did not
 * vote, whole percents as the bars show them); no winner, no cause.
 */
import { registerSentences, type Key } from './catalog'

export const MEUBRASIL_KEYS = [
  'mb.title',
  'mb.sub',
  'mb.none',
  'mb.single',
  'mb.multi',
  'mb.part.cycle',
  'mb.part.place',
  'mb.noData',
  'mb.legend',
  'mb.notVoted',
  'mb.votedLine',
  'mb.notVotedFull',
  'mb.role.mora',
  'mb.role.vota',
  'mb.role.nasceu',
  'mb.share',
  'mb.addressNote',
  'mb.tag',
  'mb.sticker.title',
  'mb.sticker.sub',
  'mb.sticker.note',
  'mb.sticker.scan',
  'mb.sticker.alt',
  'mb.sticker.altLabel',
  'mb.sticker.download',
] as const satisfies readonly Key[]

export const MEUBRASIL_STANDARD: Record<(typeof MEUBRASIL_KEYS)[number], string> = {
  'mb.title': 'Meu Brasil',
  'mb.sub': 'Até três lugares: onde você mora, vota e nasceu.',
  'mb.none': 'Escolha ao menos um lugar para ver o cartão.',
  'mb.single': 'Em {place}, no 2º turno, a parcela do eleitorado que não votou foi de {parts}.',
  'mb.multi': 'No 2º turno de {ano}, a parcela do eleitorado que não votou foi de {parts}.',
  'mb.part.cycle': '{pct}% em {ano}',
  'mb.part.place': '{pct}% em {place}',
  'mb.noData': 'Os lugares escolhidos não têm dados do 2º turno de nenhum ciclo em comum.',
  'mb.legend': 'Vermelho = candidato de menor número · azul = o outro (% dos votos válidos) · bege = % do eleitorado que não votou',
  'mb.notVoted': 'não votou {pct}%',
  'mb.votedLine': 'votaram · {sides}',
  'mb.notVotedFull': 'não votou {pct}% do eleitorado',
  'mb.role.mora': 'Onde mora',
  'mb.role.vota': 'Onde vota',
  'mb.role.nasceu': 'Onde nasceu',
  'mb.share': 'Compartilhar o cartão',
  'mb.addressNote': 'Os lugares ficam no endereço da página: recarregar ou enviar o link reproduz o mesmo cartão.',
  'mb.tag': 'MEU BRASIL',
  'mb.sticker.title': 'Adesivo Meu Brasil',
  'mb.sticker.sub': 'Adesivo de chat com a frase do cartão e um QR para ele. PNG com fundo transparente.',
  'mb.sticker.note': 'O QR leva ao cartão: o endereço dele tem os mesmos lugares.',
  'mb.sticker.scan': 'Aponte a câmera para abrir o cartão.',
  'mb.sticker.alt': 'Adesivo Meu Brasil: {headline} O QR leva ao cartão em {address}.',
  'mb.sticker.altLabel': 'Texto alternativo gerado: “{alt}”',
  'mb.sticker.download': 'Baixar adesivo (PNG)',
}

export const MEUBRASIL_PLAIN: Record<(typeof MEUBRASIL_KEYS)[number], string> = {
  'mb.title': 'Meu Brasil',
  'mb.sub': 'Até três lugares: onde você mora, vota e nasceu.',
  'mb.none': 'Escolha ao menos um lugar para ver o cartão.',
  'mb.single': 'Em {place}, no 2º turno, estas foram as pessoas que não votaram: {parts}.',
  'mb.multi': 'No 2º turno de {ano}, estas foram as pessoas que não votaram: {parts}.',
  'mb.part.cycle': '{pct}% em {ano}',
  'mb.part.place': '{pct}% em {place}',
  'mb.noData': 'Os lugares escolhidos não têm dados do 2º turno em uma mesma eleição.',
  'mb.legend': 'Barra vermelha = candidato de menor número. Azul = o outro (% dos votos). Bege = % das pessoas que não votaram.',
  'mb.notVoted': 'não votou {pct}%',
  'mb.votedLine': 'votaram · {sides}',
  'mb.notVotedFull': 'não votou {pct}% do eleitorado',
  'mb.role.mora': 'Onde mora',
  'mb.role.vota': 'Onde vota',
  'mb.role.nasceu': 'Onde nasceu',
  'mb.share': 'Compartilhar o cartão',
  'mb.addressNote': 'Os lugares ficam no endereço da página: recarregar ou enviar o link reproduz o mesmo cartão.',
  'mb.tag': 'MEU BRASIL',
  'mb.sticker.title': 'Adesivo Meu Brasil',
  'mb.sticker.sub': 'Adesivo de chat com a frase do cartão e um QR para ele. PNG com fundo transparente.',
  'mb.sticker.note': 'O QR leva ao cartão: o endereço dele tem os mesmos lugares.',
  'mb.sticker.scan': 'Aponte a câmera para abrir o cartão.',
  'mb.sticker.alt': 'Adesivo Meu Brasil: {headline} O QR leva ao cartão em {address}.',
  'mb.sticker.altLabel': 'Texto alternativo gerado: “{alt}”',
  'mb.sticker.download': 'Baixar adesivo (PNG)',
}

registerSentences('pt-BR', 'standard', MEUBRASIL_STANDARD)
registerSentences('pt-BR', 'plain', MEUBRASIL_PLAIN)
