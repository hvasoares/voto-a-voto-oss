# Issue #27 (Meu Brasil): checkpoints

1. **Address, model and words, pure.** `lib/meu-brasil.ts` (`parsePlaces` / `placesQuery`: `?mora=rj/x&vota=sp/y&nasceu=zz/z`, in role
   order, anything malformed dropped; `buildPlaceCard`: the three cycles of the 2nd round from the three-cycle model, a cycle without data is
   "sem dados"), `lib/sentences/meu-brasil.ts` and the catalog's `mb.*` (one place: its share of non-voters in each cycle; two or three:
   the share in each place in the latest cycle they all have; numbers only, both registers). Tests: the address encoding (round trip, order,
   malformed values, the same city in two roles), the headline for 0, 1, 2 and 3 places, no cycle in common, neutrality.
2. **Picture and page.** `lib/meu-brasil-card.ts` + `meu-brasil-content.ts` (the self-describing picture: headline, each place with the
   three cycles, voters above non-voters, legend, short address), `components/MeuBrasil.tsx` (three `PlacePicker` fields with the label
   inside, the card, `ShareActions` with the label "Compartilhar o cartão"), route `/meu-brasil/`; events `meu_brasil_place_added` (role and
   count, never a name) and `meu_brasil_shared`. From 1024 px (desktop frame "16 Meu Brasil (desktop)") the headline sits over the fields and each
   place is an HTML column; the picture is then only what is shared. Nothing is stored on the device (the places are the address), so the data
   page's list is unchanged. The entry point decided with the user: a row "Meu Brasil" in the home's "Para explorar" list.
3. **Screenshot review**, `/meu-brasil/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista&nasceu=mt/boa-esperanca-do-norte` at 390x844
   against "16 Meu Brasil" and at 1440x900 against "16 Meu Brasil (desktop)".

## Decisions

- **Headline.** The frame writes "dois lugares tiveram o mesmo vencedor; um, outro." A winner label and a comparison of places: not allowed.
  The catalog sentence gives the share of the electorate that did not vote, the same measure the bars show.
- **Side colours.** As on the three-cycle screen: the lower ballot number dark, the other grey, in every cycle.

## Screenshot review

Phone 390x844 (scroll 0, three fixture places, share API present):

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | headline | "Em 2026, dois lugares tiveram o mesmo vencedor; um, outro." (two lines) | "No 2º turno de 2026, a parcela do eleitorado que não votou foi de 32% em ..." (four lines) | accepted: neutral wording (see Decisions) |
| 2 | fields | three rows, label inside over a bold value, "×" at the right | same | none |
| 3 | card | bordered paper box, serif headline, per place name + three columns (year, dark/grey bar, beige bar, "não votou 21%") | same structure, drawn as one picture so it is what is shared; EXEMPLO tag added on fixture data; a cycle without data (Boa Esperança do Norte) reads "sem dados" | accepted: the tag and the source line are the picture's, as on every card |
| 4 | legend | "Escuro = A · cinza = B (% dos votos) · bege = % que não votou" | "Escuro = candidato de menor número · cinza = o outro (% dos votos válidos) · bege = % do eleitorado que não votou" | accepted: says which side is dark (the frame's "A/B" are illustrative) |
| 5 | button, note | "Compartilhar o cartão" 48 px; note under it | same texts; the button is below the fold (the card is taller with 4 headline lines and the tag) | accepted: follows from 1 and 3 |
| 6 | status bar "9:41", home indicator | drawn | absent | accepted-platform |

Desktop 1440x900 (fixture, three places):

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 7 | header, title | top bar; "Meu Brasil" 44 px serif; subtitle 15 px | same; title 46 px (the site's desktop title size) | none |
| 8 | headline | one line, 26 px serif | two lines, 28 px serif | accepted: follows from 1 |
| 9 | fields, columns | three fields in a row 56 px high; three bordered columns; per cycle year (serif), "votaram · A 55% · B 45%", dark/grey bar, beige bar, "não votou 21% do eleitorado" | same, with the candidates' names where the dataset has them | none |
| 10 | share button, note | centred 320 px button; note under it | same | none |

Verdict: PASS (no blockers).
