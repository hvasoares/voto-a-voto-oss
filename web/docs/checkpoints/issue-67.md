# Issue #67 (Fale sem errar): checkpoints

1. **Phrases, pure.** `src/lib/creator-phrases.ts` + `src/lib/sentences/catalog-guide.ts` (`guide.*`, both registers): for a city, the participation sentence (the card's own
   `headline()`), the result sentence (the two most voted candidates, same words, shares of the valid votes) and the arc sentence (`arc.*` label plus its "not the cause" note).
   A city with no data in the cycle says so and says not to call it zero. Tests: the three phrases, plain register, no data, and no cause/winner word for every fixture city in
   both registers.
2. **The page.** `/fale-sem-errar/` (desktop frame "C3 Fale sem errar" + the new phone frame): the island `CreatorGuide.tsx` (city in the address `?mora=uf/cidade` or chosen in the field,
   "Linguagem simples" switch, a copy button per phrase, the citation line with the current edition and the city's address); static, readable without scripts: the "Não diga" list, the
   published wording rules (the data never show why people voted, how a person or a group voted, or that abstaining was protest; a missing cycle is not zero), the note on "ver cálculo".
   The page is on `QuietDoc.astro`, the shell of `Base` without the metrics boot, the notice banner and the donation link, so no analytics call can start from it; `quiet-pages.test.ts`
   asserts the shell and the page sources, and `e2e/fale-sem-errar.spec.ts` asserts no request beyond the site, no tag, no `dataLayer`, no banner, no ad.
3. **Links to #68 and #69.** Added by the commits that ship those screens (see the end of this note).

## Screenshot review (390x844 and 1440x900; fixture `/fale-sem-errar/?mora=rj/cidade-exemplo`)

Frames: "C3 Fale sem errar (desktop)" (existing, id F222E9BD-2E35-47DC-A1B2-7E72326694C8) and "C3 Fale sem errar (telefone)" (new, id 656DABCB-6D63-466D-8C34-0E40EDF95495).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | order of sections | Pode dizer, Não diga, Como citar | first render had Como citar before Não diga | blocker, fixed (the static sections are the island's children) |
| 2 | "Linguagem simples" switch | a knob in the pill | knob invisible (same colour as the pill) | blocker, fixed |
| 3 | top bar | search field, Relatórios, Mapa por estado, Sobre os dados | same (the desktop shell) | none |
| 4 | citation | monospace, edition 27/10/2026 | monospace, the edition's own label (26/10/2026) and the address | frame wording |
| 5 | ×  marks | thin red crosses | bold red "×" | accepted |
| 6 | links to the overlay and the game | present at the foot | absent until #68 and #69 ship | by the ticket |

Verdict after fixes: PASS.
