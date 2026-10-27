# Issue 56: Reports on desktop

## Frames

"6 Relatórios", "8 Brasil e regiões", "11 Comparar com 2022", "11b Comparar com 2018", "7 Cidades que viraram" and "12 Como cada grupo votou" on "Election SPA v3 desktop",
taken as approved. "8 Brasil e regiões (desktop, com Baixar os dados desta página)" (made in G9) was used for the download link's place: it sits at the right end of the
"Ver mapa por estado ›" row and is shown from 1024 px up, as in the frame.

## What is built

All report pages (also the four reports the ticket does not name, so the site does not change column width between neighbours): a centered column of 760 px with 20 px
gutters (720 of content) from 768 px, `pt-8` and the plain "‹ Início" link from 1024 px (the top bar replaces the page header), 44 px titles. Rows for screens that do not exist
are not shown (no "Cidades fora da curva", no "Disputas apertadas" row added; the existing hub rows are unchanged).
Comparar com 2022 / 2018: at 1024 px up the six-state list is a three-column table (state and valid votes | first candidate | second candidate) with a header row
(`role="table"`, `columnheader`, `row`, `cell`; the list stays a list below 1024 px), each cell printing rate, cycle rate and the signed vote volume (tabular numbers). The 2022/2018 toggle is
two real links and works without scripts (asserted).

## Screenshot review (1440x900, fixture state; capture names `relatorios`, `cidades-que-viraram`, `como-cada-grupo-votou`, `comparar-2022`, `comparar-2018`, `brasil`)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | Comparar, table | header row, serif state codes, rate lines in two candidate columns | same; the fixture has two states (the frame six); the cell text is the shipped phone sentence (rate, cycle rate, signed votes) | accepted: fixture and shipped wording |
| 2 | Comparar, intro | 12 px grey | 13 px grey | none |
| 3 | Cidades que viraram | ranked rows with margins | ranked rows, same figures, 44 px title | none |
| 4 | Brasil e regiões | bars and the region list in the column; download link at the right end of the "Ver mapa por estado" row | same | none |
| 5 | Relatórios hub, Como cada grupo votou | column of rows / group bars | column of rows / group bars in the 720 px column | none |
| 6 | back links | "‹ Relatórios" / "‹ Cidade Exemplo" small teal links | "‹ Início" or the page's own existing link in the same style | accepted: existing link targets |

Verdict: PASS.
