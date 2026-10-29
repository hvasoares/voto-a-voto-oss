# Checkpoint #151: a shared link shows a preview on WhatsApp

## What changed

- `lib/link-preview.ts` gains `pagePreview` (one pure function: title, address, catalog description, the one generic picture). `Base` and `QuietDoc` call it unless the page gives its own preview (the city card) or is noindex; `DocHead` stays the only writer of the og/twitter tags and now also writes `og:type`.
- `public/preview.png`: 1200x630, 18 KB, one picture for every page, served from the site's own address.
- Catalog: `preview.site` and `preview.siteAlt`, standard and plain.
- `EmbedDoc` and `FragmentDoc` pass none: noindex parts of other pages. The two demos (`/compartilhar/`, `/qr/`) stay noindex and without a preview.
- Guard: `e2e/city-preview.spec.ts` walks every template of `EXAMPLE_URLS` minus `NO_PREVIEW_EXCLUSIONS` and fails on a missing tag.

## Phone first load (gzip html, `check:perf` before -> after)

| Route | Before | After | Limit |
|---|---|---|---|
| home | 8872 B | 9088 B | 12288 B |
| city card | 6432 B | 6441 B | 6553 B |
| map | 6935 B | 7170 B | 12288 B |
| report | 3722 B | 3960 B | 12288 B |

No new request (the picture is fetched by the crawler only); css and JS unchanged. All budgets met.

## Manual check after the next deploy (open)

- [ ] Send a real link of the deployed site on WhatsApp and record here that the card shows.
