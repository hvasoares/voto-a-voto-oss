# Legislative data: feature specs

Seven specs for what the site can build from the new legislative data (Senador and Deputado Federal, 2018, 2022 and 2026). They come from a SCAMPER pass judged by `docs/checklists/dataviz-lens.md`, plus two additions from the owner. Each spec is a product spec, written to be ticketed: it names the claim, the misreading, the data, the shared pieces to reuse, the tests and what is out of scope. It does not fix code structure beyond what the repo already does.

| # | Spec | Depends on |
|---|---|---|
| 01 | [Hydrated delivery pattern](01-hydrated-delivery-pattern.md) | the legislative data task |
| 02 | [Elected and seats, verified against the TSE rules](02-elected-and-seats.md) | 01 |
| 03 | [Party and federation page](03-party-federation-page.md) | 01, 02 |
| 04 | [City card cargo switch](04-city-card-cargo-switch.md) | 01 |
| 05 | [Brancos e nulos por cargo](05-brancos-e-nulos-por-cargo.md) | 01 |
| 06 | [Vote pullers and who was elected because of them](06-vote-pullers.md) | 02 |
| 07 | [Seat changes over the elections](07-seat-changes.md) | 02 |

## Shared decisions (apply to every spec)

- **Hydration meets the budgets.** Budgets are tight (City card HTML has about 120 B of headroom on the fixture; 57 real city pages already exceed 6.4 KB gzip; shared CSS is about 13.1 KB of 16). A legislative view therefore prerenders only an accessible table of the latest data, and loads its shard on interaction. Spec 01 defines the pattern; the others use it.
- **Party and federation level by default.** Named people appear only as the elected (spec 02, 03, 06). No view lists non-elected candidates, and order among the elected never ranks by votes (alphabetical, or ballot number).
- **Numbers-only wording.** Views show labelled bars and tables with party abbreviations; the sentence catalog holds labels, not editorial sentences. No "vencedor", no ranking language, no "por quê" about voters. Groups count cities, not people.
- **Every printed number has a record:** a catalog label (both registers), a fact record with source and calculation, a "ver cálculo" link, and build-gate coverage. A number that cannot have a record does not print.
- **Municipality grain.** The finest grain the site claims is the municipality. The extraction aggregates TSE zones to municipalities; no view implies anything sub-municipal.
- **Data in hand** (built by the legislative data task, `data/legislative/`, its own manifest, rebuilt by `make data`): per cargo and year, candidate votes per municipality (party, federation, situation), and totals per municipality (aptos, comparecimento, votos válidos, brancos, nulos, anulados, anulados sub judice, apurados em separado). 2018 elected two senators per state (two votes per voter), 2022 one; 2026 has 54 senators and 513 deputies. Supplementary elections are excluded. The party legend votes are not extracted yet: they are the TSE file `votacao_partido_munzona_<year>.zip` (23 to 28 MB per year).
- **Mocks and golden fixtures are computed, not typed.** Mocks and golden fixtures for legislative views come from the real allocation code, never typed by hand, and use only the 13/16/20/26 type scale.
- **The four actors** every spec owes a user story: the visitor with no JavaScript, the visitor on keyboard or screen reader, the suspicious reader who wants the calculation of every figure, and the visitor on a phone over 4G at first paint.
- **Open items are flagged, not hidden:** a decision the owner has not made goes to the spec's *Further Notes* with a recommended answer.

## Spec template

Each spec has these sections, in this order: Problem Statement (the claim, the misreading, who asks), Solution, User Stories (including the four actors), Implementation Decisions (with a **Visual decisions** subsection: chart family and why, palette tokens, scale rule, legend copy computed by the build, annotation plan, fallback content; plus data, shared pieces to reuse, budget line, absorption versus a new route), Testing Decisions (the visual testing rules of the checklist, verbatim), Out of Scope (deferred metrics and cycles, named), Further Notes (flagged decisions with a recommended answer).
