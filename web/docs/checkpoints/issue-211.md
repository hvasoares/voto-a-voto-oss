# Checkpoint private#211: the old pre-rendered share sheet code is gone, the size and the device check

## What was removed (same change as the stub of private#210)

- `lib/screen-scopes.ts`: the `city` scope (QR and share builders), the `sheet` body kind (`ShareBody` is now the one pre-rendered body), the `texts` field, the imports only they used.
- `components/ShareSheetFrame.astro`: the `ShareSheet` branch and the "Textos prontos" block. `components/CityTexts.astro` is deleted (nothing used it; `CityTextsBlock` is drawn by the stub).
- `lib/screen-scopes.test.ts`: the city cases. Comments of `qr-screen.ts`, `share-sheet-record.ts`, `ShareSheet.tsx` that named the old page.
- Kept, still used: the demo (`/compartilhar/`) and Brasil (`/brasil/compartilhar/`) pages with `ShareScreen`, `ShareSheetFrame`, `ShareDemoBackdrop`, `ShareActions`.

## Size of the city share family (fixture build, 9 cities; throwaway script, not committed)

| | before (5a0d640) | after | change |
|---|---|---|---|
| files (pages + data) | 18 | 18 | 0 |
| bytes | 511695 | 81975 | -84% |
| gzip | 107234 | 29792 | -72% |
| html | 502676 | 71893 | -86% |
| data files | 9019 | 10082 | +12% |

The 80% estimate holds for raw bytes and for html; gzip is -72% (the shared shell per page is small and did not shrink; the ruling D-043 keeps it). The budget of `check:dist-size` is NOT lowered here: that gate is the last task of the milestone and does not exist yet; these numbers are its input.

## Device check

Date: 2026-10-29. NOT DONE on a real device: no iOS Safari and no Android Chrome were available to the agent; the check still needs the owner or a device (open a city's `/compartilhar/`, tap Compartilhar, confirm the system sheet opens with the picture, on both).

What was checked instead (Playwright, phone and desktop presets, `navigator.share` mock of `e2e/share-mock.ts`): the PNG is ready (`data-png="ready"`) before the tap and `navigator.share` is called inside the tap with one file (`e2e/share-stub.spec.ts`); share, download, copy, QR link, guess card and "Textos prontos" specs pass.
