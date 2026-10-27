# Issue #28 (State recap card): checkpoints

1. **Numbers and words, pure.** `lib/recap.ts` (rows from the three-cycle blocks of `compare.ts`: shares of each cycle's valid votes
   in tenths by largest remainder, changes from the UNROUNDED shares against the previous cycle with data, the 2018 pair labelled
   "PT" and "Bolsonaro" when 13 ran against 17), `lib/recap-data.ts` (the per-state aggregates of `compare-data.ts`, which already
   exclude the overseas `zz` rows), `lib/sentences/recap.ts` and the catalog's `recap.*` (the headline reads the bars aloud, the same
   words for both sides; the base of the percentages is printed). Tests: labels, one-decimal percents, the sign and size of each
   change from unrounded shares, a state with one cycle, no data, both registers, no winner or cause word.
2. **Picture and page.** `lib/recap-card.ts` + `lib/recap-content.ts` (the self-describing picture, 1080 wide), the route
   `/<uf>/resumo/` (the frame's address) and `components/RecapShare.tsx` on the existing `ShareActions` flow (`primaryLabel`, `compact`,
   `onOpened`/`onShared`); events `recap_opened` and `recap_shared`. The entry point decided with the user: "Resumo do estado ›" on
   the state page (`data-link="recap"`, counted as `state_link_tap` link `recap`).
3. **Screenshot review**, `/rj/resumo/` at 390x844 against "17 Resumo do estado".

## Decisions

- **Headline.** The frame writes "Lula passou de 32,0% a 46,2% ..." which follows one person across cycles and names a direction. The
  catalog sentence instead reads each cycle's bar aloud ("2018, PT 32,0% e Bolsonaro 68,0%; 2022, ..."): the same words for both
  sides, no inference, no reason. Product rule of the user; the frame's sentence is illustrative.
- **Side order.** As on the three-cycle screen: the lower ballot number first (13 first in the real data), left of the bar.
- **Reopening (#38).** A recap's numbers are state totals, not in any shard the browser reads, so a dropped recap card cannot be
  recomputed or checked for alteration in the browser: `/abrir-cartao/` says so and links to the recap page (itself the site's own
  drawing). Alternative, not built: a `recap.json` shard.

## Screenshot review (390x844, scroll 0, `/rj/resumo/`, share API present)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | headline | "Em São Paulo, Lula passou de 32,0% a 46,2% dos votos válidos entre 2018 e 2026." | "Em Rio de Janeiro, no 2º turno, os votos válidos foram: 2018, A 47,5% e B 52,5%; ..." | accepted: neutral wording (see Decisions); the fixture state is RJ with "Candidato A/B" |
| 2 | bar labels | "PT 32,0%", "Lula 44,8%", "Flavio 53,8%" | "A 47,5%", "B 52,5%" | accepted: the fixture dataset's candidates are A and B; "PT" appears where 13 ran against 17 (unit-tested) |
| 3 | rows | year bold + "Ponto de partida da série" / "+12,7 pp vs 2018", bar 26 px | same texts and structure, bar 100/1080 of the picture | none |
| 4 | base note | "Base: votos válidos do 2º turno, sem o exterior. Variações calculadas sem arredondar. Fonte: TSE." | same, plus the source line "Dados fictícios" in fixture | accepted: the picture states its source |
| 5 | address | "votoavoto.exemplo.br/sp/resumo" | "votoavoto.exemplo.br/rj/resumo" | none (state) |
| 6 | button, link | "Compartilhar o resumo" 48 px, link "Ver os três ciclos do estado ›" 16 px under it | same texts; 44 px button; the link has a 44 px tap area and sits ~40 px lower | accepted: tap target rule |
| 7 | status bar "9:41", home indicator | drawn | absent | accepted-platform (prototype chrome) |

Verdict: PASS (no blockers).
