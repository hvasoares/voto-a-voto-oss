# #83 Estado: search first, ONE coloured list, a tap opens the City card (D1 + owner's request)

Two checkpoints, two commits: (1) the page, island, script, tests (a378100); (2) the real-data spec and this note.

## What the page is now (390 px, and the same order from 768 up)
`‹ Início`, title, count (`6 municípios`) with its "ver cálculo", **search box**, a `aria-live` status line (hidden until typing), **the island** (Lista | Mapa toggle, then the coloured rows, legend), the state links, the seal. The plain names-only list (`[data-state-list]`, `.state-row`, `rowMarkup`, `resultsMarkup`, their CSS and unit tests) is gone; nothing else used them. The count record, "ver cálculo" and `Seal` did not move.

## Decisions
- **ONE list, two states of the same rows.** The rows are the island's pre-rendered Lista rows (`CityMapMap.tsx` `Lista`): chip, name, margin pp, valid votes, `href` `/<uf>/<slug>/`. The search filters those very elements by toggling `hidden` on them (no re-render, no markup built per keystroke).
- **Where the query lives: in the input's value, nowhere else.** The search is plain DOM, outside React (`src/scripts/state-search.ts`), so it works before and after hydration. The first keystroke may be the visitor's first interaction: on a phone the island hydrates on the first TAP, and typing is not a tap, so on a phone the island usually stays dry while the visitor searches. `apply()` is synchronous (nothing async, so only the latest text can ever be drawn) and runs at start too (a browser that restores the typed value after Back, or text typed before the module ran, is applied when the script starts).
- **Hydration keeps the filter** because React never sets `hidden`: hydration and re-renders leave the attribute alone (tested: a MutationObserver counts rows coming back during hydration: 0). The one thing that drops it is a FRESH mount of the list (back from the map view): the island dispatches `city-list:mounted` from a layout effect (before paint) and the script applies the current text again. Tests wait on `data-filtered` of `[data-state-search]`: `off`, `none` or the number of rows shown, written after the DOM changed.
- **Matching** is `shared/city-search` (`searchCities`): accents, case, punctuation, every typed word must match, a word matches as word prefix or substring (a single letter such as the "d" of "cidade exemplo d" is inside "cidade", so the fixture's A..E cities cannot be told apart by their letter; the fixture test uses "b", which is the only letter not inside "cidade exemplo"). Minimum 2 characters, like Home. **The list keeps its own order (valid votes) while filtered**; the Home's rank order is not applied (so São Paulo stays first for "sao"). A count line: "N município(s) encontrado(s)", or "Nenhuma cidade encontrada em UF. Confira a grafia."; erasing restores everything. Enter opens the city only when exactly one is left; with several, nothing happens. `enterkeyhint="search"` stays.
- **Mapa view choice: typing while the map shows switches back to the list.** The alternative (hiding the box) would remove the way back to the search and read as a bug; switching is what the visitor asked for by typing, and the URL drops `?vista=mapa`. The text stays in the box, and going Lista -> Mapa -> Lista keeps the filter (applied again on mount). If a visitor taps Mapa AND types before hydration, the map wins at mount and the text stays; the next keystroke returns to the list.
- **D1.** The row `onClick` interception (`stop`) is gone. `scripts/map-pending.ts` no longer keeps or swallows a tap on a list row (it only kept shapes/tiles that exist); a tap on a row follows the link hydrated or not, before hydration included (before: a pre-hydration tap on a row was swallowed too). The selection + "Abrir cidade" panel belongs to the Mapa view only (it is no longer rendered under the list: it used to sit thousands of px below, and nothing in the list could change it); `?vista=mapa` and the toggle-tap-during-hydration (`data-pending-vista`) work as before. `/mapa/<uf>/` hosts the same island: its list rows navigate too.
- **Row a11y.** The rows had an `aria-label` that did not contain the visible text (axe `label-content-name-mismatch`, also on the old code). Now the name is the row's own text: the figures are visible and "à frente"/"votos válidos" are `sr-only` words inside the spans; axe is clean on the page, filtered or not.
- **Type scale (#86):** name 16 px (`text-step-2`), margin and votes 13 px (`text-step-1`; the old votes were 11 px, below the floor), toggle 13 px, search box 16 px, count line 13 px; weights 400/700 (spec asserts it). Rows are `min-h-11` (44 px) and `content-visibility:auto` with a 45 px intrinsic size, so 853 rows cost layout only for what is near the viewport.
- **Desktop (>= 1024).** The approved desktop frame "5 Estado (desktop)" already had a filter box above the list, below a map card, and 7 plain rows with the two shares and "Carregar mais". The same order (search, toggle, ONE list) reads right in the 720 px column, so it applies everywhere; the frame was updated (see below). Without the island the column keeps full width (`.state-map--island` is `display:block`; it was a flex row that shrank the island to its content, visible at 1440 as a list narrower than the search box). Desktop's own larger sizes elsewhere are untouched.
- **No-JS:** the full coloured list is there as native anchors; the `noscript` note now says "A busca precisa de JavaScript. A lista abaixo mostra todas as cidades." The Sketch-fixture hook (`?fixture=sketch`, which rewrote the old plain list for the old frame) and its capture test were removed with the list.

## For #100 (the state-story link on this page)
Put it in the header block between the count line and the search box (after `calcLink(...)`, before `<div class="state-search" data-state-search>` in `src/pages/[uf]/index.astro`), or inside `<nav class="state-links">` below the list. Do NOT put anything between the search box and the island (the status line `[data-state-results]` and the island must stay adjacent to the box) and do not add a second list of cities.

## Measurements (real build, phone 390x844, `scripts/measure.ts`, gzip bytes; before = HEAD 567b176 built into a scratch copy)
| page | html before | html after | JS before | JS after | CSS before | CSS after |
|---|---|---|---|---|---|---|
| /sp/ (645) | 102606 | 88495 (-13.8%) | 4859 | 4275 | 15358 | 15184 |
| /mg/ (853) | 135220 | 116219 (-14.1%) | 4859 | 4275 | 15358 | 15184 |
| /rj/ (92) | 22872 | 20353 | 4859 | 4275 | 15358 | 15184 |
| /mapa/rj/ | 20888 | 19725 | 2432 | 2459 (+27, `map-pending`) | 15358 | 15184 |
| / (Home) | 8830 | 8829 | 3767 | 3767 | 15358 | 15184 |
No data requests on any of them. The hydrated island chunk (`CityMapMap`, loaded on the first tap only) grew 5330 -> 5504 B gzip. Shared CSS 15355 -> 15183 B: room is now about 1200 B of 16384 (a plain list's rules left; the `.state-note` and search-box rules moved to the scale). Budgets unchanged, `check:perf` green.
One keystroke on the real pages (input event to the drawn filter, `real-data-estado.spec.ts`): SP 645 rows 0.5 ms (1.5 ms with the layout it causes), MG 853 rows 0.7 ms (2.0 ms).

## Tests
- vitest 1635 (island: list rows are plain links, no panel in the list, `city-list:mounted` on every mount, typing leaves the map view; `map-pending`: list rows untouched, shapes kept).
- `e2e/state.spec.ts` rewritten (25 tests, phone): order and ONE list, rows look like the island's rows, filter by accents/case/partial with count and empty message and restore, tap opens the card (filtered or not), Enter, keyboard order, no request while searching, typing before hydration (island chunk held back) and typing before even the page script runs, hydration never un-hides a row, Mapa view panel and filter surviving Lista -> Mapa -> Lista, typing while the map shows, no-JS list and native tap, no horizontal scroll at 390/768/1440, 44 px, type scale, axe (unfiltered, filtered, empty). `tap-targets.spec.ts` has the Estado page (search box, toggle, every row, state links, before and after typing). `mapa-rj`, `mapa-uf`, `real-data-mapa-rj`, `real-data-mapa-uf`, `capture-mapa-rj` changed to tap shapes / open the Mapa view where they used to tap a row to select. 10x repeat: state, mapa-rj, mapa-uf, mapa, tap-targets, desktop-pages, desktop-mapa on phone + desktop: 1170 passed. Full `make e2e` equivalent (phone + desktop): 776 passed, 8 skipped. One unrelated desktop-home focus-ring flake under 9 workers (passes 10/10 alone).
- Real data: new `e2e/real-data-estado.spec.ts` (SP and MG: order, 645/853 rows, tap on the capital's row opens its card, filter against an independent count, keystroke time, typing before hydration) plus `real-data-mapa-rj` and `real-data-mapa-uf`: 23 passed once on a real build (about 8 min to build).

## Sketch (page "Election SPA v3" and "Election SPA v3 desktop")
- NEW mobile frame "5 Estado (celular): busca + lista colorida" `7DF45593-CFF9-4FED-9516-AE0BDE96F0FF` (copied from the old "5 Estado (opcional)" of v2; search first, the Lista | Mapa toggle, nine coloured rows with chip, name, margin, votes), screenshot-verified.
- UPDATED desktop frame "5 Estado (desktop)" `B97CD0C6-6C8D-422D-9091-DDEFEE1E78BE`: search above everything, toggle, coloured rows (chip, name, margin, votes), map card, chevrons and "Carregar mais" removed; screenshot-verified.

## Screenshot review (390x844 fixture RJ vs the new frame; captures in `.captures/state-83/`, untracked)
| difference | severity | where | outcome |
|---|---|---|---|
| row names and margins were the link teal, the frame has ink | low | rows | fixed (`text-foreground`) |
| island narrower than the search box at 1440 | medium | `.state-map--island` | fixed (`display:block`) |
| count line tight under the focus ring | low | `[data-state-results]` | fixed (8 px) |
| the legend's last sentence said "toque ... para ver os totais" under the list | low | `Escala` | list view now says a tap opens the card |
| frame shows nine rows with no legend/notes below, the page shows legend, notes and links | none | below the list | frame illustration only; the legend stays under the list as before |
| fixture banner wraps to two lines; fixture "Sem contorno" note | none | fixture data | not frame content |

## Not done / open
- The legend (colour scale that explains the chips) still sits under the list, hundreds of rows down on a big state; moving it above the list is a layout decision not asked for here.
- `make e2e-real` (full), `test:e2e:production`, `make e2e-pages` NOT run (release step). The state page is covered by `real-data-smoke` samples and the production specs only through generic checks.
