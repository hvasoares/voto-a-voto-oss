# Issue #26 (Quanto faltou para virar): checkpoints

1. **The margin sentence, pure.** `src/lib/sentences/margin.ts` (`marginVotes`, `marginLine`) and the `margin.*` keys of the
   catalog (standard and plain Portuguese; en/es fall back). The margin is the votes between the two most voted candidates
   of the round; "cabem N vezes" is the whole number of times it fits in the people who did not vote. Cases: a tie (and so a
   zero margin, also with three candidates level) is "Empate na frente: a diferença ... é de 0 votos"; a margin larger than
   the non-voters says "mais do que os N que não votaram"; nobody stayed home leaves out the second clause; no valid votes,
   no data or a single candidate with votes give no line. Singular and plural come from the plural pairs.
2. **Wiring.** The line sits under the headline, in both registers, per view (`viewMargin` in `slots/city/card.ts`, one
   panel per view like the sentence, so no script is needed for the default view and switching makes no request). The share
   text is `headline + margin line + link` (the picture's text alternative stays the headline).
3. **Screenshot review**, fixture state `/rj/cidade-exemplo/?turno=1` at 390x844 and 1440x900 against the frame "2 Cartão da
   cidade, with the line added" (page "Election SPA v3").

## Screenshot review (390x844, scroll 0, same data state)

Done by the author (a fresh-context reviewer could not be launched in this run: no subagents).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | line under the headline | "Faltaram 2.800 votos para virar: cabem 10 vezes nos 30.000 que não votaram." 14/18 sans, ink, two lines, 12 px under the headline | same words and size (fixed: it first lacked the 14/18 rule) | none |
| 2 | headline | two lines, serif 18/24 | three lines, plus the "Frase gerada..." note and the register switch above | accepted: #22/#58 (the neutral headline is longer than the frame's; the note and the switch are G1) |
| 3 | Compartilhar | fully in view at 844 | starts at the fold (the page scrolls a little) | accepted: follows from 2 |
| 4 | status bar "9:41", home indicator | drawn | absent | accepted-platform (prototype chrome) |

Desktop (1440x900, "2 Cartão da cidade (desktop, com as linhas V3)"): the line is under the headline in the right column,
16/21 sans; the arc pill (#41), the twin (#31) and the curiosities card (#33) are those tickets' rows.

Verdict: PASS (no blockers).

## Spot check (ten cities, real data)

Recorded on the issue (comment): margin, non-voters and the "cabem N vezes" of ten cities against `data/votes.csv` and `data/turnout.csv`.
