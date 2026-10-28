# Issue #70 (The end of the daily game): checkpoints

1. **Grid and share text, pure.** `gridRow`, `shareText` in `src/lib/game.ts`: three squares per guess (distance within 100 km / 500 km, same turnout, same size), the heading with the game's number and
   the score (`3/6`, `X/6`), and the address of the game; never the city's name (tests with the secret and every other city name, and no "vence/lidera").
2. **The store.** `src/lib/game-store.ts`: one guarded key; the history has only the game number and the score (never the name); it can be cleared (a reload does not put today's result back); with storage blocked,
   reads give an empty save and writes say they were not kept, nothing throws. The key is in `storage-keys.ts` and `stored-items.ts` (the data page lists it; `place-store.test.ts` compares the list with the keys written).
3. **The end screen.** In `Game.tsx`: the answer (name shown only now), the grid, "Compartilhar" through `performShare` (the system sheet where it exists) and "Copiar o resultado" (the fallback, and a button of its own),
   the countdown to the next city (Brazil's midnight, ticking only after the end), the history with "Apagar o histórico", and the storage-blocked note. The only analytics event is `game_result_shared`, with NO property,
   after a completed share or a copy (`events.ts` and `event-props.ts`, in step: `events.test.ts`).

## Screenshot review (390x844 and 1440x900; fixture `/adivinhe/` after a right guess)

Frame: "C1b Fim do jogo e resultado para compartilhar (telefone)" (new, id 45E2A0FC-2EC4-49EB-B28D-2B53651B16C8); the desktop frame "C1 Adivinhe a cidade" has the greyed share block.

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | answer | "Acertou em 3 de 6. A cidade era Cidade Gama · GO" | same sentence | none |
| 2 | grid | heading and one row per guess with 3 squares | same | none |
| 3 | buttons | "Compartilhar" and "Copiar o resultado" side by side | same | none |
| 4 | countdown, history, clear | as listed | same | none |
| 5 | grid at 390 | squares in groups | one row per guess (the frame's desktop shows groups side by side) | accepted |

Verdict: PASS.
