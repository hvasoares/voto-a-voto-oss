# Issue #41 (City arc from three cycles): checkpoints

1. **The arc, pure.** `src/lib/arcs.ts` (`cityArc`, `countArcs`): the winner of the 2nd round of 2018, 2022 and 2026, by
   camp (the same camps as the cohort table, `cohorts.ts`), as one of seven kinds: `same`, `switched2022`, `switched2026`,
   `returned` (A B A), `switchedTwice` (A B C, no city today), `tie` and `missing` (with their years). A missing cycle wins
   over a tie, as in the cohort table (a city with no data in an earlier cycle is outside its groups). Overseas posts have an arc
   too.
2. **The label and the data build.** `src/lib/sentences/arc.ts` + the `arc.*` keys of the catalog (closed list; standard and
   plain; a test for each template and a neutrality test). The shard build writes `arcs.json` (`{ counts, overseas }`), and
   `npm run check:shards` fails unless every city has exactly one arc and the counts add up. `arcs-cohorts.test.ts` derives
   the cities per arc from the cohort report and requires the same numbers (fixture always; the real dataset when `../data`
   exists: 5.571 cities, the 74+40+13+6+5+51 overseas posts apart).
3. **Wiring and screenshot review.** `viewArc` (card.ts) renders the pill and the line "Descreve a sequência, não a causa." in
   both registers, under the headline, in the page itself (readable without scripts; same under every tab). The feature makes
   no request: the arc is computed at build time from the city's own shard.

Real dataset (`DATA_DIR=../data npm run check:shards`): same 4.977, switched2022 281, switched2026 168, returned 141,
switchedTwice 0, tie 3, missing 1 (5.571 cities); overseas posts: 74, 40, 13, 6, 0, 5, 51.

## Screenshot review (390x844 and 1440x900, scroll 0, fixture `/rj/cidade-exemplo/?turno=1`)

Done by the author (no subagents in this run). Frames: "2 Cartão da cidade, with the arc label" (phone) and "2 Cartão da cidade (desktop, com as linhas V3)".

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | pill under the headline | "Mudou de lado em 2022", rounded paper-2 pill, accent text, 12/16 semibold | same text, size, colour and shape | none |
| 2 | the note | "Descreve a sequência, não a causa." 11 px muted, under the pill (phone), at the right of it (desktop) | same, in both places | none |
| 3 | arc and margin order | phone frame has no margin line; desktop frame: pill, margin, twin | pill, then margin (#26) | none (combined layout of the desktop frame) |
| 4 | headline, note under it, register switch | frame: two lines | longer neutral sentence + "Frase gerada..." + switch | accepted: #22 / #58 |
| 5 | status bar "9:41", home indicator | drawn | absent | accepted-platform |

Verdict: PASS (no blockers).
