# Issue 85: candidate names are never cut in the poster, link preview and state recap

## What was built
- `src/shared/fit-candidate.ts`: ONE fitting algorithm (`candidateTries`, `pickCandidateText`). Steps: "Name 48%", name wrapped over two lines with the share, full name over the share,
  short form (table's `short`, else first word) over the share, the share alone, nothing. The caller supplies the measure (characters in the City card, `textWidth` SVG units in the pictures).
- City card: `candidateText` in `shared/components.ts` now calls it (same output as before; one extra test with "Veterinário Wilson Grassi" at 48%).
- Poster and link preview (the preview IS `shareCardSvg`): `candidateLabel` + `labelText` in `lib/share-card.ts`. Two-line labels are set at 0.9 of the size and stacked inside the 108-unit bar. `PictureResult.voted` now also reads `short`.
  The "Outros candidatos" segment keeps its old fit (ellipsis allowed: it is not a runoff candidate).
- Recap (`lib/recap-card.ts`): same `candidateLabel`; "Haddad 32,0%" in a narrow segment becomes "Haddad" over "32,0%" instead of the bare "32,0%". Recap labels are already the table's short names, wording unchanged.
- Segment order is unchanged (card/poster order by votes; the user decision flagged by #84 is still pending).
- No CSS touched. Sketch frames: none showed a truncated name (searched every text layer for "…"), nothing changed.

## Measurements
- Poster render cost: 0.010 ms per drawing after vs 0.013 ms before (300 runs), so the 5,760-city preview step is unaffected.
- Fit table at 1080 width, bold 44: 48/52% -> two lines for every long name; 30% -> first word over share; 70/88% -> one line; 12% -> nothing (the sliver is under about 100 units; unchanged from before, the alt text and headline keep the share).

## Captures
`ux-review/2026-10-27/85-poster-{antes,depois}-{flavio-48,flavio-30,wilson-48,eymael-12}.png`, `85-recap-{antes,depois}.png` (untracked).
