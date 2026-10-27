# Issue #37 (Meu Brasil sticker): checkpoints

1. **The sticker, pure.** `lib/sticker-card.ts` (`stickerSvg`: 1080x1920, transparent background, a paper card with a thick ink border,
   the tag, the card's headline, a QR code to the card drawn from `qrGlyph`, the short address and the source) and
   `lib/sticker-content.ts` (the headline and the address are the card's own, `meuBrasilContent`; the text alternative is the catalog's
   `mb.sticker.alt`). Tests: the QR decodes (jsQR over the rasterised SVG) to the card's address with the places in it for 1, 2 and 3 places,
   at 1080, 540 and 360 px wide; the picture is transparent outside the card; the printed sentence is the card's headline; contrast
   (ink on paper and on white above 15:1, accent tag above 7:1, no muted text); at least 8 px per module; nothing leaves the card for a
   short or a very long headline.
2. **Page.** `/meu-brasil/adesivo/` (`components/MeuBrasilSticker.tsx`, sharing `use-place-cards.ts` with Meu Brasil): the sticker on a
   checkerboard, "Baixar adesivo (PNG)" first and "Compartilhar" through the existing share flow (`ShareActions` `downloadFirst`), the
   generated alt text under them. `svgToPng` now rasterises at the picture's own viewBox size (before, every picture was drawn at 1080x1070:
   fixed here, it also concerned the recap and Meu Brasil pictures).
3. **Screenshot review**, `/meu-brasil/adesivo/?mora=...&vota=...&nasceu=...` at 390x844 against "23 Adesivo Meu Brasil".

## Entry point

None. The ticket says the sticker is made "from a Meu Brasil card", but the entry points decided with the user do not include a link from
Meu Brasil to its sticker, and the "16 Meu Brasil" frame has no such control. The page is reachable by its address only (the places are
its query) and an e2e test pins that no page links to it. Needs an entry point decision.

## Screenshot review (390x844, scroll 0, fixture places, share API present)

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | sticker content | tag "MEU BRASIL", a list of places with dots and "2026 · A 52% dos votos", the address | tag, the card's one-line headline, a QR code, "Aponte a câmera para abrir o cartão.", the address | accepted: the ticket asks for the headline and a QR; the frame's list names a side per place ("A 52%"), a per-place winner label the product rules forbid |
| 2 | fixture tag | none | EXEMPLO tag beside MEU BRASIL | accepted: fictitious data is always tagged |
| 3 | checkerboard, card shape | checkerboard behind a rounded card with a teal border | checkerboard behind a rounded card with a thick ink border | accepted: ink border for contrast (ticket: high contrast) |
| 4 | buttons | "Baixar adesivo (PNG)" primary, "Compartilhar" outline | same, in that order | none |
| 5 | alt text | "Texto alternativo gerado: “Meu Brasil: ... votaram em A; ...”" | "Texto alternativo gerado: “Adesivo Meu Brasil: No 2º turno de 2026, ...”" | accepted: neutral generated sentence |
| 6 | footer | frame ends at the note | the page continues with the note and the source footer | accepted: the footer is on every page |
| 7 | status bar "9:41", home indicator | drawn | absent | accepted-platform |

Verdict: PASS (no blockers).
