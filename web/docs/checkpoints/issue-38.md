# Issue #38 (Self-describing card pair): checkpoints

1. **Keys and the live SVG.** `lib/card-keys.ts`: the four keys (view, place codes, edition, language), `annotateSvg` (text kept as
   text, `<title>` + `<desc>`, `aria-labelledby`, `lang`, `data-view/places/edition/lang` on the root and a `<metadata>` block with
   the keys only), `readSvgKeys` (reads the block as text, refuses scripts and malformed keys). The words around the numbers of the
   share card and the stat card moved into the catalog (`card.*`, with English and Spanish) so a card exists per language;
   `shareContent` and `statContent` take `edition` and `locale`.
2. **The PNG and the reopening.** `lib/png-keys.ts` (a `tEXt` chunk `voto-a-voto` with the keys and a digest of the words; `svgToPng`
   writes it), `lib/card-reopen.ts` (keys -> the same builders -> ok / altered / other-edition / no-keys / mismatch / unreadable),
   the page `/abrir-cartao/` (`components/CardDrop.tsx`): the file is read as bytes, only the card the site draws again is shown.
   The generator also offers "Baixar em SVG".
3. **Review** of the pictures (`web/.captures/cards/`: the downloaded PNGs) and the SVG accessibility check (axe, in
   `e2e/abrir-cartao.spec.ts`).

## What survives a chat app

Recorded as a comment on the issue. Automated proxy: a chat app decodes and encodes the picture again; `png-keys.test.ts` and
`e2e/abrir-cartao.spec.ts` re-encode with sharp: the `tEXt` chunk is gone, the pixels (so the printed address) stay, and the drop page
says "esta imagem não traz as chaves ... use o endereço impresso nela". A real WhatsApp / Telegram / Instagram round trip needs a
phone and was NOT done in this run.

## Screenshot review (the pictures against the approved card frames)

SVG/PNG of the city share card (fixture, `?ciclo=2026&turno=1`) against "3 Folha de compartilhamento"; the one-stat card at the
three sizes against "15 Gerador de cartão".

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | share card, whole | EXEMPLO tag, "Presidente 2026", city, "2026 · 1º turno · UF", two bars, address | same elements and order; candidate names on the bar ("Candidato A 52%"), source line under the address | accepted: deviations of ticket #7 (frame has generic "A 52%"; the picture must state its source) |
| 2 | stat card (square) | "30%", the sentence, the address | the same; the round is the card's default (2º turno) so the number differs | accepted: illustrative numbers in the frame |
| 3 | story, preview sizes | no frame (the generator frame shows only the square) | number and line vertically centred (story), side by side (preview) | none: layouts of the ticket's own sizes |
| 4 | the SVG file vs the PNG | - | identical drawing: the PNG is the SVG rasterised | none |

Verdict: PASS (no blockers).
