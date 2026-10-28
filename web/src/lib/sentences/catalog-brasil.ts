/**
 * The sentences of "Brasil e regiões" (#91), kept out of `catalog.ts` like `catalog-outliers.ts`: only the modules of that page, its share sheet and its
 * picture import this file, and importing it registers the sentences in `CATALOG`. Same rules as the catalog: data, templates with `{name}` slots, both
 * registers, reviewed like code.
 *
 * Wording rule of this screen: it says what the numbers are. The two candidates are named in ballot-number order with the same words, no winner, no ranking,
 * no cause. The picture's text alternative and the share text are the same sentences the page prints.
 */
import { CATALOG } from './catalog'

export const BRASIL_STANDARD: Record<string, string> = {
  'brasil.headline': 'No Brasil, no {turno}º turno de {ano}, os votos válidos foram: {a} {pa}% e {b} {pb}%.',
  'brasil.region': '{region}: {a} {pa}% e {b} {pb}% dos votos válidos; compareceram {c}% e não compareceram {n}% do eleitorado',
  'brasil.regions': 'Por região, sem o exterior: {parts}.',
  'brasil.regionShare': '{p}% dos votos válidos do país',
  'brasil.turnout': 'Compareceram {c}% · Não compareceram {n}%',
  'brasil.votes': '{name} {votos} votos',
  'brasil.legend': 'Barra: votos válidos da região. Compareceram e Não compareceram: parte do eleitorado.',
  'brasil.blanks': 'Brancos {b}% · Nulos {n}% do comparecimento.',
  'brasil.share': 'Compartilhar',
  'brasil.share.note': 'A mensagem leva a frase e o link; a imagem leva só o endereço curto, sem QR.',
  'brasil.base': 'Base: votos válidos do {turno}º turno; o total do país inclui o exterior, as regiões não. Fonte: TSE.',
  'brasil.nojs': 'Sem JavaScript não dá para compartilhar nem baixar a imagem. O texto da mensagem, abaixo, pode ser copiado.',
}

export const BRASIL_PLAIN: Record<string, string> = {
  'brasil.headline': 'No Brasil, no {turno}º turno de {ano}, os votos válidos foram assim: {a} {pa}% e {b} {pb}%.',
  'brasil.region': '{region}: {a} {pa}% e {b} {pb}% dos votos válidos. Foram votar {c}% dos eleitores. Não foram {n}%',
  'brasil.regions': 'Por região, sem o exterior: {parts}.',
  'brasil.regionShare': '{p}% dos votos válidos do país',
  'brasil.turnout': 'Compareceram {c}% · Não compareceram {n}%',
  'brasil.votes': '{name} {votos} votos',
  'brasil.legend': 'Barra: votos válidos da região. Compareceram e Não compareceram: parte dos eleitores.',
  'brasil.blanks': 'Brancos {b}% · Nulos {n}% de quem compareceu.',
  'brasil.share': 'Compartilhar',
  'brasil.share.note': 'A mensagem leva a frase e o link. A imagem leva só o endereço curto, sem QR.',
  'brasil.base': 'Base: votos válidos do {turno}º turno. O total do país conta o exterior. As regiões não contam. Fonte: TSE.',
  'brasil.nojs': 'Para compartilhar ou baixar a imagem, é preciso JavaScript. O texto da mensagem, abaixo, pode ser copiado.',
}

Object.assign(CATALOG['pt-BR'].standard, BRASIL_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, BRASIL_PLAIN)
