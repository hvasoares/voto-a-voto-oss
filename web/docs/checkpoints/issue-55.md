# Issue 55: Estado and cycle pages on desktop

## Frames

"5 Estado (desktop)", "9 Três ciclos (desktop)" and "13 Três ciclos por estado (desktop)" on "Election SPA v3 desktop", taken as approved.
"Resumo do estado", "Dados para nerds" and "Comparar com outro estado" (drawn at the top right of frame 5) belong to other tickets (#28, the N frames) and are not shown.

## What is built

- Estado, Três ciclos (cidade) and Três ciclos por estado: a centered column of 760 px with 20 px gutters (720 of content) from 768 px; from 1024 px the page header is dropped
  (the top bar replaces it), the fixture notice becomes a small badge in the column, the title is 46 px, the Estado rows put the result at the right of the name.
- Três ciclos (cidade): blocks without the fixed 150 px height, 36 px bars (values printed in the segments, as before).
- Três ciclos por estado: chips wrap instead of scrolling, 36 px bars, "Outros estados" is one column per cycle with the bar and its percentage below (frame 13).
- Estado map slot: a new directive `client:slot` (`integrations/slot-directive.js`): from 1024 px the island hydrates when it scrolls into view, below that on the first tap
  (the phone behaviour of #17 is kept, the frame's placeholder text says so). A phone downloads nothing before a tap. Without scripts the page is the municipality list and its links.

## Screenshot review (1440x900, fixture state; capture: `e2e/capture-desktop.spec.ts`: `estado`, `tres-ciclos-cidade`, `tres-ciclos-estado`)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | Estado, title block | "São Paulo", "645 municípios · Presidente 2026, 1º turno", links at the top right | "Estado selecionado: RJ" (the page's existing title), "6 municípios"; no links at the right | accepted: the title is the shipped page's wording; the links are #28 and the nerds frames |
| 2 | Estado, map slot | a card "Mapa dos municípios" with "Mostrar o mapa" | the hydrated municipality map (Lista/Mapa) already drawn, since the slot is in view at 1440x900 | accepted: the frame is the pre-hydration slot |
| 3 | Estado, rows | name at the left, result at the right | same | none |
| 4 | Três ciclos (cidade) | back link "‹ Cidade Exemplo", title, three year blocks with 36 px bars, legend | back link "‹ Início" (the page's existing link), same blocks; the capture is of the state's first cycles page | accepted: existing link label |
| 5 | Três ciclos por estado | chips in a row, three bars, "Outros estados" with three columns | same; the fixture has three states, so the chip row and the list are shorter; MT shows "sem dados" for two cycles | accepted: fixture |
| 6 | banner | no banner | small fictitious-data badge (required by the fixture notice) | accepted |

Verdict: PASS.
