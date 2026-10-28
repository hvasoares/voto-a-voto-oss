# Issue #43 (The season told backwards): checkpoints

1. **The order, pure.** `src/lib/season-order.ts` (no imports): `SeasonOrder`, the ONE constant `SEASON_DEFAULT_ORDER` (`'chronological'`: a later test of which order opens better changes that line), `orderSeason` (the same episodes and the pivot, reversed: [ep1, ep2, pivot, ep3] becomes
   [ep3, pivot, ep2, ep1], the pivot staying between the 3rd and the 2nd), `readOrder` / `saveOrder` (one key, guarded). Tests: both orders, the input untouched, the default, junk in the storage, storage blocked.
2. **The switch.** `src/scripts/season-order.ts`: a group of two buttons ("Cronológica", "De trás para frente"; `aria-pressed`, 44 px, reachable by Tab, Enter and Space), a polite status line that says the new order ("Episódios de trás para frente: 2026, 2022, 2018."), the sub line and the note change with
   the order. The DOM is reordered (not just the look): reading order, focus order and the anchors follow what is seen; a link to an anchor lands on its episode after the reorder. Without scripts the switch is hidden and the page is chronological. The choice is kept in this browser (`voto-a-voto:season`,
   listed on the data page, cleared by "esquecer meus dados", compared with the writes by `stored-privacy.spec`); nothing is requested.
3. **Screenshot review**, below.

## Screenshot review (390x844, scroll 0, fixture `/tres-ciclos/rj/` after "De trás para frente")

Frame "13c Temporada de trás para frente" (id CE4D3BD2-D1B3-410A-BD55-AF8EDB18EECC).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | sub line | "Como o estado chegou até aqui · de 2026 a 2018" | "Do mais recente ao mais antigo · de 2026 a 2018" | accepted: "chegou até aqui" tells a story of cause; the neutral wording says only the order |
| 2 | order | episode 3, the pivot, episode 2, episode 1 | same | none |
| 3 | switch | "De trás para frente" active | same | none |
| 4 | note | "Os mesmos episódios e âncoras valem nas duas ordens. A escolha fica só no seu navegador." | same | none |
| 5 | other rows | as in 13b (state chooser, h2, "ver cálculo") | same differences as 13b | accepted (see issue 42) |

Verdict: PASS (no blockers).
