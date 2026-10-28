# Issue #44 (Question before the answer): checkpoints

1. **The question and its words, pure.** `src/lib/question.ts` + `src/lib/sentences/catalog-question.ts` (templates, data only) + `catalog-guess.ts` (the few words the browser needs). A closed list of SEVEN questions, one per arc
   (`arcs.ts`, #41), each in a city form and an overseas form, standard and plain: `same` "mudou de lado entre 2018 e 2026?" (answer Não), `switched2022`, `switched2026`, `returned`, `switchedTwice` (answer Sim), `tie`
   "o 2º turno de {anos} terminou empatado?" (Sim), `missing` "há resultado do 2º turno de {anos}?" (Não, and the answer says which years). The rule "most informative": the question is the one the city's own arc settles, so every city has exactly one and ties
   between candidates cannot happen; tests cover a tie in one and in two cycles, a missing cycle winning over a tie, an overseas post, both registers, and neutrality (no why, no winner or loser word, no name, no party).
2. **The answer is on the page, not behind a guess.** `viewQuestion` (card.ts) puts the question, then "Sim."/"Não." and the arc label that the page already had (both registers) at the top of the card, above the tabs. The arc block MOVED there: the page grew 66 B gzip only. The guess buttons are
   not in the HTML (no scripts: the answer and no buttons).
3. **The guess, browser only.** `src/lib/guess-store.ts` (one key `voto-a-voto:guess`, `{ "uf/slug": "yes"|"no" }`, last 30 cities; guarded, works with storage blocked), `src/scripts/city-guess.ts` (two buttons, the match line "Palpite: Sim. Resposta: Sim. O palpite estava certo."; tapping the
   same button again takes the guess back). The key is on the data page (`stored-items.ts`), cleared by "esquecer meus dados", compared with what is written by `place-store.test.ts` and `stored-privacy.spec`. The island makes no request: e2e `question.spec` asserts that no request follows a tap and that every
   request is a GET of the site itself.

## Size (fixture `/rj/cidade-exemplo/`, 390x844, `scripts/measure.ts`; no budget raised)

| | before | after |
|---|---|---|
| html gzip | 6482 | 6548 (budget 6.4 KB = 6553) |
| css gzip | 16223 | 16320 (budget 16 KB = 16384): the old pill rules became the answer box, the desktop overrides they made dead were removed |
| js gzip | 5130 | 6087 (+957 B: the guess in `city-card`'s own script; a dynamic import cost +2.3 KB, so it is a static import) |
| data | 0 | 0 |

## Screenshot review (390x844 and 1440x900, scroll 0, fixture `/rj/cidade-exemplo/?turno=1`, before and after a guess)

Frame "2b Pergunta antes da resposta" (id 7BCB1D41-5F30-4D6E-B415-9CB3666A26F8), approved as it stands.

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | question | tag PERGUNTA, serif 22 | same | none |
| 2 | note and buttons | "Palpite opcional · fica só no seu navegador", Sim and Não outlined 80x37 | same text; buttons 44 px high (tap target) | accepted (tap rule) |
| 3 | answer box | "Sim. Em 2018 venceu o Candidato B; em 2022, o Candidato A." | "Sim. Mudou de lado em 2022" + "Descreve a sequência, não a causa." | accepted: the frame's sentence names a winner ("venceu") and candidates; the product rule is neutral wording, the answer is the arc label that the page already shows |
| 4 | order | question, buttons, answer, tabs, card | same | none |
| 5 | after a guess | not drawn | the note becomes "Toque de novo...", the pressed button is filled, one line states the match | accepted (state the frame does not draw) |
| 6 | status bar "9:41", home indicator | drawn | absent | accepted-platform |
| 7 | desktop (no frame) | - | the question block heads the left column; the arc left the right column | note |

Verdict: PASS (no blockers).
