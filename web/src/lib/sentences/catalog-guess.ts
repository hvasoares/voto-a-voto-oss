/**
 * The words of the guess buttons of the city card (#44), DATA ONLY and importing nothing: `scripts/city-guess.ts` reads this file in the browser, so it must stay tiny and apart from the
 * catalog (`question.ts` registers it in `CATALOG` for the tests and the share card of #45). The result of a guess states whether it matched the data and nothing else: no praise, no shame.
 */
export const GUESS_STANDARD: Record<string, string> = {
  'question.yes': 'Sim',
  'question.no': 'Não',
  'question.guess.note': 'Escolha para ver a resposta · fica só no seu navegador',
  'question.guess.group': 'Seu palpite',
  'question.guess.right': 'Palpite: {guess}. Resposta: {answer}. O palpite estava certo.',
  'question.guess.wrong': 'Palpite: {guess}. Resposta: {answer}. O palpite estava errado.',
}
