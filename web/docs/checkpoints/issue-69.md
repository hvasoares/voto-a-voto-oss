# Issue #69 (Adivinhe a cidade: the daily game): checkpoints

1. **The rules, pure.** `src/lib/game.ts` + `src/lib/sentences/catalog-game.ts`: the daily pick (`dailyIndex(date, daily)`: the day number counted from 2026-01-01 in Brazil's time,
   modulo a precomputed order, the same for everyone), the closed list of FIVE clues (`size`, `turnout`, `swings`, `region`, `state`; one rule each, a test per rule; a test runs every clue
   over every kind of city and requires no candidate, party or winner word), clue `i` opens after `i` guesses, distance and direction (8 points) from the IBGE municipality centres
   (#40, `distanceKm`), and for the secret city "more, less or equal" turnout (whole percent) and size (five bands by registered voters).
2. **The data.** `/adivinhe/dados.json` (`src/lib/game-data.ts`, one file for the country, fetched only by the game page): per city `[uf, slug, name, lat, lon, aptos, turnout, swings, region]` for
   the cities with a 2026 2nd round and a centre, and `daily` = a seeded shuffle of the cities with all three cycles and no tie. A city with a missing cycle or a tie has `swings = -1` and is never
   the daily city, but can still be guessed (its distance, turnout and size are known). The file holds no candidate, party or winner (a test). Real dataset: see the measurements below.
3. **The page.** `/adivinhe/` (desktop frame "C1 Adivinhe a cidade" + the new phone frame): the island `Game.tsx` over that one file; the city field is the Meu Brasil one (same ranking, search shard);
   the answer shows only at the end; the game state is in the browser, nothing about a guess is sent (e2e: only GETs of the site's own files, none carrying a city of the game).

## Where the game state lives

One localStorage key, `voto-a-voto:game` (today's guesses and the history, #70), listed on the data page and cleared by "esquecer meus dados". With storage blocked the game plays in memory.

## Screenshot review (390x844 and 1440x900; fixture `/adivinhe/`, the clock fixed at 2026-10-27, three guesses)

Frames: "C1 Adivinhe a cidade (desktop)" (existing, id 8F8D1542-B23C-4936-B258-781BAE74815E) and "C1 Adivinhe a cidade (telefone)" (new, id ABCB31AB-E35C-408B-9C1F-FA37C23144E8).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | clue cards | opened ones with an accent border, closed ones muted "Revelada após o Nº palpite" | same | none |
| 2 | clue opening | clue 1 after guess 1 ... clue 5 after guess 5 | same | none |
| 3 | guess form | field and "Enviar" aligned | the picker's own label pushed "Enviar" up | blocker, fixed (aligned at the bottom) |
| 4 | table at 390 | "= igual" in one line | wrapped in two | blocker, fixed (no wrap, 13 px) |
| 5 | placeholder rows 4 to 6 | a rule | a number and a rule | accepted |
| 6 | share block | present, greyed before the end | appears at the end only (no empty block to read) | accepted (#70) |
| 7 | notice banner | absent | the site's notice at the foot of the first screen | accepted |

Verdict after fixes: PASS.
