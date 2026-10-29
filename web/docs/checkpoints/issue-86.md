# #86 Type scale: 4 sizes, 13 px floor, weights 400/700 (first wave: City card and Home)

## The scale (tokens)
| step | size | line height | role |
|---|---|---|---|
| 1 | 13 px | 1.3 | small / caption (the floor) |
| 2 | 16 px | 1.4 | body / lead |
| 3 | 20 px | 1.3 | section / lead heading |
| 4 | 26 px | 1.2 | title |

Weights: 400 (`--fw-regular`) and 700 (`--fw-bold`); 500 and 600 are gone from the two screens.
- Values: `steps`, `leading`, `weights` in `src/shared/tokens.ts`; written once in the `:root` of `src/styles/screens.css` (`--step-n`, `--lh-n`, `--fw-*`; NOT in theme.ts, which is inlined in every page's html); `tokens.test.ts` keeps both in step.
- Tailwind: `text-step-1..4` (size AND line height, `@theme inline` in `global.css`), weights `font-normal`/`font-bold`. A utility on an element that the unlayered `h2`/button rules style needs `!` (Home's h2 and state tiles use `text-step-3!`, `text-step-2!`).
- Expand-contract: the old `--fs-*`, `--sketch-text-*`, `text-title/section/lead/body/small/tiny` stay for the unmigrated screens; #87 removes them (`--fs-lead` and `--fs-tiny` had no user and are already gone).

## Mapping (old -> new step)
Rounding to the nearest step, 14 goes down (13), 15 up (16).
| family | old | new |
|---|---|---|
| header context, banner, source footer, consent footer/text, Home sub-line, hints, place label, "esquecer meus dados", explainer, tabs, register choice, legend rows/values, "ver cálculo", bar text (11/12), turnout titles, notes, twin reason, curiosity title/note/group, seal, city links | 10, 11, 12, 12.3, 13, 14 | step 1 (13) |
| back, subtitle base, margin sentence ("Faltaram..."), arc pill, twin line, share button, Home lead/list titles/tiles/locate button, consent button, search field and results, curiosity "what" | 14 (margin), 15, 16, 17 | step 2 (16) |
| city headline, city question, "Para explorar", brand | 18, 20, 22 | step 3 (20) |
| page title, Home h1, curiosity rank | 26, 30, 44 | step 4 (26) |
Weights: 500 (locate button) and 600 (banner, bars, titles, calc, links, buttons) -> 700. Banner: 13 px caps no longer fit one line in the fixture, so it wraps (`white-space` normal, height auto). Place shortcut box h-12 -> h-14 to hold 13+16 px lines. Legend rows on the phone 34 -> 40 px (a label over "ver cálculo" is now two 17 px lines). Subtitle gap -4 px -> 0. Desktop (>= 1024) keeps its larger sizes (46, 20, 18, 15, 14...) except the ones under 13 px, which now take step 1; the last wave decides the desktop sizes.
Inheritance: `.city-page` sets step 1 once, so most card rules no longer repeat a font (that is where bytes went).

## Bar text model
`GLYPH_PX` 6.4 -> 7 (13 px bold), `PAD_PX` 8 -> 10; Abstenção/Brancos/Nulos/Outros tiers raised (long sentence from 66% to 75%, "Abstenção 32%" from 30%, "Outros N%" 26%, "Outros" 15%) because the real font is wider. `e2e/type-scale.spec.ts` measures the printed text of every share 4..96% for the real widest names against the segment with the real font (to half a pixel). Visible change: "Flavio Bolsonaro 30%" is now "Flavio / 30%" (the second line "Bolsonaro 30%" only fits from ~36%).

## Bytes (gzip)
- Shared CSS: 16359 -> **15328 B** (-1031 B; room now 1056 B of 16384). Sources: card rules inherit from `.city-page` and group identical page-title/subtitle rules (about -85 B); redundant `--c-*` alias block of `:root` dropped is NOT done (theme still inlines; only unused `--fs-lead/--fs-tiny` went); unused shadcn parts removed (CardHeader/Title/Action/Description/Content/Footer, `textarea.tsx`, `dialog.tsx`, CommandDialog/Empty/Group/Separator/Shortcut, InputGroupTextarea): about -950 B, because Tailwind emitted their classes into the shared CSS.
- City html 6515 -> 6493 B (budget 6554); Home html 8424 -> 8377; CitySearch island 1932 -> 1913 B. No JS added.
- Note closed by #125: `global.css` pins `@import "tailwindcss" source(none);` plus `@source "../"`, so build-output folders left under `web/` no longer reach the class scan; `scripts/css-decoy-check.ts` (inside `npm test`) builds with decoy folders and asserts the CSS bytes hold.

## Probe
`e2e/type-scale.spec.ts` (phone, 390x844): City card (rounds 1 and 2), Home, Home with search results and the saved-city shortcut: every visible text node is one of 13/16/20/26 px and 400/700, distinct sizes <= 5 (it is 4), min 13, no horizontal scroll, no clipped text; plus the bar-fit test. 8 tests, 10x repeat = 80 passed. Extend `SCREENS` in #87. Before: card 8 sizes (26-10.. with 63 nodes at 11), Home 8 sizes + a 500; after: 4 sizes, 2 weights.
Gates: vitest 1628, tsc clean, `make e2e` phone+desktop 739 passed / 8 skipped, `check:perf` green on base "/". `make e2e-real`, production and pages runs not run (release step); real-data specs that pin "ver cálculo"/bar text widths are unaffected in content.

## Screenshots
`ux-review/2026-10-27/86-antes-*.png` / `86-depois-*.png` (home, carta turno 1 and 2; 390x844 at 2x full page, consent banner hidden). Differences: all small text larger and heavier-equal; fixture banner on two lines; legend rows taller with the label over "ver cálculo"; "PERGUNTA/RESPOSTA" labels 13 px; curiosity rank 44 -> 26 px; Home tiles 14 -> 16 bold, locate button 500 -> 700, footers 13.

## Sketch
Frames on "Election SPA v3" scripted over text layers by size (10-14.5 -> 13, 15-17.5 -> 16, 18-23 -> 20, larger -> 26, weights up to bold): 4935B6A0 (2 headline line), 010178A4 (simple language), 60C673A1 (line added), 785740D3 (ver cálculo), 35EC323A (twin line), 01AA7E3E (curiosidades), AACADE1A (arc label), 5DBC0BE2 (textos prontos), 9B81EF38 and 625DD0BC (Home), 7BCB1D41 (2b), C2A39DC9 (3b). 316 text layers changed; 101 layers bound to a shared text style (font size reads NaN) were NOT changed and keep the old size. Layout was not re-flowed: the frames are the reference for layout, the scale supersedes their font sizes. Screenshot-verified: 625DD0BC and 785740D3.
