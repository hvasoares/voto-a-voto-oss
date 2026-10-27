# Issue 64: static JSON API and per-page data download

## Frame

The ticket's frame ("the chart-footer frame on Election SPA v3 desktop") did not exist: the only footers with data links there are the
"Dados para nerds" frames N1 to N3 ("Citar · Baixar CSV · Imagem"), a different feature. The go-ahead was taken as approval of the
existing frames, so the missing one was created in the style of the neighbouring frame: "8 Brasil e regiões (desktop, com Baixar os
dados desta página)" on the page "Election SPA v3 desktop" (a copy of frame 8 with the link "Baixar os dados desta página ›" at the
right end of the "Ver mapa por estado ›" row, teal bold, same size). Other pages with the link (city card, three cycles, state) have no
desktop frame of their own; they use the same link in the line above their footer.

## Screenshot review (1440x900 and 390x844, /brasil/, fixture state; capture: e2e/capture-page-data.spec.ts)

Comparison is of the footer element the ticket adds. The page body has no desktop layout yet (see issue-58: the screens are still the
phone column stretched), so the body differences below are not caused by this ticket and are listed, not hidden.

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | footer row, "Baixar os dados desta página ›" | right end of the "Ver mapa por estado ›" row, teal, bold | same: right end of the row, teal, bold (first capture had it centered on its own line: fixed) | fixed |
| 2 | footer row, "Ver mapa por estado ›" | teal | dark (existing phone style) | not this ticket: neighbour link of the existing page |
| 3 | whole page body, header | top bar with brand, search and nav, 720 px content column, large type | phone column stretched to 1440 px, no top bar | not this ticket: the desktop port of the screen (open: no desktop layout exists for any screen) |
| 4 | link text | "Baixar os dados desta página ›" | "Baixar os dados desta página ›" | none |
| 5 | 390x844 | link absent | link absent (hidden by an inline media rule below 1024 px) | none |

Verdict for the part this ticket owns (the footer link): PASS. Rows 2 and 3 belong to the desktop-layout work, not to #64, and are the
reason a full-page comparison with the desktop frame still fails; reported to the user.

## Phone first load (scripts/measure.ts logic, 390x844, fixture build, before = commit 961195a, after = this checkpoint)

JS, CSS and data bytes and the request count are identical on the home, a city card, /brasil/ and a state page. Only the HTML grows,
by the link and its 150-byte inline media rule: city card 3,539 -> 3,709 B gzip, /brasil/ 2,246 -> 2,406, state 6,229 -> 6,382, home unchanged (6,856).
(`scripts/measure.ts` does not exit by itself: it imports `serve.ts`, which starts a server; a copy of its counting that exits was used.)
