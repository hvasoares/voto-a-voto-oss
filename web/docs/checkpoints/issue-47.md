# Issue #47 (State story sequence): checkpoints

Entry point: NONE (the ticket names none and the user's rule is not to invent one): the page `/<uf>/historia/` is reached by its address (and by the links of the cards). Needs an entry point decision.

1. **The cards and the rules, pure.** `src/lib/story.ts` + `src/lib/sentences/catalog-story.ts`: a sequence is `cities` (the municipalities of the state), the MOST SURPRISING fact, the other counts, the recap and the share card, last.
   The facts are counts of CITIES from the city arcs (`arcs.json` `byState`, #41; the same sums as the season's pivot): `turned2026` (the side with the most votes changed between 2022 and 2026), `turned2022`, `returned` (changed in 2022 and came back in 2026), `steady` (the same side in the three cycles).
   **The rule of the 2nd card:** the highest share of the cities with the three cycles and no tie (n / total x 100) among `turned2026`, `turned2022`, `returned`; a tie goes to that order; `steady` never competes (the most common is not the surprising one). The recap card (#28) is reused as it is where it already covers a fact (the three shares and
   their changes), so no card repeats them. A state with no change tells it (counts of zero), a one-city state says "de 1 cidade". A state whose cities lack cycles has no arc cards, its sequence has fewer than six cards, and no page is made for it (the fixture's MT; every real state has the three cycles).
   The length of a card's sentence is limited (`STORY_TEXT_MAX` = 150 characters, thrown by `storyText`, so the build fails for a longer one); a test runs every card of every state name in both registers. Neutrality test: counts of places, no why, no winner, no person, no party.
2. **The picture and the content.** `src/lib/story-card.ts` (1080x1920: the small line, the number in the serif at the biggest size that fits one line, the sentence at the biggest size that fits eight lines, the source, the address of the position `votoavoto.exemplo.br/sp/historia#2`) and `src/lib/story-content.ts`
   (picture, text alternative and message per register, address and link with the position, file name `voto-a-voto-<uf>-historia-<n>.png`, caption "Cartão 2 de 7 · o fato mais surpreendente", the record of the card's number). The share card's number is how many cards the sequence has (the sequence, not a figure of the data). The recap card keeps its own picture (its own address `/sp/resumo`), with the message ending in the link to its position.
   Story cards carry no card keys (#38): a dropped story card cannot be redrawn from the site's data.
3. **The sequence component and the page.** `src/components/StorySequence.tsx` (generic: #97 reuses it) + `src/styles/story.css` (only this page loads it) + `src/pages/[uf]/historia/index.astro`: the cards are pre-rendered as a stacked list with their anchors (`#1`...: complete without scripts); the island turns it into a row you swipe
   (scroll snap), with the progress dots (44 px), the arrow keys, Home and End, the share actions of the card on show (the existing `ShareActions`: that card's picture, file name and link; new prop `textHidden`) and the note with the card's address. The card on show is in the address (`#2`: reload or forward reproduces it), no autoplay, instant move with reduced motion.
   Only the latest request wins: the card on show is where the row rests (after the scroll settles) or the last tap or key. The numbers have their records ("ver cálculo"): `municipios` (already there), `2026-viradas`, and new `2022-viradas`, `voltaram`, `sem-mudanca` on the state's three-cycle fact page (`other.ts`, gated).
   No request beyond the site's own files (e2e: GETs only, no `/data/`).

## Build size

The story pages are 27 pages (one per state) of about 40 KB each (the cards are inline SVG): about 1 MB in all; the 4 new fact records are lines of 27 existing pages. Real-data build numbers: see the comment on the issue.

## Screenshot review (390x844, scroll 0, fixture `/rj/historia/#2`)

Frame "13d Sequência de Stories do estado" (id 98F71019-767A-4428-AC79-44F739723D42), whose state is São Paulo (7 cards, 38 cities); the fixture is RJ (7 cards, 6 cities, so "5 de 6").

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | title, sub line | state name, "Sequência de 7 cartões · deslize para o lado" | same | none |
| 2 | card on show | EXEMPLO tag, "SP · 2022 → 2026", serif number, sentence, source, address with `#2` | same structure ("RJ · 2018 → 2022"; the 2nd card is the one with the highest share of cities) | none |
| 3 | neighbours | the cards at both sides, faded | same | none |
| 4 | progress dots, caption | seven dots, "Cartão 2 de 7 · o fato mais surpreendente" | same | none |
| 5 | actions | "Compartilhar este cartão", "Baixar imagem" | same where there is a system share sheet; "Copiar link" and "Baixar imagem" where there is none (the screenshot browser) | accepted (the share flow's own rule) |
| 6 | link line | "O link leva a este cartão: votoavoto.exemplo.br/sp/historia#2" | same | none |
| 7 | extra | not drawn | "ver cálculo" under each card (G6) | accepted |
| 8 | status bar "9:41", home indicator | drawn | absent | accepted-platform |

Verdict: PASS (no blockers).
