/**
 * The sentences of the margin line of the city card (#26): the votes that would have changed the result, and how many
 * times that fits in the people who did not vote. Kept out of `catalog.ts` like `catalog-duel.ts`: only `margin.ts`
 * (and who imports it) loads this file, and importing it registers the sentences in `CATALOG`. Same rules as the
 * catalog: data, templates with `{name}` slots, both registers, reviewed like code.
 *
 * Wording rule: plain arithmetic, no intent; the line never says why anyone voted or stayed home.
 */
import { registerSentences, type Key } from './catalog'

export const MARGIN_KEYS = ['margin.tie', 'margin.gap.one', 'margin.gap.other', 'margin.fits.one', 'margin.fits.other', 'margin.exceeds', 'margin.end'] as const satisfies readonly Key[]

export const MARGIN_STANDARD: Record<(typeof MARGIN_KEYS)[number], string> = {
  'margin.tie': 'Empate na frente: a diferença entre os mais votados é de 0 votos.',
  'margin.gap.one': 'Faltou {n} voto para virar',
  'margin.gap.other': 'Faltaram {n} votos para virar',
  'margin.fits.one': ': cabe {times} vez nos {m} que não votaram.',
  'margin.fits.other': ': cabem {times} vezes nos {m} que não votaram.',
  'margin.exceeds': ': mais do que os {m} que não votaram.',
  'margin.end': '.',
}

export const MARGIN_PLAIN: Record<(typeof MARGIN_KEYS)[number], string> = {
  'margin.tie': 'Houve empate na frente. A diferença entre os mais votados é de 0 votos.',
  'margin.gap.one': 'Faltou {n} voto para virar o resultado',
  'margin.gap.other': 'Faltaram {n} votos para virar o resultado',
  'margin.fits.one': '. Esse número cabe {times} vez nas {m} pessoas que não votaram.',
  'margin.fits.other': '. Esse número cabe {times} vezes nas {m} pessoas que não votaram.',
  'margin.exceeds': '. Esse número é maior do que as {m} pessoas que não votaram.',
  'margin.end': '.',
}

registerSentences('pt-BR', 'standard', MARGIN_STANDARD)
registerSentences('pt-BR', 'plain', MARGIN_PLAIN)
