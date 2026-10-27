# Issue #58 (plain-language register and shared sentence catalog): checkpoints

1. **Catalog with two registers.** `src/lib/sentences/catalog.ts` is now `CATALOG[locale][register]`
   (`standard` | `plain`); Portuguese is complete in both as `Record<Key, string>` types (only `STANDARD_ONLY_KEYS`,
   the switch labels and the page-head description, have no plain version). Fallback chain per key: the voice's own
   register, the locale's standard, Portuguese in the asked register, standard Portuguese. `headline(result, { register })`.
   Every template of #22 has a plain case in `plain.test.ts` (tie of two and of three, no data, overseas, tiny
   electorates, nobody turned out, no electorate, no valid votes, everyone voted, single candidate, every band).
2. **The switch.** Two toggle buttons in a labelled group (`role="group"`, `aria-pressed`), rendered `hidden` and
   revealed by `scripts/city-card.ts`; both sentences are pre-rendered and CSS shows the one selected on `<html data-register>`
   (an inline script sets it before paint from `localStorage`; without scripts the standard sentence is all there is).
   The sentence block is `aria-live="polite"` and is the panel's `aria-describedby`. The choice is kept in
   `localStorage` only (`voto-a-voto:register`, guarded: blocked storage does not break the card).
3. **Share text and alt text follow the register.** `shareContent` returns `variants[register] = { alt, text }`; the
   share sheet island reads the stored register on mount and swaps the picture's `<title>` and the message text.
4. **One catalog.** The share sheet's "Sem dados nesse ciclo." and the meta description of a city page
   (`preview.*` keys) moved into the catalog; `outside-catalog.test.ts` fails when a source file repeats a catalog
   template, and when the card's sentence-building modules contain a sentence-like literal of their own.
5. **Screenshot review.** The Sketch frame "2 Cartão da cidade, com o seletor de linguagem simples" did not exist: it
   was created (page "Election SPA v3", next to the "with the arc label" frame; made from the headline frame, 390x966) and
   the build follows it.

## Screenshot review (fixture state `/rj/cidade-exemplo/?turno=1`, linguagem simples selected)

390 wide (the frame is 390x966, so the capture is full-page; the 844 viewport shows the same top):

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | switch row | 350 px wide, "Padrão" muted, "Linguagem simples" in the accent pill | same (fixed: it was inset 16 px by the card's padding) | none |
| 2 | sentence + note | plain sentence in 4 lines, note under it | same wrapping and text | none |
| 3 | subtitle | "Município fictício · UF" | "... · RJ" | accepted (fixture state letter) |
| 4 | "9:41", home indicator | drawn | absent | accepted-platform (prototype chrome) |
| 5 | bottom of the page | footer only | footer plus the analytics notice's "Privacidade" link (#20) | note (not part of the Sketch frames) |

1440x900: the city card has no desktop layout yet (the desktop frames "2 Cartão da cidade (desktop ...)" belong to later
tickets); the render is the phone layout stretched to the width, with the switch and the sentence in the same order
and the same styles. No desktop frame exists for the switch and none was invented. Verdict: PASS at 390 (no blockers);
the 1440 comparison is not applicable beyond "the same components, no overflow".

## Weight

Card route, gzip, fixture build (`npm run check:perf`): html 2.9K -> 3.4K, css 12.2K -> 12.4K, page script 0.7K -> 0.8K
(the card script imports only the register constants and the store, not the wording), total 18.5K -> 19.3K. The html
budget of the city route went from 3 KB to 4 KB for the sentence in both registers. The eager JS budget (3 KB) was
already exceeded before this milestone (Base script 2.7K + page script 0.7K = 3.4K at `ea898fd`).
