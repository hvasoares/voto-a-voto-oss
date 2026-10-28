# Issue #97 (Meu Brasil as a story): checkpoints

Entry point (the one the user approved): the button "Ver como história" on the Meu Brasil card (`data-story-link`, next to the card's other actions, shown when there is a card). It links to `/meu-brasil/historia/` with the places of the card in the address. Nothing else links there (e2e asserts the home and the Meu Brasil page have no other link).
The sequence is its own page, so the Meu Brasil page loads none of it.

1. **The cards and the rules, pure.** `src/lib/meu-story.ts` (+ `meu-story-content.ts`, the `mbstory.*` keys of `catalog-story.ts`): per place `StoryPlace` = name, arc (#41) and the 2nd-round result of each cycle.
   Order: `places` (the places as picked; the number is how many), the MOST SURPRISING fact, the per-place cards, the twin card, the curiosity card, the share card last.
   **The rule of the 2nd card:** the place whose city arc changed side the most (`switchedTwice` and `returned` = 2 changes, `switched2022` and `switched2026` = 1; `same`, `tie` and `missing` do not compete); ties go to the ORDER OF THE PLACES. Its arc card is not told a second time. With no change in any place there is nothing surprising to tell: the 2nd card is the first per-place card and
   is not captioned "o fato mais surpreendente".
   **Per place** (each a card about one place, one number): 2026 turnout (`votedPct`, the number of the record `votaram`), 2026 people who did not vote (`naoVotaram`), the arc (the number is the year the side changed; 3 for "the same side in the three cycles"; nothing for a place missing a cycle), then 2022 and 2018 turnout and non-voters. They are offered in rounds (every
   place's 2026 turnout, then every place's 2026 non-voters, ...) and cut where the eight cards end, so each place is told before one is told twice. **Twin** of the FIRST place (#31, `peers.json`): the twin's own 2026 turnout. **Curiosity** of the FIRST place (#33, `curiosities.json`): its first fact (the rank). A place missing a cycle skips that cycle's cards; no twin or no curiosity skips that card.
   Tests: one, two and three places, a place with no change, a place missing a cycle, a place with no twin or curiosity, the tie rule, no duplicate arc, neutrality (no "você", no roles, no vote, no winner, no why), the limit of 150 characters for the longest names (and, when `../data` exists, for the 40 longest real city names), a sentence over the limit throws (the build runs the tests).
2. **The page and the island.** `src/pages/meu-brasil/historia/index.astro` + `src/components/MeuBrasilStory.tsx`, over the sequence component of #47 (`StorySequence`, now with `onClose`: Escape goes back to the Meu Brasil card of the same places). The places and the card on show live in the address (`?mora=…&vota=…#3`; reload and forwarding reproduce the card; nothing is stored: e2e asserts `localStorage` is empty).
   Each place is read from its own city shard (the same files Meu Brasil reads); `peers.json`, `curiosities.json` and the twin's shard are fetched only on this page (e2e: the Meu Brasil page requests none of them). Only the latest load counts (an effect cleanup drops an older answer). Swipe, the arrow keys, Home/End, Escape and a tap on a dot all work; progress dots; no autoplay; instant move with reduced motion.
   Each card shares as its own picture through the existing share flow (`ShareActions`; the message ends with the link to the card's position with the places in it). Every number has its "ver cálculo": the 2026 figures link the city's own fact page (`/fato/<uf>/<slug>/2026-2/#votaram|#naoVotaram`, the twin's own page for the twin, `/fato/<uf>/<slug>/comparacoes/#<code>` for the curiosity), the earlier cycles the page of the rules
   (`/fato/metodo/ciclos-anteriores/`, the same split as the city card); e2e fetches every link and finds the record.
3. **Events** (no personal data, no place): `meu_story_opened` {places}, `meu_story_card_reached` {position}, `meu_story_card_shared` {position} (`analytics/events.ts` and `event-props.ts`, in step: `events.test.ts`).
4. **Sketch.** The frame "16b Meu Brasil em sequência" did not exist: created in "Election SPA v3" (id 9121A83A-2062-482C-81FA-C4DD41B6B94D, from the neighbouring 13d frame, screenshot-verified).

## Deviations

- **Without scripts there is no stacked list.** The ticket asks for a stacked list without scripts; the cards come from the places in the address and the shards of those places, which only scripts read (as Meu Brasil itself does), and 5.570 x 5.570 x 5.570 combinations cannot be pre-rendered. The page says so (`mbstory.nojs`) in a notice.
- **One number per card.** "Turnout in the three cycles per place" is three cards (a place missing a cycle skips that cycle's card), not one card with three numbers.
- **A place with one cycle** (e.g. the fixture's Boa Esperança do Norte, only 2026) has too few honest facts for six cards: its sequence is shorter (turnout, non-voters, twin, curiosity, share) and says only what it has. Places with two or three cycles always get six to eight.
- **The arc card's number** is a year (or 3 cycles), not a computed figure, so it has no record (the arc label is not covered by one either, G6 note); the other numbers are the records' own.
- **Cards carry no card keys** (#38), like the state story.

## Size

Phone first load of the existing Meu Brasil page (`scripts/measure.ts`, 390x844, `/meu-brasil/`): JS 128452 -> 128553 B gzip (+101 B: the button), CSS 16320 -> 16320, html 6539 -> 6562 (the real-data baseline against the fixture build; the button is in the island, not in the html), data 0 -> 0. The story page loads its own sequence (React is shared with Meu Brasil's own island) only from the button.

## Screenshot review (390x844, scroll 0, fixture `/meu-brasil/historia/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista#2`)

Frame "16b Meu Brasil em sequência" (id 9121A83A-2062-482C-81FA-C4DD41B6B94D, created in this checkpoint).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | back link, title, sub line | "‹ Meu Brasil", "Meu Brasil em sequência", "Sequência de 8 cartões · deslize para o lado" | same | none |
| 2 | card on show | EXEMPLO tag, "Três ciclos", "2022", the arc sentence, source, address with `#2` | same; the address was cut with "…" at first: fixed (two lines, never cut) | blocker, fixed |
| 3 | neighbours, dots, caption | faded neighbours, eight dots, "Cartão 2 de 8 · o fato mais surpreendente" | same | none |
| 4 | actions, link note, rule | "Compartilhar este cartão", "Baixar imagem", the link line, the rule | same where there is a system share sheet ("Copiar link" where there is none) | accepted (the share flow's rule) |
| 5 | "ver cálculo" | not drawn | under each card (G6) | accepted |
| 6 | status bar "9:41", home indicator | drawn | absent | accepted-platform |

The button "Ver como história" on the Meu Brasil card has no frame ("16 Meu Brasil" is the card without it): note.

Verdict after the fix: PASS.
