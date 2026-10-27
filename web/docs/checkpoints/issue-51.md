# Issue 51: Desktop shell and Home

## Frame

"1 Home (desktop)" on the Sketch page "Election SPA v3 desktop" (1440x900), taken as approved (the user launched the build). That frame
already draws the SVG state map; this ticket keeps the tile grid in that place and #53 replaces it with the map.

## Checkpoints

1. Top bar and the "/" shortcut (behavior: `e2e/desktop-home.spec.ts`, project `desktop`)
2. Home in two columns, widths 390/768/1440, measurements

## Screenshot review (1440x900, "/" fixture state; capture: `e2e/capture-desktop.spec.ts`)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | right column | SVG map of Brazil with callouts | the tile grid (7 columns, 56 px) | by design: the map is #53 |
| 2 | big search field | no magnifier, text at x=142 | magnifier hidden at 1024+, text at x=142 (first capture had it: fixed) | fixed |
| 3 | under the search | nothing | "Usar minha localização" button and its hint (G7's feature, hidden until geolocation exists) | accepted: a later ticket's element, the frame predates it; kept on the phone and here |
| 4 | bottom of the viewport | nothing | the metrics notice (first visit only; notice-only model) | accepted: not in the prototype frames |
| 5 | "Para explorar" rows | 72 px rows, 19 px titles | 72 px rows, 19 px titles (first capture had 15 px: fixed) | fixed |
| 6 | top bar | wordmark, search with "/" key, three links | same; link x positions within 15 px | accepted-platform |
| 7 | title | 44 px serif, two lines | same | none |

Verdict: PASS for the shell and Home (no remaining code-fixable difference).
