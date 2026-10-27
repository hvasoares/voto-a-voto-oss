# Issue #61 (Fact records with "ver cálculo" on the City card): checkpoints

Sketch frames created for this ticket (page "Election SPA v3"): **"2 Cartão da cidade, com ver cálculo"** (`785740D3-46D0-4B4C-BDBF-6D949E880A5A`, copy of "…with the line added" with
the links; legend rows 34 px, the link under the label) and **"Fato (página do cálculo)"** (`5752EB0D-7E1A-4AD3-8692-430C2A222F0F`). Made without the user's approval (the user was away): edit them and the build follows.

1. **The record, pure.** `src/lib/facts/model.ts`: ids, the records of a view (sentence, inputs, formula, worked line, source, method), the curiosities' records; catalog `fact.*`.
2. **The gate.** `gate.ts` (`factProblems`, `gateProblems`, `factLinks`), failing fixtures; `integrations/facts-gate.ts` after the build; `npm run check:facts`.
3. **The card and the page.** "ver cálculo" beside every figure (`shared/components.ts`, `slots/city/card.ts`), `/fato/<uf>/<slug>/<ciclo>-<turno>/`, `fact.css`; the a11y fix of the consent banner link (it had no
   underline: axe `link-in-text-block` showed once the page was taller).
4. **Measurement, budget, docs.** `docs/facts.md`, the city html budget 6.2 -> 6.4 KB (`docs/perf-budgets.md`).

## Screenshot review

Done by the author (no subagents). Phone `/rj/cidade-exemplo/?ciclo=2026&turno=1` and `/fato/rj/cidade-exemplo/2026-1/#a` at 390x844, desktop card at 1440x900; frames above.

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | turnout titles | "ver cálculo" right-aligned in the title line, accent 11 px underlined | same | none |
| 2 | legend rows | 34 px rows, label and the link under it (10 px) | same (rows were 24 px: fixed to 34 in screens.css) | fixed |
| 3 | sentence and margin line | link under each, 6 px gap | same | none |
| 4 | desktop legend | not in the frame (phone frame only) | the link follows the label on one line (rows were already 34 px) | accepted: the desktop frame "com as linhas V3" predates the links |
| 5 | fact page, records | one record expanded and highlighted, two others compact below ("Os outros números deste cartão") | every record of the view fully expanded, the one linked highlighted (accent border, paper-2 fill) and scrolled to | accepted: records are anchors of one page (see docs/facts.md); a collapsed state would need a script or `:target` tricks that hide the others when the page is opened without a fragment |
| 6 | fact page, source block | "Fonte e edição": TSE link, edition link | adds the dataset dictionary link and the method note; the sentence in both registers (the page's register switch is the city card's saved choice) | accepted: more, not less |
| 7 | numerals, names | "Cidade Exemplo", 70.000/100.000 | the fixture's real figures | none |
| 8 | status bar "9:41", home indicator, fixture banner | drawn | banner yes, the rest absent | accepted-platform |

Verdict: PASS (no code-fixable blockers; #5 is a design decision recorded for the user).

## Phone first load, before/after (`scripts/measure.ts dist --path /rj/cidade-exemplo/ --size 390x844`, fixture)

| | before (81780e6, recorded in issue-33.md) | after |
|---|---|---|
| JS gzip / raw | 5064 / 10155 | 5064 / 10155 |
| data | 0 | 0 |
| CSS gzip | 15605 | 15697 (+92, the `.calc` rules; budget 16 KB) |
| HTML gzip | 6106 | 6475 (+369; budget 6.2 -> 6.4 KB) |
| requests | same | same (e2e: no /data/ and no /fato/ request) |
