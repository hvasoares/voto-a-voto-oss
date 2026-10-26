# Shared parts: who may edit what

Everything here is used by several slots, so changes are conservative: keep exported names and props interfaces
stable; add, do not rename. Adding a prop is fine if optional.

| File | Owner | Notes |
|---|---|---|
| `tokens.ts`, `base.css` | #2 (skeleton); any ticket may ADD a token/class, never change or remove one | colours come from the Sketch `v2/*` swatches |
| `page-frame.ts` | #2 | header, back button, title, "Fonte: TSE" footer, consent mount point |
| `components.ts`: `turnoutBar`, `roundTabs`, `candidateRow` | #5 | replace the body, keep the props interface |
| `components.ts`: `cycleTabs` | #6 | same |
| `components.ts`: `reportListItem` | #12 | same |
| `components.ts`: `consentBanner`, `../analytics` provider | #20 | |
| `city-figures.ts` | #5 | derives bar/legend numbers from the data layer; #6 reuses it |
| `city-search.ts` | #3 (moved from the home slot by #4) | pure city search: `fold`, `displayName`, `buildIndex`, `searchCities`. Used by home (#3) and state (#4); keep exports and behaviour stable, add do not rename |
| `slot.ts`, `html.ts`, `slot-test.ts`, `test-context.ts` | #2 | the slot API; talk to the parent before changing |

If two tickets need to change the same shared file at once, the second rebases onto the first; shared files are the
only place where merges can conflict, which is why slots never import each other.
