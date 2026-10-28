# Issue 75: Dados para nerds, Escada and Ficha

Frames: the Escada panel of "N1/N2/N3 Dados para nerds" (bars, value labels, legend, reference line, "Ver como tabela (Ficha) ›"), compared at 1440x900.

## What was built
- Record `escada` (kind `bar`, `shard: 'ciclos'`, measure options read from the record): `lib/nerds/escada.ts` (`buildEscada` -> `BarSpec`, `ficha`, `sortFicha`, `fichaCsv`, `printedRow`), `lib/nerds/rates.ts` (the four rate definitions the Placar and Escada share).
- Island `components/nerds/EscadaPanel.tsx`: server-rendered / no-JS / phone = the Ficha (a table, 9 columns); from 1024 px, once in view, it becomes the chart in place; picker (comparecimento, abstenção, brancos + nulos, votos válidos),
  the title follows the measure, the choice is kept in `?medida=` (and reopens from it); "Ver como tabela (Ficha)" / "Ver como gráfico" toggle; Ficha sorts by any column (stable, "sem 2º turno" last either way).
- New client directive `client:panel` (`integrations/panel-directive.js`): `client:media="(min-width: 1024px)"` and `client:visible` in one (Astro cannot combine two directives on one island). Below 1024 px nothing is requested; resizing up arms it.
- `data-drawn="ficha|chart"` is what tests wait on; the picker only exists after hydration, so there is no tap to lose during it; every state change is synchronous (no async result to go stale).
- The panel footer prints its shard weight ("Lê 7 arquivos de dados, N kB comprimidos").

## Deviations
- The Brasil reference line is one line (Brasil, 1º turno of the latest cycle) as in the frame, labelled with its value; the Ficha view repeats the four national values in a note.
- Chart, Ficha and CSV body read one structure (`Ficha`): a test compares all three cell by cell. The CSV download button itself is #79 (`fichaCsv` is its body).
- No chart library: the bars are hand-drawn SVG (no new CDN origin, nothing for `test:cdn` to add).

## Screenshot review (1440x900 vs frame)
| # | Difference | Severity | Where | Handling |
|---|---|---|---|---|
| 1 | Value labels of the 2º turno cross the reference line | low | chart | kept (line is thin; labels stay readable) |
| 2 | Chart width capped at 720 px; the frame fills the 656 px card | low | chart | kept |
| 3 | Frame puts the picker as a dropdown ("Comparecimento ▾"); here four chips | low | header | kept (all options visible; keyboard friendly) |
| 4 | Actions "Citar · CSV · Imagem" absent | n/a | header | #79 |

## Measured (fixture build)
- Phone 390x844 `/dados-para-nerds/estado/rj/`: JS 1,863 B gzip (no React, no island chunk requested), HTML 8.6 kB gzip; existing pages unchanged.
- Desktop 1440x900: island chunk `EscadaPanel` 2.3 kB gzip, React client 64.3 kB gzip (shared, loaded only when the panel is in view); page JS in the first paint 2.3 kB.
