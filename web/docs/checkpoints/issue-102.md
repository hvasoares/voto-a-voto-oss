# #102 Usar os dados: one section that gathers the reuse routes

`/sobre-os-dados/` gains `<section id="usar-os-dados">` right after `#como-citar`; the widget section "Para jornalistas e associações" is merged into it. Home's task block gets the entry "Usar os dados" (plain link, no JavaScript).

## Destinations (verified against the real routes and pages)

| Line (link text) | Destination | What the page is for |
| --- | --- | --- |
| Montar o widget de uma cidade ›  (inside the merged block "Para jornalistas e associações") | `/widget/` | builder that gives the one-line snippet of the embeddable city frame |
| Para a imprensa › | `/imprensa/` | press kit: a kit per state (chart, captions, alt text, credit), posters to print, a city sheet |
| Dados abertos da edição atual › | `/edicoes/<id>/#dados-abertos` | the edition page's open-data section: CSV/NDJSON per municipality, data dictionary, SHA-256 per file. `<id>` is the page's own `currentEdition()`. `/edicoes/<id>/dados/` is only a folder of files (no index page), so the link goes to the edition page |
| API de dados abertos › | `/api/` | reference for developers: the JSON files the pages read, no key, read-only |
| Dados para nerds › | `/dados-para-nerds/` | the dashboard of the numbers of Brazil / regions / states, three cycles |
| Feed das edições › | `/edicoes/feed.atom` | Atom feed: a new edition shows up in a reader |
| Fale sem errar › | `/fale-sem-errar/` | guide to say the numbers right on air or in video; from it, the overlay builder and the daily game (neither linked directly from Sobre os dados) |

## Section map of the page

`#e-final`, `#qual-edicao` (`#edicoes` alias), `#de-onde-vem`, `#confira-voce-mesmo` (`#confira` alias), `#como-citar`, **`#usar-os-dados`** (`data-component="use-data"`; inside: `[data-component="for-newsrooms"]` with the alias span `#jornalistas`, the h3 "Para jornalistas e associações" (`#widget-cidade`), the explanation and the widget link; then h3 "Outros caminhos" and the list `[data-component="use-links"]`; every link has `data-use`), `#codigo`, `#licencas`, `#privacidade` (`#guardado-no-aparelho`), `#apoio`. `#jornalistas` is no longer a section but the id still lands on the block (empty span at its start). Licence, stored-on-device list, donations and analytics lines are untouched.

## Home

`li[data-task="usar-os-dados"]` after `entender`: a TaskRow to `/sobre-os-dados/#usar-os-dados`, sub-line "Widget, kit de imprensa, dados abertos e API". Block link count 12 -> 13. No change to any script.

## Bytes (fixture, gzip, 390x844)

| Page | before | after |
| --- | --- | --- |
| `/sobre-os-dados/` html | 8748 | 9253 |
| `/` html | 8948 | 9004 |
| `/` JS | 3845 | 3845 |
| shared CSS | 15183 | 15183 |
| `/imprensa/` (unchanged page) | 3542 html, JS 1863, CSS 15183 | not touched |

`/` at 1440x900: html 16042 (was 15986), JS 4304. No budget changed.

## Tests

`sobre-os-dados.spec.ts` (order after como-citar, seven `data-use` links, each followed in a browser, the feed fetched, old `#jornalistas` and 16 old headings, no-JS, keyboard and focus ring, axe), `tap-targets.spec.ts` (44 px for the seven), `sobre-links.spec.ts` (every `/sobre-os-dados/#...` anchor, new ids), `widget.spec.ts`, `home-tasks.spec.ts`, `home.spec.ts`.

## Sketch

"14b Sobre os dados: Usar os dados" D41C50F9-3292-43E3-B4A6-0E3AAE3A7F49 (page "Election SPA v3", x 4230, y 5100); the entry added to "1c Home (Comparar, celular)" BF9B1C04-054E-48EB-A984-395D064FC0E1 and "1c Home (Comparar, desktop)" 5A7CA37A-6673-4F6E-B956-F19789006E5F.
