# Issue #25 (Single-stat card and card generator): checkpoints

1. **The card, pure.** `lib/sentences/stat.ts` (`statCard(result, measure, place)`: ONE number and ONE line for "quem não votou",
   "margem em votos" and "comparecimento", wording in the catalog under `stat.*`, both registers; a measure that does not exist
   says so and carries no number) and `lib/stat-card.ts` (`statCardSvg`: the picture at square 1080x1080, Story 1080x1920 and
   preview 1200x630, built on the drawing helpers of `share-card.ts`). Tests: the words per measure and edge cases, every line
   inside the card at every size, escaping, Node-buildable.
2. **The generator.** Route `/gerador/` (`pages/gerador/index.astro` + `components/CardGenerator.tsx`, `components/PlacePicker.tsx`
   for the city field). The choice lives in the address (`lib/generator-model.ts`: `?cidade=rj/cidade-exemplo&medida=margem&tamanho=story`),
   the PNG is made ahead of the tap at the size of the picture (`svgToPng(svg, name, size)`), Compartilhar goes through
   `performShare` (files, text or the download), "Copiar texto alternativo" copies `stat.alt`. Events `card_generator_opened`,
   `card_size_chosen`, `card_image_downloaded` (documented in `analytics/events.ts`). The share dialog gets one link,
   "Criar um cartão com uma medida ›", to `/gerador/?cidade=<uf>/<slug>` (the entry point decided with the user).
3. **Screenshot review**, fixture state `/gerador/?cidade=rj/cidade-exemplo` at 390x844 against "15 Gerador de cartão".

## How the pre-rendered city pages could use the link-preview size

`statCardSvg(statCard(result, 'nonVoters', place), { size: 'preview', address })` is a pure string function, so the build that
already writes the og:image of every city page (`integrations/preview-images.ts`, `lib/link-preview.ts`) can rasterise the 1200x630
card instead of (or next to) the share-card crop: one number and one line read at thumbnail size, where the share card's two bars
do not. The og:image:alt would be `stat.alt`. Nothing is wired: that is a product choice for the previews, not part of this ticket.

## Screenshot review (390x844, scroll 0, the fixture city, share API present)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | number, line | "30%", "do eleitorado de Cidade Exemplo não votou no 1º turno de 2026." | "31,6%", "... no 2º turno de 2026." | accepted: the frame's numbers are illustrative; the generator uses the city card's default view (latest cycle, latest round) |
| 2 | city field | label above, value regular "Cidade Exemplo · UF" | label above, value regular "Cidade Exemplo · RJ" | none (the fixture's state is RJ) |
| 3 | chips | three chips in one row, 32 px high | one row, 44 px high, 12 px bold | accepted: 44 px tap target rule of the site |
| 4 | size control | 36 px | 48 px (44 + padding) | accepted: same rule |
| 5 | "Baixar imagem quadrada" | regular weight | bold | note: every action button of the site is bold (share sheet) |
| 6 | "Copiar texto alternativo", note | 16 px link at y 724, note at y 750 | 44 px tap area, note ~20 px lower, partly under the fold | accepted: tap target |
| 7 | picture | 220 px card, EXEMPLO tag, number serif, line, address | same elements; the render adds the source line "Voto a Voto · Dados fictícios. Fonte real: TSE." | accepted: the picture must state its source (as the share card) |
| 8 | status bar "9:41", home indicator | drawn | absent | accepted-platform (prototype chrome) |

Fixed before this table: the chips wrapped to two rows and the header line was missing (`components/PhoneHeader.astro`, the
frame's "Voto a Voto | Presidente 2026").

Verdict: PASS (no blockers).
