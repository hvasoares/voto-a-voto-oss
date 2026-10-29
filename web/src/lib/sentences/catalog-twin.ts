/**
 * The sentences of the twin line of the city card (#31): the closest peer city of another state, and the one-line
 * reason, which names the features the match really uses. Kept out of `catalog.ts` like `catalog-duel.ts`: only the
 * city card's own slot loads this file, and importing it registers the sentences in `CATALOG`. Same rules as the
 * catalog: data, templates with `{name}` slots, both registers, reviewed like code.
 */
import { registerSentences, type Key } from './catalog'

export const TWIN_KEYS = ['twin.label', 'twin.reason'] as const satisfies readonly Key[]

export const TWIN_STANDARD: Record<(typeof TWIN_KEYS)[number], string> = {
  'twin.label': 'Cidade gêmea: {name} · {uf}',
  'twin.reason': 'Perfil parecido de porte, participação, margem e histórico.',
}

export const TWIN_PLAIN: Record<(typeof TWIN_KEYS)[number], string> = {
  'twin.label': 'Cidade parecida: {name} · {uf}',
  'twin.reason': 'Tem número de eleitores, comparecimento e resultados parecidos nas três eleições.',
}

registerSentences('pt-BR', 'standard', TWIN_STANDARD)
registerSentences('pt-BR', 'plain', TWIN_PLAIN)
