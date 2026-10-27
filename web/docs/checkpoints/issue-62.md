# Issue #62 (Fact records, "conferido" seal and sentence-to-data highlight on the other pages): checkpoints

Status: **partial**. Done: the seal, the gate over the other pages, the highlight, the records of Brasil e regiões, Comparar com 2022 / 2018, Três ciclos por estado and the report Disputas mais apertadas.
Not done: five reports and the hub (list in `docs/facts.md`).

Sketch frames created (page "Election SPA v3 desktop", made without the user's approval; the build follows them): **"13 Três ciclos por estado (desktop, com o selo conferido)"**
(`6584D067-D2B2-48A7-8EC1-8884D9C6E8AA`) and **"13 Três ciclos por estado (desktop, frase destacada)"** (`44CB80D1-4D66-4DD0-8F1D-CC93843C2294`).

1. **Generalised records.** `Fact.scope`, one route `/fato/[...path]/`, `Fact.checks`; ids keep the city form.
2. **The seal.** `checks.ts` (national and municipality cross-checks), `checks-load.ts`, catalog `seal.*`, `Seal.astro`; tests with failing fixtures.
3. **Other pages.** `other.ts` (Brasil, Comparar, Três ciclos por estado, Disputas), `pages.ts`, "ver cálculo" and the seal on the pages; `facts-gate` covers them.
4. **The highlight.** `FactHighlight.tsx` (jsdom tests), `parse.ts`, `e2e/desktop-fatos.spec.ts` (click, keyboard, touch, no JS), phone: island absent from the network log (`e2e/fatos-paginas.spec.ts`).

## Screenshot review

Done by the author. Desktop `/tres-ciclos/rj/` at 1440x900 with a sentence chosen, against the two frames above; phone at 390x844 for the links and the seal.

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | sentences | three sentences, one per cycle, the 2022 one chosen (paper-2, accent border) | first build listed all nine records' sentences; fixed: only the change line (or start) of each cycle is a button | fixed (was code-fixable) |
| 2 | bar | outline 3 px accent around the 2022 left segment | same | none |
| 3 | table | Ciclo, Lula, Rival, Variação; the 2022 left cell outlined | same, headers "Parcela A / B" (the fixture's names are "A"/"B"); the cells of the share and of the change are lit | accepted: names come from the data |
| 4 | calculation box | title, two inputs, formula, worked line, "ver cálculo ›" | same, plus the change's own lines below the share's | accepted: more, not less |
| 5 | seal | box paper-2, accent border, title, one line per cycle, the generated-note | same text shape (numbers are the fixture's) | none |
| 6 | "ver cálculo" under bars | right-aligned 11 px | right-aligned (fixed: was left) | fixed |
| 7 | frame A has no highlight panel, frame B no seal | each frame draws one feature | the page has both, panel above the seal | accepted: two frames, one page |
| 8 | fixture banner, cookie notice | absent | notice bar over the page in the capture | accepted-platform |

Verdict: PASS (no code-fixable blockers).

## Phone first load, before/after (`measure.ts`, fixture, 390x844; before = 81780e6 built in a scratch copy)

| page | JS gzip | data | CSS gzip | HTML gzip |
|---|---|---|---|---|
| /tres-ciclos/rj/ | 1755 -> 1755 | 0 -> 0 | 15605 -> 15771 | 3885 -> 6508 |
| /brasil/ | 1755 -> 1755 | 0 -> 0 | 15605 -> 15771 | 3810 -> 4121 |
| /comparar/2022/ | 1755 -> 1755 | 0 -> 0 | 15605 -> 15771 | 3423 -> 3769 |
| /relatorios/disputas-mais-apertadas/ | 2217 -> 2217 | 0 -> 0 | 15605 -> 15771 | 4016 -> 4350 |

No new JS, CSS file or data on a phone; CSS +166 B gzip (the `.calc` and `.seal` rules, same file). HTML +0.3 KB per page for the links and the seal; Três ciclos por estado +2.6 KB (three seal lines
of about 190 characters each, the links, and the island's wrapper and props). On desktop the island adds its JS (74 KB gzip, the shared React runtime included) and one request for the page of the calculation (5 KB).
None of the audited budgets (home, city, mapa, report) changed in this ticket (`npm run check:perf`).
