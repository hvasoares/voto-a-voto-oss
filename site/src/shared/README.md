# Shared parts: who may edit what

Everything here is used by several slots, so changes are conservative: keep exported names and props interfaces
stable; add, do not rename. Adding a prop is fine if optional.

| File | Owner | Notes |
|---|---|---|
| `tokens.ts`, `base.css` | #2 (skeleton); any ticket may ADD a token/class, never change or remove one | colours come from the Sketch `v2/*` swatches |
| `page-frame.ts` | #2 | header, back button, title, "Fonte: TSE" footer, consent mount point |
| `components.ts`: `turnoutBar`, `roundTabs`, `candidateRow` | #5 (done) | implemented; props interface kept, optional `others` and kind `'outros'` added. CSS: `.turnout`, `.bar`, `.legend` in `base.css` |
| `components.ts`: `cycleTabs` | #6 | same |
| `components.ts`: `reportListItem` | #12 | same |
| `components.ts`: `consentBanner`, `../analytics` provider | #20 | |
| `city-model.ts` | #5 | PURE number model of the city card (no HTML, no data access); #6 and #7 reuse it, API below |
| `takeaway.ts` | #5 | PURE takeaway sentence from a `CityResult`; #7 reuses it for the picture text |
| `city-figures.ts` | #5 | loads a `CityResult` from the data layer (`loadCityResult`) and converts it to component props; `turnoutBarProps` and `candidateRows` stay for #6 |
| `city-search.ts` | #3 (moved from the home slot by #4) | pure city search: `fold`, `displayName`, `buildIndex`, `searchCities`. Used by home (#3) and state (#4); keep exports and behaviour stable, add do not rename |
| `slot.ts`, `html.ts`, `slot-test.ts`, `test-context.ts` | #2 | the slot API; talk to the parent before changing |

If two tickets need to change the same shared file at once, the second rebases onto the first; shared files are the
only place where merges can conflict, which is why slots never import each other.

## Number model API (`city-model.ts`, `takeaway.ts`) for #6 and #7

All pure: no DOM, no I/O, same result in Node and in the browser. The drawing of ticket #7 and the three-cycle view of
#6 must take their numbers from here, never recompute them.

```ts
loadCityResult(data, city, ano, turno): Promise<CityResult | undefined>   // city-figures.ts; undefined = no data (never zeros)
buildCityResult({ turnout, votes, candidates }): CityResult              // pure; candidates are filtered by ano + turno
takeaway(result, cityDisplayName): string                                // one neutral sentence, see the templates in takeaway.ts
largestRemainder(parts, total = 100): number[]                           // integers that add up to exactly `total`
formatInt(36400) // "36.400"       formatPct(33.6) // "33,6%"  (one decimal, ",0" dropped, never 0% or 100% by rounding)
CYCLES // [2018, 2022, 2026]
```

`CityResult` (`city-model.ts`): `ano, turno, aptos, comparecimento, validos, naoVotaram` (= aptos - validos);
`votedPct, notVotedPct` (integers, add up to 100); `votedShare, notVotedShare` (exact percents of the electorate);
`voted: Segment[]` = A, B and, in round 1, "outros" (integer `pct` adds up to 100 of the valid votes);
`notVoted: Segment[]` = abstenção, brancos, nulos (integer `pct` adds up to 100 of the non-voters; nulos includes the
anulados em apuração separada); `outrosCount`; `ranking` (every candidate, most votes first, ties by number).
`Segment = { key, label, votos, pct, numero? }`.

Takeaway templates (N = non-voters' share of the electorate, W and R = shares of the leader and the runner-up; ratios
on the one-decimal values, "close" = within 15%):
- ratio N/W above 1,15: "... N% do eleitorado não votou, mais do que o mais votado, {W}, recebeu (w)."; up to 1,15: "um pouco mais do que ..."; equal: "tanto quanto ..."; from 0,85: "quase tanto quanto ..."
- otherwise compared with the runner-up (the Sketch frame sentence): "quase tanto quanto o Candidato B recebeu (33,6%)", "mais do que {R}, o segundo mais votado, recebeu (r)", "um pouco mais do que {R} recebeu (r)", "tanto quanto {R} ...", "menos do que {R}, o segundo mais votado, recebeu (r)"
- tie for the lead: "{A} e {B} empataram na frente, com 25% do eleitorado cada um; 50% do eleitorado não votou." (three or more: "3 candidatos empataram na frente"); tie for second: "cada um dos dois candidatos empatados em segundo lugar (A e B)"
- a single candidate with votes; fewer than 100 registered voters (counts: "24 dos 40 eleitores não votaram ... (10 votos)"); nobody turned out; people turned out but no valid vote; everyone voted for a candidate; no electorate.
