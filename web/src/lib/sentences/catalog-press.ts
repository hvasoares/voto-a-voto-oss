/**
 * The sentences of the press page, the state kits and the printable posters (#66), kept out of `catalog.ts` like `catalog-duel.ts`: only the press modules import this
 * file, and importing it registers the sentences in `CATALOG`. Same rules as the catalog: data, templates with `{name}` slots, both registers, reviewed like code.
 *
 * Wording rule: a kit says what the picture shows, where the numbers come from and what they do not show. No cause, no winner label, no adjective.
 */
import { CATALOG } from './catalog'

export const PRESS_STANDARD: Record<string, string> = {
  'press.title': 'Para a imprensa',
  'press.sub': 'Um kit por estado com gráfico, legenda, texto alternativo e crédito, mais cartazes para imprimir. Dados finais do TSE, não ao vivo.',
  'press.licence.title': 'Licença e crédito',
  'press.licence': 'Os gráficos, as legendas e os textos deste kit seguem a licença Creative Commons Atribuição 4.0 (CC BY 4.0): podem ser publicados, com o crédito abaixo, sem pedir autorização. Os resultados são publicações oficiais do TSE; o Voto a Voto só os organiza.',
  'press.credit': 'Crédito: Voto a Voto, a partir de dados do TSE (dados finais, edição de {date}).',
  'press.seal': 'Voto a Voto · Fonte: TSE, dados finais · edição {edition}',
  'press.seal.fixture': 'EXEMPLO · dados fictícios · Voto a Voto · fonte real: TSE',
  'press.states.title': 'Kits por estado',
  'press.states.note': 'Cada kit é atualizado a cada edição dos dados. O mesmo gráfico, a mesma legenda e o mesmo crédito, em todos os estados.',
  'press.col.state': 'Estado',
  'press.col.chart': 'Gráfico (SVG)',
  'press.col.captions': 'Legendas e crédito (TXT)',
  'press.col.poster': 'Cartaz A2',
  'press.link.chart': 'Gráfico de {state} (SVG)',
  'press.link.captions': 'Legendas de {state} (TXT)',
  'press.link.poster': 'Cartaz A2 de {state}',
  'press.seal.note': 'Todo gráfico leva o selo da fonte no alto, no meio e no pé: um recorte ainda mostra de onde vêm os números.',
  'press.sheet.title': 'Folha A3 de uma cidade',
  'press.sheet.note': 'Abra a folha com a cidade no endereço, como {example}. Ela traz o cartão da cidade nos três ciclos, o QR para a página da cidade e a fonte, e se imprime em A3 pelo comando de imprimir do navegador.',
  'press.sheet.example': 'Exemplo: {name}',
  'press.sheet.choose': 'Informe a cidade no endereço, como {example}.',
  'press.sheet.loading': 'Carregando a cidade…',
  'press.sheet.failed': 'Não foi possível carregar os dados da cidade agora.',
  'press.sheet.qr': 'Aponte a câmera para abrir a página da cidade.',
  'press.sheet.print': 'Imprimir (A3)',
  'press.sheet.nojs': 'A folha é desenhada no navegador e precisa de JavaScript.',
  'press.poster.print': 'Imprimir (A2)',
  'press.poster.note': 'Cartaz para imprimir em A2. No comando de imprimir do navegador, escolha escala 100% e sem margens extras.',
  'press.poster.qr': 'Aponte a câmera para abrir o resumo do estado.',
  'press.poster.map': 'Mapa do Brasil com {state} em destaque',
  'press.poster.source': 'Fonte: TSE, dados finais · edição {edition} · {address}',
  'press.poster.source.fixture': 'Dados fictícios, só de exemplo. Fonte real: TSE · {address}',
  'press.kit.title': 'Kit de imprensa: {state}',
  'press.kit.chart': 'Gráfico: {file}',
  'press.kit.caption': 'Legenda',
  'press.kit.alt': 'Texto alternativo',
  'press.kit.plain': 'Legenda em linguagem simples',
  'press.kit.credit': 'Crédito',
  'press.kit.licence': 'Licença',
  'press.kit.cite': 'Como citar',
  'press.kit.limits': 'O que os números não mostram: por que as pessoas votaram ou deixaram de votar.',
  'press.kit.nodata': '{state} não tem dados de 2º turno nos três ciclos na base.',
  'press.back': '‹ Para a imprensa',
}

export const PRESS_PLAIN: Record<string, string> = {
  ...PRESS_STANDARD,
  'press.sub': 'Um kit para cada estado: gráfico, legenda, texto para quem não vê a imagem e crédito. Também tem cartazes para imprimir. Os dados são finais, do TSE, e não são ao vivo.',
  'press.licence': 'Você pode publicar os gráficos, as legendas e os textos deste kit, sem pedir licença, desde que coloque o crédito abaixo (licença CC BY 4.0). Os resultados são oficiais, do TSE. O Voto a Voto só organiza os números.',
  'press.seal.note': 'Todo gráfico tem o selo da fonte no alto, no meio e embaixo. Se alguém cortar a imagem, ainda dá para ver de onde vêm os números.',
  'press.kit.limits': 'Os números não dizem por que as pessoas votaram ou não votaram.',
}

Object.assign(CATALOG['pt-BR'].standard, PRESS_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, PRESS_PLAIN)
