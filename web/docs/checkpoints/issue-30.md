# Issue #30 (Cara a cara: cidade, estado e região): checkpoints

1. **Words, model and data, pure.** `lib/sentences/catalog-duel.ts` (the `duel.*` sentences, both registers, loaded only by the head-to-head's modules, like
   `catalog-facts.ts`, so the phone's shared JS does not carry them), `lib/duel-model.ts` (levels, measures per level, the figure of each place, the mark,
   the address `?nivel=…&a=…&b=…&modo=duelo`), `lib/duel-data.ts` (build time: the 27 states from `computeMargins` of #11 and the 5 regions from `buildBrasil`
   of #10, handed to the island as props, so two states or two regions fetch nothing; a city is read from its own shard). Tests: `lib/duel.test.ts`
   (address round trip per level, mark rules per level, the unsigned gap, five states and all five regions against #11 and #10 on the real dataset,
   missing cycle, overseas, neutrality), `components/Duel.test.tsx`.
2. **Page, picture, share, modo duelo.** `/cara-a-cara/` (`pages/cara-a-cara/index.astro`, `components/Duel.tsx`, `styles/duel.css`: plain CSS of its own, so the
   shared Tailwind file of every other page did not grow), the picture `lib/duel-card.ts` / `duel-content.ts` (self-describing text, title = generated sentence),
   the existing `ShareActions`, events `duel_pair_chosen`, `duel_shared`, `duel_mode_opened` (property: the level, nothing else). Entry point decided with the
   user: "Comparar com outra cidade" on the city card. Modo duelo: a fixed full-screen view of the same card (same `Value` component, so the numbers are the
   page's), type sized in `vh` (numbers 86 px at 1080), the seal with the edition and the address always at the foot, Esc or the button leaves, focus returns
   to the button that opened it.
3. **Screenshot review** at 390x844 (new frames "19 Cara a cara, por cidade (com seletor de nível)", "…por estado", "…por região" on the page "Election SPA v3"),
   at 1440x900 (the desktop frames) and at 1920x1080 (modo duelo); capture `e2e/capture-cara-a-cara.spec.ts`.

## Decisions

- **Round and cycle.** Every figure is the 2nd round of the latest cycle. The Sketch city frame says "1º turno de 2026" in its sample subtitle; "virada desde 2022"
  and "margem em votos" are 2nd-round measures on the site, so the subtitle says "2º turno de 2026" at every level.
- **Definitions** (the same as the pages they must equal). City: the card's whole percents (voted + did not vote = 100), the votes between the two most voted
  candidates, swing = (A - B) / valid votes of 2026 minus the same of 2022, in pp, for the same two ballot numbers. State: turnout as the city's, in tenths; the
  gap = |margin| and the swing 1st -> 2nd round, both from #11's unrounded margins. Region: the share that turned out and the weight in the regions' valid votes
  are #10's (largest remainder, tenths); the gap is from the exact votes (within one tenth of the difference of the two shares /brasil/ prints).
- **The mark** is "higher displayed number", never "better": a bar under the value in the accent colour (a fixed-width bar, as the frames draw it), plus the words
  "maior valor nesta medida" for a screen reader and in the picture's text alternative, so it is never colour alone. Equal displayed values or a missing value
  carry none. No catalog sentence says "vence", "lidera", "melhor" (a test over both registers). The signed swing needs a sign convention, which is
  stated in a note in the words of the existing swing pages ("+" = the difference grew in the direction of the first candidate); the unsigned gap names no side
  (test).
- **Overseas.** A state or region code `zz` / `exterior` in the address is dropped with a message and never listed; an overseas post is still a city.
- **No keys in the picture.** The self-describing keys of #38 (`card-keys.ts`) are not extended: dropping a head-to-head picture in "Abrir cartão" says it has
  no keys. Not required by the ticket.
- **The link preview** of a pasted link is the generic one of the page (recorded: the pair is only in the address, rendered in the browser).
- **Not added** (no entry point decided): "Comparar com outro estado" on the state page and "Comparar regiões" on Brasil e regiões. The page is reachable by address.

## Screenshot review (fixture state), Sketch frame vs render

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | 1440 title block | Início y 88-105, title y 112, subtitle y 164, selector y 200, fields y 256, rows y 344 | Início 96, title 112-168, subtitle 164, selector 198, fields 253, rows 337 (4-7 px higher: the field is 56 tall on the box, the frame 60 with the label) | note: fixed to 60 px select; city field is the shared `PlacePicker` (56) |
| 2 | 1440 rows | 520x92 boxes, 160 px label column, 12 px gap | same | none |
| 3 | mark | 100x3 bar under the value | fixed-width bar 2.4em (about 106 px at 44 px type), 3 px | none |
| 4 | 1440 "Modo duelo" | 220x40 outline button at the right of the title, "Modo duelo  ⤢" | same box, glyph smaller | accepted-platform (glyph font) |
| 5 | 1440 note on the signed measure | no note in the frames | one extra line (the sign convention) above the standing note | note: needed to read the sign |
| 6 | 390 selector | new frames: 270x40 track, three 86 px segments | same | none |
| 7 | 390 fields | 169x44, label inside | same; long state names are cut with an ellipsis in the select | accepted-platform (native select) |
| 8 | 390 buttons | share button, then "Modo duelo", "E a sua cidade?" | same order and sizes | none |
| 9 | 390 share button text | regular weight | bold (the shared `ShareActions` style, as on every share screen) | accepted (existing component) |
| 10 | 390 status bar and home indicator | drawn | absent | accepted-platform (prototype chrome) |
| 11 | 1920 modo duelo | title 56, boxes 860 wide, numbers 120 px, seal line, legend, exit button | title 54, boxes 860, numbers 86 px, seal with the full address (the frame prints a short one), same legend, exit button | note: numbers sized in vh so four rows plus a two-line name fit 1080; the full address in the seal is the card's own link |
Verdict: PASS (no blockers).

## Weight (phone, gzip, `scripts/measure.ts dist`, fixture build, before -> after)

| Page | JS | CSS | HTML | data |
|---|---|---|---|---|
| `/` | 3647 -> 3683 | 15779 -> 15779 | 8450 -> 8448 | 0 |
| `/rj/cidade-exemplo/` | 5064 -> 5100 | 15779 -> 15779 | 6427 -> 6482 | 0 |
| `/rj/` | 4645 -> 4681 | 15779 -> 15779 | 7885 -> 7885 | 0 |

The only growth on an existing page is +36 B of JS: the five new rows of `analytics/event-props.ts`, which every page's analytics script carries (the provider
drops an event that is not in the table). The city card's html grows 55 B (the one link) and stays under its 6.4 KB budget (6553 B): no budget changed. The
page's own CSS and JS are loaded by `/cara-a-cara/` only.
