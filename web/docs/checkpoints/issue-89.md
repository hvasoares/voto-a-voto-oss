# #89: card labels in the visitor's words

## What changed
- Register pair: `register.standard` is "Texto integral" (was "Padrão"); `register.plain` unchanged; stored value, aria-pressed and accessible names unchanged.
- Comparison link: "Comparar com 2022 e 2018" (sub-line "Margem e virada, por estado"). TRAP 1 checked: the link goes to `/comparar/2022/`, whose `cycle-tabs` offer 2022 and 2018 (two pages, one click between them). So the old claim "opens both" was only true through the tab; the label is true as "the page that offers both". Destination unchanged.
- "ver cálculo" on the card is now "De onde vem este número?" through the NEW catalog key `fact.link.card` (`catalog-facts.ts`) and `cardCalcLink` in `lib/facts/link.ts`. `calcLink` (state, Brasil, comparar, reports, fact pages, Meu Brasil) keeps `fact.link` = "ver cálculo": the ticket is about the card. Used by `shared/components.ts`, `slots/city/card.ts`, `slots/city/curiosities.ts`. Note: `calcLink` never emitted a `data-link`; the address (`/fato/...#anchor`) is the same as before.
- Small segments: the 2-letter tiers (Ab, Br, Nu, Ou) are gone. `segmentText` takes the longest tier that fits (`roomOf`), else nothing. Card: the legend row carries label and share. Three-cycle page: `notVotedBar` prints a caption `<p class="cycle__label" data-bar-caption>Brancos 9% · Nulos 9%</p>` under the bar when a segment has no text; the "Br = brancos · Nu = nulos" footnote is removed. The share poster (`share-card.ts` ABBR) still abbreviates: it has no legend, out of scope (decision for the owner).
- Bar `title` is dropped when the text already says it (not-voted long tier): saves bytes.

## Two layout bugs the longer wording exposed (fixed, CSS about +50 B)
1. `.turnout__title` float: a link that wrapped below the title squeezed the whole bar to 148 px beside the float. Fix `display: flow-root`.
2. Legend rows (fixed height, link inside the narrow label column) and curiosity links (grid column of 76 px) wrapped over each other. Fix: legend label is `display: contents` on the phone, link on its own line (`order:1; flex: 0 0 100%`); desktop restores the block label; curiosity link `grid-column: 1 / -1`.

## Budgets (measured with `scripts/measure.ts dist --path /rj/cidade-exemplo/`, fixture build, base "/")
- city html gzip: before 6551 B, literal replacement 6578 B (over 6553.6), after dedupe 6546 B. Budget 6.4 KB unchanged. check:perf green.
- shared CSS gzip: 15184 -> 15234 B (budget 16384).
- Literal wording on every link fits; no deviation. Margin is only 7.6 B: the next ticket touching the card html must measure.

## Tests
`e2e/card-labels.spec.ts` (new, 15 tests: pair, comparison link and its tabs, every calc link wording, no clipped or initial segment on card rounds 1/2 and three cycles, bar not squeezed, model at 0.5..16%), 10x clean with city and desktop-pages on phone+desktop. Updated: city.spec, desktop-pages.spec, card/curiosities/components/cycles-model unit tests. Full `make e2e` 791 passed; vitest 1636; tsc, check:facts green.

## Sketch (page "Election SPA v3")
Frames changed: 4935B6A0, 010178A4, 60C673A1, 785740D3 (verified by screenshot), 35EC323A, 01AA7E3E, AACADE1A, 7BCB1D41, C2A39DC9, 5DBC0BE2: "Padrão" -> "Texto integral", comparison link, 18 calc texts, "Br"/"Nu" hidden. KNOWN DIFFERENCE (not re-flowed): in the frames the title-row link overlaps the title; the code wraps it to the line below, right-aligned.

Captures: `ux-review/2026-10-27/89-{antes,depois}-{card-r1,card-r2,tres-ciclos}.png`, `89-depois-desktop.png`.
