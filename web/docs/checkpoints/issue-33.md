# Issue #33 (Peer-relative curiosity card): checkpoints

1. **Ranking, pure.** `src/lib/curiosities.ts`: the measures (turnout change, margin, blank+null share), the group (size band
   + same cycles), the rank, the choice of up to three facts, the minimum group and the rank cap. Method in `docs/curiosities.md`.
   Tests: ranks, ties, "queda"/"alta" by the city's own change, band separation, minimum group, the cap, determinism, the file.
2. **Data and wording.** The shard build writes `curiosities.json` (the fixture uses a minimum group of 2); the `curio.*` keys
   of the catalog (standard and plain), `curiosityCard` (every fact prints its rank, group size and cycles; the note says it is a
   comparison, not a finding). Tests for the wording rules (no irregularity word outside the "not an indication" line).
3. **The two places, screenshot review.** Desktop: the card under the figures (3 columns). Phone: `/<uf>/<slug>/curiosidades/`
   with a link from the card (the frame is its own screen; the ticket lists no other entry point, and the link is the minimum
   needed to reach it) and the way back. Cities with no fact have neither.

## Screenshot review

Done by the author (no subagents in this run). Phone `/rj/cidade-exemplo/curiosidades/` at 390x844 against "21 Curiosidades da cidade";
desktop `/rj/cidade-exemplo/` at 1440x900 against "2 Cartão da cidade (desktop, com as linhas V3)".

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | numerals, wording | "3ª / 12ª / 5ª", "Grupo: 48 cidades · 2022 → 2026 / 2026 / 2018, 2022 e 2026" | "1ª" and groups of 2 to 4 cities (the fixture has 8 cities, so its minimum group is 2); the same wording and cycle formats | accepted: illustrative numbers in the frame; the fixture cannot have 48 cities in a band |
| 2 | fact order | queda, diferença, parcela | by rank / group size (smallest first) | accepted: the choice rule is data-driven |
| 3 | note box | rounded paper-2 box above the facts, "É uma comparação ..." | same text and box | none |
| 4 | fact cards | rank 44 px serif accent, text serif 17/22, hairline, group line 11 px | same (fixed: the shared `.screen p` margin rule first flattened the spacing; the group line had no gap) | none |
| 5 | footer text, "‹ Voltar ao cartão da cidade" | centred 11 px muted; accent 12 px link | same | none |
| 6 | header | no fixture banner drawn | the EXEMPLO banner of every fixture page | accepted: not part of the frames |
| 7 | desktop card | three columns, 32 px rank, 12 px text, group line 10 px, note at the bottom in muted 11 px | same | none |
| 8 | status bar "9:41", home indicator | drawn | absent | accepted-platform |

Verdict: PASS (no blockers).
