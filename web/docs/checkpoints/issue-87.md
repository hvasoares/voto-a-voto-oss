# #87 Type scale, second wave: every screen on the four steps, the one-offs removed (O2)

Closes the expand-contract refactor opened by #86. Scale: 13 / 16 / 20 / 26 px (`--step-1..4`), line heights 1.3 / 1.4 / 1.3 / 1.2 (`--lh-1..4`), weights 400 / 700 (`--fw-*`); Tailwind `text-step-1..4`, `font-normal`, `font-bold`.

## Mapping (old -> new), same rule on every screen
Nearest step, 14 goes down (as in #86): <= 14 -> step 1, 15 to 17 -> step 2, 18 to 22 -> step 3, >= 23 -> step 4. The `leading-[..px]` utilities are gone (a step brings its line height); 500 and 600 weights -> 700.

| family | old | new |
|---|---|---|
| map (`/mapa/`, `/mapa/<uf>/`, fragments, municipality map) | 10, 11, 12, 12.3, 13, 14 chips/legend/notes | step 1 |
| | 15 bold list rows, 16 | step 2 |
| | title 30 | step 4 |
| `/brasil/` (+ compartilhar, qr) | 9.67..14 (sheet), 18, 16.75, 44 h1 at lg | step 1, 3, 2, 4 |
| reports, `/comparar/`, `/relatorios/`, editions | 12/12.3/13 captions, 15 bold names, 18 section, 30 title | step 1 / 2 / 3 / 4 |
| state remainder, three cycles, `.cycle__label` (10 base, 13 under a media query) | 10, 11, 12 | step 1 |
| fact pages `/fato/*` | 10 to 13 text, 17 sentences | step 1 / 2 |
| tools (Cara a cara, Meu Brasil, widget, embed, press kit, overlay builder, game, creator guide, gerador, abrir-cartao, Dados para nerds) | 10, 11, 12, 13, 14 | step 1 |
| | 15, 16, 17 | step 2 |
| | 20 | step 3 |
| | 28, 30 | step 4 |
| Sobre os dados | `text-small leading-[16px]`, `leading-[18px]`, 14/44 at lg | step 1, step 1, step 1 / step 4 |
| shared (Seal, PageDataDownload, source footers, donation, ShareActions/ShareSheet, bars, `ui/*`) | `text-xs/sm/base`, `font-medium/semibold` | step 1 / 1 / 2, 700 |

Info icon in the reports: the 9.5 px "i" glyph is now a drawn circle and bar (no text node).

## Desktop (1024 px and up): decision
The desktop sizes 46, 44, 34, 32, 30, 28, 24 (titles), 22/20/19/18 (section lines), 15/14 (rows) map onto the same four steps with the rule above. NO display size was added (no deviation): the h1 is step 4 (26 px) at every width, sections are step 3 (20), rows step 2 (16), captions step 1 (13). Hierarchy stays readable at 1440 px because weight and the serif face carry it (checked on the probe screens at 1440x900: the desktop probe passes). The h1 shrinks the most (44 or 46 -> 26): the owner may want a single "display" size later.

## SVG map labels (rendered size counts)
The probe measures drawn text by its rendered size (user units times the picture's scale). `StateMapMap` and `StayHomeMap` (fixed 350 px wide, viewBox 486): label font = `labelUnits(486)` = 18.05 units = 13 px; callouts are two lines (UF, then value) because "RJ -0,5" no longer fits in the 88-unit box on one line; a shape prints its inline label only when it is at least 56 x 44 px on screen (before: max side > 55 units); smaller states are reached by the callout list or a tap. `CityMapMap`: label font = 13 / (CSS px per unit) at every zoom; the placement pass works in screen px (13 px per label, estimates 8 px per digit and 7 px per name letter; gates VALUE_PX 40, NAME_PX 64): fewer municipality labels print at a given zoom (names/values stay in the aria-label, tooltip and panel). `uf-map.css`, `nerds.css`: `--uk` = viewBox width / drawn width (phone 350 px: 1.589; nerds column 316 px: 1.76; desktop 1 or 1.069). Honest limit: on a phone narrower than 390 px those SVG labels draw a little under 13 px (the page text does not).

## The calculation link
One catalog key: `fact.link` = "De onde vem este número?" (standard register; the facts catalog is standard-only). `fact.link.card` and `cardCalcLink` are gone; every page calls `calcLink(href)`. `outlier.calc` (both registers) says the same; the FactHighlight island takes it as the prop `calcLabel` (the page passes the catalog message, so the catalog guard still holds). Addresses and `/fato/...#anchor` unchanged. Specs and tests that pinned "ver cálculo" (11 e2e files, 5 unit files) updated. The longer label fits at 390 px on every probed page without falling back to the old wording (no page needed the fallback); the layout work of #89 (title row `flow-root`, legend rows) already covers the card family; report rows, three-cycle, Brasil, state, Meu Brasil and fact pages wrap the label onto its own line where needed (screenshots checked: reports, Mapa, Home).

## Tap targets on footers
One shared rule in `screens.css`: `footer a[href$="sobre-os-dados/"]:not(.source-footer__about)` is `inline-flex`, `min-height: var(--min-tap)`. `e2e/tap-targets.spec.ts` gains 29 pages. Not covered (no visible footer link): the City card, its three-cycle page and the fact pages (the link is the keyboard-only `.source-footer__about`) and the share sheets (page behind is inert).

## Probe
`e2e/type-scale-probe.ts` (`SCREENS`: 40 routes incl. Mapa list and map, `/mapa/rj/`, Brasil, compartilhar, reports, comparar, editions, both three-cycle pages, Sobre os dados, Cara a cara, Meu Brasil, Imprensa, Fale sem errar, overlay builder, Adivinhe, Widget, Dados para nerds (national and state), a fact page, Gerador, API, share pages, state summary and story, sticker): sizes in {13,16,20,26} (0.15 px tolerance for drawn text), weights 400/700, min 13 px, no sideways scroll, no clipped text. Run at 390x844 (`type-scale.spec.ts`) and 1440x900 (`desktop-type-scale.spec.ts`). Documented exceptions: aria-hidden/hidden/sr-only text; the 1080-wide print pictures drawn inline (`svg[viewBox^="0 0 1080 "]`); `/overlay/tela/` and the duel stage (viewport units).
Before (390x844 distinct sizes per page, from the old build): /mapa/ 11 values with 7.2 and 8.64 drawn labels; /brasil/compartilhar/ 17; reports 9+ (12, 12.3, 15, 18, 30); Dados para nerds 17 (6.25 to 20); three cycles 15 (10x20 nodes). After: every row 13/16/20/26, 80 of 80 probe tests green.

## Guard test
`src/shared/type-guard.test.ts` fails on: `text-[..px]`, `leading-[..px]` and Tailwind `leading-*`, `text-xs/sm/base/lg/xl`, `text-title|section|lead|body|small|tiny`, `font-medium/semibold/light/...`, `font-weight` 300/500/600/800/900, `font-size: ..px`, `font: W ..px`, `line-height: ..px`, literal SVG `fontSize={12}`/`font-size="12"`, `--fs-`, `--sketch-text-`. ALLOW-LIST: `lib/share-card.ts` and `lib/press-kit.ts` (they write the 1080-wide print pictures as SVG files with their own scale); `mm` sizes (press sheets) and viewport units (overlay, duel stage, lines with `clamp(`) are not px; `shared/tokens.ts` holds the scale itself. The test also proves each rule catches a sample.

## Bytes
Shared CSS (gzip, `global.*.css`): 15099 -> 14425 B (-674 B; room now 1959 B of 16384). City card html 6534 -> 6486 B (budget 6553.6; margin 67.6 B; collapsing the link key did not touch the card family's text). Home html 8984 -> 8865 B, `/sobre-os-dados/` 9219 -> 9112 B. `theme.ts` no longer inlines `--sketch-text-*` (7 variables fewer in every page's html). JS unchanged except the map islands (label math). `check:perf` green.

## Sketch
See the end of the report: the frames remain the layout reference; the scale supersedes their font sizes.

## Other changes worth knowing
- `scale.css` holds the tokens (imported by `global.css` and `FragmentDoc`), no longer `screens.css`.
- Specs `gerador`, `abrir-cartao`, `entry-links` click buttons/links that the fixed metrics notice (#90) now lies over on these taller pages: they scroll to the middle and click without the hit test. UX flag: on a short page the fixed notice can cover the last lines (e.g. the empty generator's "Já tem um cartão?") until it is dismissed; consider bottom padding while it shows (not done: touches every page).
- Overlay `/overlay/tela/` noscript line no longer sets a px size.
