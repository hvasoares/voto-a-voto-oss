# Issue #45 (Guess result share card): checkpoints

1. **The card, pure.** `src/lib/guess-card.ts` (`guessContent`, `guessResult`) + `catalog-question.ts` `guess.card.*` + the `guess` option of `shareCardSvg` (`share-card.ts`: the question in up to three lines, the result in the serif at the biggest size
   that fits a line, the answer in up to two lines, in place of the two bars). Same address, same short link, same ASCII file name rule (`voto-a-voto-<uf>-<slug>-palpite.png`) and a text alternative per register that carries the question, the result and the
   answer ("Cidade Exemplo mudou de lado em 2022? Palpite: Sim. Resposta: Sim. O palpite estava certo. Mudou de lado em 2022."). Tests: right, wrong, no guess (the normal card has no "Palpite"/"Resposta", the guess card has no bars), the same link as the
   normal card, both registers, and a fit test over every arc kind x overseas x two names (the long one has 45 letters) x both guesses: no line cut with "…", none wider than the card.
2. **The sheet.** `ShareSheet.tsx` reads the guess of THIS city from the browser (`guess-store.ts`, #44) after hydration and shows the guess card (`data-card="guess"`; `pending` until the browser has been asked, `city` after: the normal card); the share route passes the
   city's question and name as props (a few bytes; no per-city picture is pre-rendered, so the build does not grow). With no guess, or another city's, nothing changes. No request: the card is drawn from the question and the guess, e2e asserts only GETs of the site, none with a query or a fragment.

## Decisions

- **Wording.** The frame says "Você acertou: sim" and "2018: B venceu · 2022: A venceu". The product rule is neutral (no praise, no shame, no winner): "Palpite certo: Sim" / "Palpite errado: Não" and "Resposta: Sim · Mudou de lado em 2022" (the arc label of the city page).
- **Which card.** With a guess the sheet shows the guess card; the normal card is the card of the city without one. There is no switch between them (no entry point was approved for one): to share the normal card, take the guess back on the city page (tap the same button again).
- **Reopening (#38).** The guess card carries no card keys: a dropped guess card cannot be reopened (the guess is not in any file of the site), `/abrir-cartao/` treats it as a file without keys.

## Screenshot review (390x844, scroll 0, fixture share sheet after a right guess)

Frame "3b Cartão do palpite" (id C2A39DC9-6BB8-4234-83DC-5844420B8C81).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | tag, header, city | EXEMPLO, "Presidente 2026", "Cidade Exemplo" | same | none |
| 2 | sub line | "2026 · 1º turno · UF" | "2º turno de 2018, 2022 e 2026 · RJ" (the question is about the three cycles) | accepted |
| 3 | question | one bold line | the same question, wrapped in two lines at the size that fits | none |
| 4 | result | "Você acertou: sim" in the accent serif | "Palpite certo: Sim" in the accent serif | accepted: neutral wording (see Decisions) |
| 5 | answer | "2018: B venceu · 2022: A venceu" | "Resposta: Sim · Mudou de lado em 2022" | accepted: neutral wording |
| 6 | address, source line | present | present | none |
| 7 | actions | Compartilhar, Baixar imagem, Mostrar QR | the sheet's own (Copiar link where there is no system share), as in the other sheets | accepted |

Verdict: PASS (no blockers).
