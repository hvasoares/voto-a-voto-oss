# Issue #22 (generated headline sentence, locale-ready): checkpoints

1. **Catalog and pure headline.** `src/lib/sentences/catalog.ts` (the one list of keys, `pt-BR` complete as a
   `Record<Key, string>`, `en`/`es` skeletons, fallback to Portuguese per key), `headline.ts` (`headline(result, place)`:
   tie, no data, overseas, tiny electorates, nobody turned out, zero valid votes, everyone voted). Numbers through
   `Intl.NumberFormat`, plurals through `Intl.PluralRules` (0 counts as "other"), lists through `Intl.ListFormat`.
2. **Wiring.** The takeaway module is replaced: the card panel shows the headline and is described by it
   (`role="group"`, `aria-describedby`), the share picture's `<title>`, the og:image alt and the share text
   (`headline + link`) are the same string.
3. **Screenshot review**, fixture state `/rj/cidade-exemplo/?turno=1` at 390x844 against the Sketch frame
   "2 Cartão da cidade, with the headline line" (page "Election SPA v3").

## Screenshot review (390x844, scroll 0, same data state)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | headline | "Candidato A vence com 52% dos votos · 30% dos eleitores não votaram" | "Em Cidade Exemplo, no 1º turno de 2026, 30% do eleitorado não votou, quase tanto quanto o Candidato B recebeu (33,6%)." | accepted: the frame's wording names a winner; the product rule is neutral wording with no winner labels (the sentence is the one already approved for the card, `takeaway`, now in the catalog) |
| 2 | headline | two lines | three lines | accepted: follows from 1; everything below moves 24 px down (the page scrolls a little at 844) |
| 3 | note under the headline | "Frase gerada dos números · também o texto alternativo" | same text, 11 px sans, ink | none (fixed: it was missing) |
| 4 | headline size, gap above, gap to Compartilhar | 18/24 serif, 26 px below the legend, 18 px above the button | same (fixed: the old rule lost to `.screen p { margin: 0 }`) | none |
| 5 | status bar "9:41", home indicator | drawn | absent | accepted-platform (prototype chrome) |
| 6 | the notice banner at the bottom | absent | present until dismissed | note: the analytics notice (#20) is not part of the Sketch frames; the capture was taken after "Prosseguir" |

Verdict: PASS (no blockers).
