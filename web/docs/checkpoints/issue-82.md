# Issue 82: the bars of the City card name the candidates

## Sketch
The "2 Cartão da cidade" family on "Election SPA v3" (18 text layers over the frames that draw the voted bar) now reads "Lula 52%" / "Flavio Bolsonaro 48%" in place of "A  52% dos votos" / "B  48% dos votos"
(the legend below keeps its rows). Screenshot-verified on "2 Cartão da cidade, com o seletor de linguagem simples" (`010178A4-1566-4175-8A1D-52CC5C981CB3`).

## What was built
- `shared/components.ts`: the two candidate segments print `name + share` (`candidateText`). It gives way in steps, wrapping before it shortens: "Flavio Bolsonaro 48%", "Flavio" over "Bolsonaro 48%",
  "Flavio Bolsonaro" over "48%", "Flavio" over "48%", "48%", and nothing only in a sliver (a segment under about 5% of the bar, 16 px, cannot hold a legible share; the legend row below has it).
  Never a bare initial, never "A"/"B". `.bar__seg` got `text-align: center` so two lines centre.
- `sideName(label)` is the ONE place the bars read a candidate's display name from (#84 replaces its body with the central table; the layout does not change). The poster/link preview/three-cycle bars already
  printed names and were not touched.
- The `role="img"` text alternative now carries the numbers: "Votaram, por candidato: Lula 52%, Flavio Bolsonaro 48% dos votos" (before, a screen reader got only "Votaram, por candidato"). Order is the ballot order of the data, never by result.
- The segment `title` is printed only when the text had to give way (it said the same thing as the text, which paid the bytes of the names twice); "dos votos" left the visible text (the legend rows and the aria-label say it).
- The plain-language register does not touch the bars (both registers share the picture), so both are consistent by construction.

## Measurements (fixture /rj/cidade-exemplo/, phone, scripts/measure.ts)
html gzip 6549 -> 6539 B (budget 6.4 KB = 6554), css gzip 16353 -> 16357 B (budget 16 KB = 16384), js unchanged 6263 B. No budget moved.

## Deviations
- A sliver segment (< about 5%) still prints no text (title and legend carry it): the ticket's "o percentual nunca some" holds for every segment wide enough to hold two characters.
- Before/after capture: `ux-review/2026-10-27/08-city-card-rj.png` (before, from the review) and `08-city-card-bars-after-82.png` (after: the real names "Flavio Bolsonaro", "Veterinário Wilson Grassi", "Constituinte Eymael", slivers; rendered
  by the production component into the built page at 390x900, because the dev server cannot start on real data within its 30 s limit and a real-data build of 5.760 cities is the release step's job).
