# Issue #138: share pictures, common builder and content

Ten pictures (share, guess, stat, recap, Brasil, duel, Meu Brasil, sticker, story, "Ficaram em casa") are content plus one builder: `web/src/lib/share-picture.ts` (primitives, frame, bar label) and `share-picture-flow.ts` (the blocks of a card as tall as its content). Content owns the numbers, the order of candidates, the red/blue assignment (`sideTone`, the identity table), the `Ab`/`Br`/`Nu` abbreviations (in `share-card.ts`) and the wording; the builder holds no flags and no candidate.

## Checkpoint 1: goldens (captured on the unchanged code, commit 0d10b53)

SVG strings only, byte for byte, in `web/src/lib/__golden__/<picture>/<case>.svg`, read by `share-golden.test.ts`; the inputs are in `share-golden.test.cases.ts` (named `.test.` so the catalog and candidate guards treat it as a test). The PNG is made in the browser and is not compared. Capture mode writes with flag `wx`: it cannot overwrite a golden. Case counts cannot go down (`MIN_CASES`).

| Picture | Cases | Inputs |
|---|---|---|
| share | 13 | normal; long candidate names; long city name; very long city name; single candidate; tie; three segments; Ab/Br/Nu abbreviations (narrow); no electorate; no valid votes; fixture; long address; display size |
| guess | 5 | right; wrong; long text; fixture; long city name |
| stat | 15 | per size (square, story, preview): non-voters, margin, long city, unavailable, fixture |
| recap | 7 | normal; a cycle without data; long names; narrow bar; fixture; plain register; all without data |
| brasil | 6 | normal; ballot order with swapped numbers (10 x 13); long names; lopsided bar; fixture; 2018 |
| duel | 8 | states; regions; cities with note; long names; missing values; tie; fixture; plain register |
| meu-brasil | 7 | one place; three places; long name; cycle without data; narrow sides; fixture; plain register |
| sticker | 6 | normal; fixture; long headline; very long headline; long address; long URL |
| story | 7 | normal; fixture; long number; long sentence; long kicker with fixture; long address; long address without "/" |
| stay-home | 7 | normal; all 27 states; second round; fixture; plain register; long address; no states |

Total 91 cases.

Deliberate violation: swapping red and blue in `FILL` and dropping the `Ab` abbreviation made 12 share goldens fail; reverted. A second deliberate violation is the seeded sources of `share-picture-guard.test.ts` (each copy rule fails on its seed).

## Checkpoints 2 to 4: expand, migrate, contract

- Expand: builder written, share card drawn with it, primitives re-exported from `share-card.ts`.
- Migrate: recap, Brasil, Meu Brasil, then duel, "Ficaram em casa", stat, sticker, story. No golden changed.
- Contract: importers use `share-picture.ts`, the re-exports are gone, `share-picture-guard.test.ts` keeps the ten writers free of their own SVG root, border, "EXEMPLO" tag, size pick with fallback, flow height and font stack.
- No test was deleted; the import lines of five tests changed (`textWidth`, `candidateLabel` now come from the builder).

## Cost

Lines of the ten writers: 1024 before, 842 after, plus 170 in the builder (1012). Shared CSS 13118 B gzip before and after; City card HTML 6433 B before and after (`perf-record.json` byte-identical). Built output identical to the baseline apart from the content hashes in the names of changed script chunks (35 pages reference them).
