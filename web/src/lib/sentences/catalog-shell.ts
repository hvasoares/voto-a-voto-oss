/**
 * The sentence of the page shell (#136): the fixture banner that every page shows on a build of the fictitious dataset. One line, said by
 * `components/FixtureBanner.astro` on seven pages (the city card, the state page, the three-cycles page, the fact record, a report, Brasil
 * e regiões, the share demo). Same rules as the catalog: data, both registers (the same words in both), reviewed like code.
 */
import { registerSentences, type Key } from './catalog'

export const SHELL_KEYS = ['shell.fixtureBanner', 'shell.backHome'] as const satisfies readonly Key[]

export const SHELL_STANDARD: Record<(typeof SHELL_KEYS)[number], string> = {
  'shell.fixtureBanner': 'EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS',
  'shell.backHome': '‹ Início',
}

export const SHELL_PLAIN: Record<(typeof SHELL_KEYS)[number], string> = {
  'shell.fixtureBanner': 'EXEMPLO · DADOS FICTÍCIOS, NÃO SÃO RESULTADOS REAIS',
  'shell.backHome': '‹ Início',
}

registerSentences('pt-BR', 'standard', SHELL_STANDARD)
registerSentences('pt-BR', 'plain', SHELL_PLAIN)
