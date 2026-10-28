# Issue #66 (State press kit and printable posters): checkpoints

1. **Seal and captions, pure.** `src/lib/press-kit.ts` (`sealSvg`, `sealLine`, `kitCaptions`) and `src/lib/sentences/catalog-press.ts` (the `press.*` words, both
   registers). The seal is a band above and a band below the picture plus a line across its middle, so a crop of either half still holds a seal and the seal is never over
   the data. The captions file has the caption, the alternative text, the plain-language caption, the credit, the licence (CC BY 4.0, as the open data) and the citation of the
   edition; it contains no date of the build, so the kit is deterministic.
2. **The kit, the posters and the page.** `/imprensa/` ("Para a imprensa": licence, credit, 27 kits, how to print the A3 sheet); per state `/imprensa/kit/<uf>/resumo-do-estado.svg`
   (the state recap picture with the seal) and `/imprensa/kit/<uf>/legendas.txt`; `/imprensa/cartaz/<uf>/` (the A2 state poster: the state on the map of Brazil, the sealed
   chart, a QR to the state's page, the source line); `/imprensa/folha/?mora=uf/cidade` (ONE page for the A3 city sheet: the city across the three cycles, sealed, a QR to the city's page
   and the source line, drawn in the browser from the city's own shard). Printing is the browser's own command with `@page` 420x594 mm (A2) and 297x420 mm (A3).
3. **Gates and screenshots.** `e2e/imprensa.spec.ts`: the seal three times in the chart, the poster and the sheet; the A2 poster and the A3 sheet printed to PDF with the page's own
   size give ONE page of 1191x1684 pt (A2) and 842x1191 pt (A3), and the last line of each ends inside the page (no cropping); no page of the site links to the press page.

## Where it deviates, on purpose

- The ticket says "printable A3 city sheets" and "A2 state wall maps". A file or page per city (5.570) is out of the size budget, so the A3 sheet is one parametrised page and the A2 poster
  is per state (27). The A2 "map" is the map of Brazil with the state highlighted plus the state's three-cycle chart, not a map of its municipalities (that map is an interactive island on `/mapa/<uf>/`).
  The full variant (a PDF per city and per state) would add 5.570 files of about 150 KB, roughly 800 MB raw, and was not built.
- Kit contents per state: one sealed SVG chart and one captions file. PNG versions were left out (each PNG of the chart is about 100 KB; 27 of them would add 2,7 MB: cheap, but
  the ticket asks for charts and the SVG is the editable original; say if PNGs are wanted).
- No entry point: nothing links to `/imprensa/` (the ticket names the page, not a link to it).

## Sizes (real dataset)

- Per state kit: `resumo-do-estado.svg` about 5,9 KB + `legendas.txt` about 1,3 KB = about 7,2 KB raw; the A2 poster page about 40 KB raw. All of `/imprensa/`: 1.444 KB raw.
- Whole site, `astro build` with the real data: raw 1.391.912 KB (the #65 build: 1.390.452 KB, +1,5 MB), gzip 258.385.920 B (+0,4 MB), files 53.293 (+86), build 469 s (unchanged).

## Screenshot review (390x844 and 1440x900; fixture `/imprensa/`, `/imprensa/cartaz/rj/` at 1588x2246 print)

Frame: "Para a imprensa" (Sketch page "Election SPA v3", id F3219516-6D47-47BD-9018-8B4E239C85EB, drawn by this ticket; there is no separate desktop frame: the page is one column, 880 px at most).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | title, sub, licence, credit | as listed | same words | none |
| 2 | state rows | name and three links, 22 px apart | links 44 px high (touch target) | accepted (#19 rule) |
| 3 | edition date in the credit | "27 de outubro de 2026" | "26/10/2026" (the edition's own label) | frame wording, not code |
| 4 | sheet help | text and example link | same | none |
| 5 | consent notice | absent | the site's notice, bottom of the first screen | accepted (site-wide) |
| 6 | A2 poster (no frame) | n/a | title, map with the state highlighted, sealed chart, QR, source line, fits one page | no blocker |

Verdict: PASS (no blockers).
