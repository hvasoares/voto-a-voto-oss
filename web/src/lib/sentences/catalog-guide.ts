/**
 * The sentences of the creator guide "Fale sem errar" (#67), kept out of `catalog.ts` like `catalog-duel.ts`: only the guide's modules import this file, and importing it
 * registers the sentences in `CATALOG`. Same rules as the catalog: data, templates with `{name}` slots, both registers, reviewed like code.
 *
 * Wording rule: the data never shows why people voted, how a person or a group voted, or that abstaining was a protest, and a cycle with no data is not zero. The ready phrases
 * only read numbers, with the same words for every candidate.
 */
import { CATALOG } from './catalog'

export const GUIDE_STANDARD: Record<string, string> = {
  'guide.title': 'Fale sem errar',
  'guide.sub': 'Para quem vai falar da sua cidade ao vivo ou em vídeo: o que os números dizem, o que não dizem e como citar.',
  'guide.can.title': 'Pode dizer',
  'guide.plain.toggle': 'Linguagem simples',
  'guide.kind.turnout': 'Participação',
  'guide.kind.result': 'Resultado',
  'guide.kind.sequence': 'Sequência',
  'guide.result': 'No {turno}º turno de {ano}, em {city}, {a} teve {pa} dos votos válidos e {b}, {pb}.',
  'guide.sequence': '{city}: {label}. {note}',
  'guide.copy': 'Copiar',
  'guide.copied': 'Copiado.',
  'guide.copy.failed': 'A cópia não funcionou neste navegador. Selecione a frase e copie.',
  'guide.choose': 'Escolha uma cidade para ver as frases prontas.',
  'guide.picker': 'Cidade',
  'guide.loading': 'Carregando a cidade…',
  'guide.failed': 'Não foi possível carregar os dados da cidade agora.',
  'guide.nodata': '{city} não tem dados do {turno}º turno de {ano}: não diga que o resultado foi zero.',
  'guide.never.title': 'Não diga: os números não mostram',
  'guide.never.1': 'Por que as pessoas votaram assim.',
  'guide.never.1.say': 'Diga o que o resultado foi, não a causa.',
  'guide.never.2': 'Como uma pessoa, um grupo ou uma torcida votou.',
  'guide.never.2.say': 'Os dados são da cidade inteira, não de quem você conhece.',
  'guide.never.3': 'Que a abstenção foi protesto.',
  'guide.never.3.say': 'Diga: "tantos por cento do eleitorado não votou".',
  'guide.never.4': 'Que um ciclo sem dados é zero.',
  'guide.never.4.say': 'Diga: "esse ano ainda não temos esses dados".',
  'guide.rules.title': 'Regras de redação',
  'guide.rules.1': 'Os dados nunca mostram por que as pessoas votaram como votaram.',
  'guide.rules.2': 'Os dados nunca mostram como uma pessoa ou um grupo votou: só o total da cidade.',
  'guide.rules.3': 'Os dados nunca mostram que a abstenção foi protesto: quem não votou inclui ausências, votos em branco e votos nulos.',
  'guide.rules.4': 'Um ciclo sem dados não é zero. Diga que não há dados.',
  'guide.rules.5': 'As frases usam as mesmas palavras para todos os candidatos e dizem só os números.',
  'guide.rules.6': 'Os dados são finais, não ao vivo.',
  'guide.cite.title': 'Como citar',
  'guide.cite.line': 'Fonte: TSE, dados finais, edição {edition}',
  'guide.cite.place': ' · {address}',
  'guide.cite.note': 'Cada número da página da cidade tem um "ver cálculo". Se alguém duvidar, abra o cálculo na tela.',
  'guide.noads': 'Esta página não tem anúncios nem rastreamento. As regras de monetização e de conteúdo político variam por plataforma: confira as da sua.',
  'guide.link.overlay': 'Montar o overlay para a live ›',
  'guide.link.game': 'Jogar Adivinhe a cidade ›',
}

export const GUIDE_PLAIN: Record<string, string> = {
  ...GUIDE_STANDARD,
  'guide.sub': 'Para quem vai falar da cidade ao vivo ou em vídeo: o que os números dizem, o que não dizem e como dizer de onde vêm.',
  'guide.result': 'No {turno}º turno de {ano}, em {city}, {a} teve {pa} dos votos válidos. {b} teve {pb}.',
  'guide.never.2.say': 'Os dados são da cidade toda. Não são de quem você conhece.',
  'guide.rules.3': 'Os dados não mostram que faltar foi protesto. Quem não votou inclui quem faltou, quem votou em branco e quem votou nulo.',
}

Object.assign(CATALOG['pt-BR'].standard, GUIDE_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, GUIDE_PLAIN)
