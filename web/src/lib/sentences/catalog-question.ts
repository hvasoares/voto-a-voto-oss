/**
 * The sentences of "Question before the answer" on the city card (#44) and of the guess card (#45), kept out of `catalog.ts` like `catalog-game.ts`.
 * This file is DATA ONLY and imports nothing; `question.ts` registers it in `CATALOG` for the build and the tests. The few words the guess buttons need in the browser are in `catalog-guess.ts`
 * (the small script that draws them reads that file directly: it must not pull the whole catalog, or this list, into the city page).
 *
 * Wording rule: the question asks what the data answers (did the side with most votes in the 2nd round change?), the answer is the arc label that
 * already sits on the page, and the sentences never say why. The result of a guess states whether it matched the data and nothing else: no praise, no shame.
 * Variants ending in `.o` are the overseas posts ("o voto no exterior em ...").
 */
export const QUESTION_STANDARD: Record<string, string> = {
  'question.same': '{city} mudou de lado entre 2018 e 2026?',
  'question.switched2022': '{city} mudou de lado em 2022?',
  'question.switched2026': '{city} mudou de lado em 2026?',
  'question.returned': '{city} voltou ao lado de 2018 em 2026?',
  'question.switchedTwice': '{city} mudou de lado em 2022 e de novo em 2026?',
  'question.tie': 'O 2º turno de {years} em {city} terminou empatado?',
  'question.missing': 'Há resultado do 2º turno de {years} em {city}?',
  'question.same.o': 'O voto no exterior em {city} mudou de lado entre 2018 e 2026?',
  'question.switched2022.o': 'O voto no exterior em {city} mudou de lado em 2022?',
  'question.switched2026.o': 'O voto no exterior em {city} mudou de lado em 2026?',
  'question.returned.o': 'O voto no exterior em {city} voltou ao lado de 2018 em 2026?',
  'question.switchedTwice.o': 'O voto no exterior em {city} mudou de lado em 2022 e de novo em 2026?',
  'question.tie.o': 'O 2º turno de {years} no exterior, em {city}, terminou empatado?',
  'question.missing.o': 'Há resultado do 2º turno de {years} no exterior, em {city}?',
  'guess.card.right': 'Palpite certo: {guess}',
  'guess.card.wrong': 'Palpite errado: {guess}',
  'guess.card.answer': 'Resposta: {answer} · {label}',
  'guess.card.sub': '2º turno de 2018, 2022 e 2026 · {uf}',
  'guess.card.share': '{question} {result} {url}',
}

export const QUESTION_PLAIN: Record<string, string> = {
  ...QUESTION_STANDARD,
  'question.same': 'Em {city}, o lado com mais votos no 2º turno mudou entre 2018 e 2026?',
  'question.switched2022': 'Em {city}, o lado com mais votos no 2º turno mudou em 2022?',
  'question.switched2026': 'Em {city}, o lado com mais votos no 2º turno mudou em 2026?',
  'question.returned': 'Em {city}, o lado com mais votos em 2026 foi o mesmo de 2018?',
  'question.switchedTwice': 'Em {city}, o lado com mais votos mudou em 2022 e mudou de novo em 2026?',
  'question.same.o': 'No exterior, em {city}, o lado com mais votos no 2º turno mudou entre 2018 e 2026?',
  'question.switched2022.o': 'No exterior, em {city}, o lado com mais votos no 2º turno mudou em 2022?',
  'question.switched2026.o': 'No exterior, em {city}, o lado com mais votos no 2º turno mudou em 2026?',
  'question.returned.o': 'No exterior, em {city}, o lado com mais votos em 2026 foi o mesmo de 2018?',
  'question.switchedTwice.o': 'No exterior, em {city}, o lado com mais votos mudou em 2022 e mudou de novo em 2026?',
}
