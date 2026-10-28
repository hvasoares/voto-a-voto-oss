/**
 * The words of the city replay (#46), DATA ONLY and importing nothing: `lib/replay.ts` reads this file in the browser (the replay is drawn there, from the numbers the three-cycle
 * page already holds), so it must not pull the catalog into the page; the tests read it through `lib/replay.ts`. The replay states the numbers of each cycle and nothing else:
 * no winner, no change, no why. A cycle the city has no result for is named as missing.
 */
export const REPLAY_STANDARD: Record<string, string> = {
  'replay.tag': 'REPLAY · 2018 → 2022 → 2026',
  'replay.alt': 'Replay do {turno}º turno em {city}: {parts}.',
  'replay.part': '{ano}, {sides} dos votos válidos',
  'replay.side': '{label} {pct}%',
  'replay.missing': 'Sem dados de {years}: o replay mostra só o que existe.',
  'replay.play': 'Reproduzir',
  'replay.pause': 'Pausar',
  'replay.again': 'Ver de novo',
  'replay.scrub': 'Ciclo do replay',
  'replay.note': 'Com movimento reduzido, sem scripts ou na prévia do chat, mostramos o cartão estático abaixo. O replay tem texto alternativo com os resultados.',
}
