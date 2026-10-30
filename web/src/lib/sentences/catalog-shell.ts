/**
 * The sentences of the page shell (#136): the fixture banner that every page shows on a build of the fictitious dataset. One line, said by
 * `components/FixtureBanner.astro` on seven pages (the city card, the state page, the three-cycles page, the fact record, a report, Brasil
 * e regiões, the share demo). The stub page's three (private#206): what is loading (`{what}` is the family's own noun phrase, from its catalog), what a visitor without scripts is told, and the link back. Same rules as the catalog: data, both registers (the fixture banner reads the same in both), reviewed like code.
 */
import { registerSentences, type Key } from './catalog'

export const SHELL_KEYS = ['shell.fixtureBanner', 'stub.loading', 'stub.needsScripts', 'stub.back', 'stub.arrived', 'stub.failed', 'stub.retry', 'stub.what.qr'] as const satisfies readonly Key[]

export const SHELL_STANDARD: Record<(typeof SHELL_KEYS)[number], string> = {
  'shell.fixtureBanner': 'EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS',
  'stub.loading': 'Carregando {what}…',
  'stub.needsScripts': 'Esta página precisa de JavaScript para mostrar {what}. Ative o JavaScript do navegador ou volte para a página anterior.',
  'stub.back': 'Voltar',
  'stub.arrived': '{what} pronto.',
  'stub.failed': '{what} não carregou. Tente de novo ou volte.',
  'stub.retry': 'Tentar de novo',
  'stub.what.qr': 'o QR da cidade',
}

export const SHELL_PLAIN: Record<(typeof SHELL_KEYS)[number], string> = {
  'shell.fixtureBanner': 'EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS',
  'stub.loading': 'Carregando {what}. Aguarde um instante.',
  'stub.needsScripts': 'Para ver {what}, ative o JavaScript do navegador. Ou volte para a página anterior.',
  'stub.back': 'Voltar',
  'stub.arrived': 'Pronto: {what} já está na tela.',
  'stub.failed': 'Não deu para carregar {what}. Tente de novo ou volte para a página anterior.',
  'stub.retry': 'Tentar de novo',
  'stub.what.qr': 'o QR da cidade',
}

registerSentences('pt-BR', 'standard', SHELL_STANDARD)
registerSentences('pt-BR', 'plain', SHELL_PLAIN)
