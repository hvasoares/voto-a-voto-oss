# Issue #68 (Overlay para live): checkpoints

1. **Configuration, address and figure, pure.** `src/lib/overlay.ts` + `src/lib/sentences/catalog-overlay.ts` (`overlay.*`, both registers): `parseOverlay`/`overlayQuery`
   (`?c=rj/cidade&m=nv&a=2026&t=2&s=600x200&f=transparente`: place, measure, cycle, round, size, background; every value is written, anything invalid falls back, it never throws),
   `overlayFigure` (ONE number and ONE sentence per measure: quem não votou, margem em votos, comparecimento, resultado do 2º turno; no data says so, never zero), `sealText`.
   The configuration has no field for the source seal, so no address can turn it off (a test feeds `seal=0`, `selo=off`, `fonte=0`, `source=none`, `hideSeal=1`).
2. **The overlay and the builder.** `/overlay/tela/` (the OBS address, on the bare `EmbedDoc` shell: no top bar, no banner, no metrics boot; its island reads the city's own shard and
   draws; it fills whatever size the browser source has: 1920x1080, 1280x720, 600x200) and `/overlay/` (the builder, frame "C2 Overlay para live" + a new phone frame: place picker, measure,
   cycle, size, background, a preview of the real overlay on a checkerboard scaled to the screen, the address and a copy button, the OBS steps with the width and height of the chosen
   size, the note "Mostrar a fonte e a edição: sempre ligado" as a note, not a control).
3. **Gates.** `e2e/overlay.spec.ts` (10 tests, 10x each): the three sizes fit with no scroll; the seal is printed whatever the address says; the transparent background is alpha 0 outside the
   card (corners and the lower left) and opaque inside, checked on a screenshot with `omitBackground`; dark and light fill the canvas; the copied address reproduces the chosen
   overlay; no request beyond the site's own files, no non-GET, no tag, no `dataLayer`.

## Recorded: the transparent canvas

At 1280x720, `f=transparente`: pixel (0,0), (1279,0) and (5,715) have alpha 0, the pixel in the card has alpha 255 (screenshot with a transparent default background). `f=escuro` and `f=claro`
fill the canvas (alpha 255 at (0,0)).

## Screenshot review (390x844 and 1440x900; fixture `/overlay/?c=rj/cidade-exemplo`)

Frames: "C2 Overlay para live (desktop)" (existing, id 6AE825E4-6693-4D12-A419-C54FF7DB2676) and "C2 Overlay para live, montagem (telefone)" (new, id 07936E1D-F6C1-4CAE-9905-99DE20A37A76).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | place field | one "LUGAR" label, "Cidade Exemplo · UF" | label twice and the slug "cidade-exemplo" | blocker, fixed (one label; the name comes from the city's shard) |
| 2 | preview at 390 | the overlay scaled to the screen | the real-size overlay overflowed the screen | blocker, fixed (scaled to the width it has, ResizeObserver) |
| 3 | chips | pills at desktop, rectangles in the new phone frame | pills | accepted (frame defect: the phone frame is in rectangles) |
| 4 | address | monospace `votoavoto.exemplo.br/overlay?c=3304557&...` | full `https://.../overlay/tela/?c=rj/cidade-exemplo&...` (the OBS needs the scheme) | accepted |
| 5 | seal in the preview | "TSE · dados finais · edição 27/10 · votoavoto.exemplo.br" | "EXEMPLO · dados fictícios, fonte real: TSE · edição 26/10/2026 · address" (fixture) | accepted |

Verdict after fixes: PASS.
