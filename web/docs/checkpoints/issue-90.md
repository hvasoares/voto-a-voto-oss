# #90: calm metrics notice (O4)

Only `src/components/ConsentBanner.astro` changed in the product; probe `e2e/notice-calm.spec.ts` is new.

## What changed
- Bar: `bg-background` -> `bg-secondary` (the quiet-panel tone), keeps `border-t border-border`, `fixed inset-x-0 bottom-0 z-40`, same text, same wording, same storage key and script.
- "Prosseguir": was the filled primary button, full width, step 2. Now an outline button: `rounded-md border border-primary bg-background px-5 text-step-1 font-bold text-primary min-h-11`, content width (not `flex-1`), with an explicit full-colour focus outline (`focus-visible:outline-2 focus-visible:outline-ring`; the global default is outline-ring/50, too faint). Still 44 px high and labelled.
- Link keeps `-my-3.5 inline-block py-3.5 underline`, `gap-4` is kept: the #88 pins (44 px link, not touching the button, notice under 230 px) pass unchanged.
- Fixed position and height unchanged (about 168 px at 390x844 before and after), so nothing new is covered.

## Contrast
Ink #1c1b18 on secondary #f1ecdf is about 14:1; link and button text teal #14505c on #f1ecdf / #faf7f0 about 7.9:1 / 8.6:1. axe (wcag2a/aa/21aa/22aa, colour-contrast included) is clean on Home and the City card with the notice open.

## Bytes
Shared CSS (gzip) 15284 -> 15355 B (+71, room 1029 of 16384). City html 6530 -> 6558 B gz as measured here, `check:perf` green (the perf script's 6.4K bound passes). I dropped `text-secondary-foreground` (same colour as body) and the outline offset to stay inside it.

## Probe
`notice-calm.spec.ts` (Home and City card, 3 tests each): bar colour equals the `--secondary` token and not primary; button fill is not primary and its border is; focus ring is drawn on keyboard focus; axe clean; dismiss then reload stays hidden. 10x clean, with `tap-targets`, `consent`, `type-scale`, `stored-privacy`.

## Captures (untracked, `ux-review/2026-10-27/`)
`90-antes-*` / `90-depois-*` for `home-390`, `carta-390`, `home-1440`. Before: light bar with a full-width dark teal filled button, the heaviest block on screen. After: slightly darker paper bar, small outlined button on the left.

## Sketch
The Home and City card frames do not contain the metrics notice (no layer named or reading "Prosseguir" / "Google Analytics"; the "Aviso" layers are other notes), so no frame changed.

## For #99 (task-first Home)
Structure: `#consent-banner[data-consent-banner][role=region]` > `div.mx-auto.max-w-[430px].flex-col.gap-4.px-5.py-3` > `p.text-step-1` (+ link) and `div.flex` > `button[data-consent-continue]`. Keep it fixed, 44 px targets, secondary background.
