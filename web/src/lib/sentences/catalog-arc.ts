/**
 * The sentences of the arc label of a city (#41): who had the most votes in the 2nd round of 2018, 2022 and 2026, as a
 * sequence. Kept out of `catalog.ts` like `catalog-duel.ts`: only `arc.ts` (and who imports it) loads this file, and
 * importing it registers the sentences in `CATALOG`. Same rules as the catalog: data, templates with `{name}` slots,
 * both registers, reviewed like code.
 *
 * Wording rule: a closed list of labels; the note says it describes the sequence, not the cause.
 */
import { registerSentences, type Key } from './catalog'

export const ARC_KEYS = ['arc.same', 'arc.switched2022', 'arc.switched2026', 'arc.returned', 'arc.switchedTwice', 'arc.tie', 'arc.missing', 'arc.note'] as const satisfies readonly Key[]

export const ARC_STANDARD: Record<(typeof ARC_KEYS)[number], string> = {
  'arc.same': 'Mesmo lado nos três ciclos',
  'arc.switched2022': 'Mudou de lado em 2022',
  'arc.switched2026': 'Mudou de lado em 2026',
  'arc.returned': 'Mudou de lado em 2022 e voltou em 2026',
  'arc.switchedTwice': 'Mudou de lado em 2022 e de novo em 2026',
  'arc.tie': 'Empate no 2º turno de {years}',
  'arc.missing': 'Sem dados do 2º turno de {years}',
  'arc.note': 'Descreve a sequência, não a causa.',
}

export const ARC_PLAIN: Record<(typeof ARC_KEYS)[number], string> = {
  'arc.same': 'Nos três ciclos, o mesmo lado teve mais votos no 2º turno',
  'arc.switched2022': 'Em 2022, o lado com mais votos no 2º turno mudou',
  'arc.switched2026': 'Em 2026, o lado com mais votos no 2º turno mudou',
  'arc.returned': 'Em 2022 o lado com mais votos mudou, e em 2026 voltou a ser o de 2018',
  'arc.switchedTwice': 'O lado com mais votos no 2º turno mudou em 2022 e mudou de novo em 2026',
  'arc.tie': 'O 2º turno terminou empatado em {years}',
  'arc.missing': 'Não temos o resultado do 2º turno de {years}',
  'arc.note': 'Só conta a ordem dos fatos. Não diz o motivo.',
}

registerSentences('pt-BR', 'standard', ARC_STANDARD)
registerSentences('pt-BR', 'plain', ARC_PLAIN)
