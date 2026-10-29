/**
 * The sentences of the register switch of the city card: its group label and the two choices. Kept out of `catalog.ts`
 * like `catalog-duel.ts`: only the city card's own slot loads this file, and importing it registers the sentences in
 * `CATALOG`. Same rules as the catalog: data, reviewed like code. The labels read the same in both registers (they are
 * the switch's own words), so they are standard-only and have no plain version.
 */
import { registerSentences, type Key } from './catalog'

export const REGISTER_KEYS = ['register.label', 'register.standard', 'register.plain'] as const satisfies readonly Key[]

export const REGISTER_STANDARD: Record<(typeof REGISTER_KEYS)[number], string> = {
  'register.label': 'Estilo da frase',
  'register.standard': 'Texto integral',
  'register.plain': 'Linguagem simples',
}

registerSentences('pt-BR', 'standard', REGISTER_STANDARD)
