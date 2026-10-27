# Issue #9 (show QR screen and printable poster) : checkpoints

Reference frame: `../site/reference/04-mostrar-qr.png` ("4 Mostrar QR"), old-slot contract
`../site/src/slots/qr/CONTRACT.md`. Review protocol: `../site/docs/screenshot-review-protocol.md`.

1. **QR ground truth: `src/lib/vendor/qrcodegen.ts` + `src/lib/qr-code.ts` (pure).** The encoder is a
   vendored MIT copy of Nayuki's QR generator (three mechanical changes documented in the file; no runtime
   dependency, no network — the same spirit as the CDN rule: libraries that exist are committed). `qrGlyph`
   encodes byte mode at error correction M (smallest version); `glyphPath`/`glyphSvg` draw every dark module
   as one subpath of a single `<path>`, crisp edges, with the ISO quiet zone (4 modules) and token colours
   only (v2/ink on v2/paper) — so the poster prints legibly in black and white, no colour-only encoding.
   The same glyph is reused by the screen and the poster. No election numbers anywhere.
   Tests (`src/lib/qr-code.test.ts`, 13): the content is pinned the way a phone reads it — the rendered
   matrix is decoded back to the exact URL by jsQR (dev dependency, tests only) for rj/cidade-exemplo and
   sp/sao-paulo, with base `/` and `/voto-a-voto/`; the matrix and the SVG are pinned by sha-256; the QR
   structure (finder patterns, separators, timing) is asserted independently of the vendor.

2. **The demo screen `/qr/` + the poster + e2e + captures.** Static Astro markup on the placeholder route
   `/qr/` (demo shell like `/compartilhar/`; #50 swaps the frontmatter for the real `/:uf/:slug/qr/` route —
   every replaced spot carries `data-ticket="50 to replace"`). No JavaScript at all on this page: the QR and
   the poster are build-time SVG/markup; the poster is a print-only layer (`@page A4`, screen chrome hides,
   poster-only flow); printing comes from the browser's own print command. Screen (top to bottom, the frame):
   flag banner "EXEMPLO · QR ILUSTRATIVO, NÃO ESCANEÁVEL" (fixture builds only), ‹ Fechar (to the city card —
   home until #50), title "Mostrar QR", subtitle "Presidente 2026 · {cidade}", the QR, the bold short
   address, the one-line explanation ("...Se você vai enviar por mensagem, use o botão Compartilhar."), Voltar
   (to the share sheet). The poster layer: brand line, city name, "Presidente 2026", the QR (140 mm), the
   short address, a camera line, the source footer. Analytics: inert `data-ticket="20"` marker for
   qr_screen_shown / poster_printed (the interface does not exist yet; nothing is emitted).
   Share wiring: "Mostrar QR" (static link, no JS needed) now sits under the sheet actions of
   `compartilhar.astro` — the navigation the old slot contract lists; its target is the demo `/qr/` today and
   `/:uf/:slug/qr/` when #50 ports the routes. e2e (`e2e/qr.spec.ts`, 8): screen content + address, the
   one-line explanation, navigation, QR card geometry (280 px inside 390, no sideways scroll), request
   allow-list (zero runtime requests — static SVG), poster hidden on screen / shown on print with exactly
   one dark fill, PDF written (`page.pdf`, A4), no-JS contract, and the share-sheet link.
   Captures (`e2e/capture.spec.ts`): `.captures/qr/default.png` (390x844, next to
   `04-mostrar-qr.png`) and `.captures/qr/poster-print.png` (794x1123 = A4 at 96 dpi, print media) +
   `poster.pdf` written by the print e2e. Screenshot review of the screen capture: reviewer's verdict per
   protocol follows in this file (gate 2 of checkpoint 2).

## Screenshot review history (the 390x844 screen capture vs `04-mostrar-qr.png`)

- Round 1 (fresh reviewer): FAIL — 6 blockers (missing header band, Fechar colour, address size/alignment,
  explanation size/wrap). All fixed in code.
- Round 2 (fresh reviewer): FAIL — 2 blockers (Voltar ~20px too low; Voltar label colour). Both fixed.
- Round 3 (fresh reviewer, measurements verified by the author against both images): FAIL — measured with
  pixel probes before fixing: header banner 4px high; "Voto a Voto" 9% wide (tracking); the frame's header
  divider is a 1px rule spanning the brand band, not a "|" glyph; metadata raised ~4px off the shared
  baseline; banner label 11% wide; title 15% wide (30px vs the frame's 26px); subtitle 16% narrow; QR card
  interior cream instead of white and ~20px too tall (padding ~28px vs ~15px); paragraph font 16% narrow
  (12px vs the frame's 14px); Voltar 48px tall in the frame (mine 44).
- Round 4 (fresh reviewer): **PASS — zero blockers.** Fixes carried in from round 3's measurements: brand
  `tracking-[-0.8px]`, header divider as a 1px `bg-border` rule between baseline-aligned spans, metadata
  raised 4px, banner `mt-[7px] py-[7px]` at 11px, Fechar at the frame's x12 with `pl-[11px] pr-[17px]`,
  title 26px, subtitle 14px, card white with ~15px visuals around the drawing (`px-[7px] py-[7px]` + 1
  module of SVG quiet zone), address centered, paragraph 14px/16 with the frame's exact line breaks (forced
  `<br/>`s — the text is constant, and a wrap-width can't reproduce them because the frame's lines 2 and 3
  are the same width in our font), Voltar 48px at `mt-[84px]`. The reviewer's own probes measured brand,
  title, card border rows/columns (210/489, 55/334), URL and Voltar identical to the frame to the pixel;
  remaining rows: platform chrome (status bar, home indicator), the placeholder-to-real-QR substitution, and
  <=1px/sub-antialiasing rows on the banner top edge and paragraph line ends.

## Known content deviations (accepted, per protocol / acceptance criteria)

- The frame's QR is an authoring placeholder: the real screen's QR is the deterministic glyph of
  `src/lib/qr-code.ts` and it does scan (tests), so nothing of the "PLACEHOLDER" annotation is rendered.
- The frame's banner says the drawn QR is not scannable; the fixture build keeps the banner text (the demo
  city and origin are fictitious, `https://votoavoto.exemplo.br` does not resolve) and the real build drops
  the banner with the fictitious data (same rule as the share sheet).
- The frame's iOS status bar ("9:41") and home indicator are prototype chrome — not rendered.