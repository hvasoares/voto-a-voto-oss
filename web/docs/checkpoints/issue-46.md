# Issue #46 (City replay): checkpoints

Where it lives: the frame "9b Replay da cidade" is the THREE-CYCLE page of the city (`/<uf>/<slug>/tres-ciclos/`, screen 9 of #6), the page the ticket is blocked by; the city card (whose html budget has no room) is untouched.

1. **The frames, pure.** `src/lib/replay.ts` + `src/lib/sentences/catalog-replay.ts` (data only): `buildReplay` orders the cycles 2018, 2022, 2026 and splits what has a result (a frame) from what has none (`missing`), `replayAlt` is the text alternative with the result of
   every cycle, `missingText` names the missing cycles. A city with no cycle has no frame (the page already says "sem dados"); with one frame there is no play button, only the card and the note. Tests: order, a missing cycle, no cycle, the alternative, round 1's third side, and neutrality (no
   winner, no change, no why).
2. **The replay, in the browser.** `src/scripts/city-replay.ts` (`mountReplay`): HTML + SVG + CSS (`src/styles/replay.css`, loaded by this page only, the shared stylesheet is at its budget) drawn from the shares the page's own static blocks carry (`.bar__seg[data-pct]`). Plays once when it
   comes into view (2018 -> 2022 -> 2026, 1.7 s a step), stops at the last ("Ver de novo"), "Pausar", a tap or Enter on a year jumps to it and a later step never overrides a pick (only the latest request wins: every call bumps a token). Marks `data-replay="ready"` on the page and
   `data-replay-state` / `data-replay-year` on the box for the specs. A round switch destroys the old replay and draws the other round's. With reduced motion, without scripts, or in a chat preview (no scripts) there is no replay and the static blocks below ARE the static card.
3. **Screenshot review**, below.

## How "drawn at build time from the city's numbers" is met

The numbers are the build's: the shares of each cycle are the pre-rendered, fact-gated numbers of the static blocks (`data-pct`, `title`), and the replay only lays them out one after the other; it computes nothing and fetches nothing. The replay itself is drawn in the browser, NOT emitted at build, by decision of
the user's size constraint (5.570 cities x per-city drawings and files). What the full variant would cost, not built: a pre-drawn SVG + CSS animation in each of the 5.570 three-cycle pages, two rounds, about 3 KB raw per round: ~33 MB raw and ~+8 to 10 MB in the compressed site (an estimate, not measured), under the 100 MB / 2 minute
line but against the user's decision. What the browser variant gives up: nothing is pre-drawn for a visitor whose script is late (the static blocks are there at once).

## Size budget per city (no budget changed)

| | before | after |
|---|---|---|
| html of the page (gzip) | +0 | +~20 B: `data-name` on the page's container (the city's name for the text alternative) |
| files per city | 0 | 0 (nothing emitted) |
| JS of the page, gzip (real-data build, `scripts/measure.ts`, 390x844) | 2928 | 4895 (+1967 B: the replay, the words, in the page's own script; this page only) |
| CSS | 16320 (shared, unchanged) | 16320 + `replay.css` (~1 KB raw, ~0.5 KB gzip, this page only) |
| data | 0 | 0 |

The audited routes (home, city card, map, report) are unchanged by #46. Real-data build: see the numbers posted on the issue.

## Screenshot review (390x844, fixture `/rj/cidade-exemplo/tres-ciclos/?turno=1`, paused on 2022)

Frame "9b Replay da cidade" (id 4BBC9934-3873-46B1-BF53-623A744CDDDA).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | box top | "REPLAY · 2018 → 2022 → 2026" and a Pausar pill | same text; the pill reads "Pausar" while playing and "Reproduzir" / "Ver de novo" otherwise, 44 px high | none |
| 2 | year, bar | serif year, bar "A 49%" "B 51%" | same | none |
| 3 | scrubber | line with three circles, labels 2018, 2022 (bold), 2026 | same (the circle was stretched at first: fixed, `preserveAspectRatio`) | blocker, fixed |
| 4 | blocks | the three static cycle blocks below | same | none |
| 5 | missing cycle | a box "Dados de 2018 e 2022 ainda não foram coletados" | a line in the replay box: "Sem dados de 2018 e 2022: o replay mostra só o que existe." | accepted: one sentence of the catalog |
| 6 | footer note | at the foot of the page | inside the replay box | accepted |
| 7 | status bar "9:41", home indicator | drawn | absent | accepted-platform |

Verdict after the fix: PASS. Known: the box is inserted after the first paint, so the blocks below move once (a layout shift of about 190 px); a placeholder would show an empty box without scripts, so it was not reserved.
