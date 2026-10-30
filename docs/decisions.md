# Decision log

Every product and process decision, with its reason and date. The log is **append-only**: a new decision is a new entry at the end with the next id; ids are never reused, and a superseded entry keeps its text and gets the status `superseded by D-nnn`. This file wins over any private note on a conflict. The release map is [releases.md](releases.md).

This repository is public. An entry says what was decided and why in product and process terms; it does not quote private tracker discussion or personal data. Tickets are written with the tracker they live on: `private#N` (the private tracker) or `oss#N` (the public one), never a bare number. `make decisions-check` fails when two entries share an id, an entry has no date, status or reason, a reference names an id that does not exist, or a bare ticket number appears.

## Entry template

```
### D-001 Title
- Date: YYYY-MM-DD
- Status: active | superseded by D-0xx | reverted
- Decision: ...
- Reason: ...
- Supersedes: D-0xx or none
- Tickets: private#N, oss#N or none
- Source: where it was decided
```

Status is the most important field: reversals within hours are common. A commit that applies a decision ends with the trailer `Decision: D-xxx`, and a pull request says `Decision: D-xxx or none`.

## From the owner's notes to the log

Each owner memory note is mapped to the decision ids it produced, or marked "not a decision". After this mapping the notes point to the log entry ids.

| Note | Decision ids |
| --- | --- |
| `analytics-consent-decision` | D-001, D-002 |
| `apuracao-playback-data` | D-037 (the note is also a feasibility finding) |
| `decisions-2026-10-28` | D-005, D-021, D-022, D-023, D-024, D-025 |
| `gh-pages-plan-blocker` | D-003 |
| `issue-tracker-split` | D-009 |
| `licence-and-publish-cron` | D-004, D-005, D-006 |
| `no-code-redundancy` | D-036 |
| `playwright-port-collision` | not a decision (a hazard; the per-checkout port of private#124 removed it) |
| `post-1-13-0-decisions` | D-008, D-027, D-028, D-029, D-030, D-031, D-032, D-033, D-034 |
| `release-tags-chronological` | D-007 |
| `task-flow-decisions-2026-10-28` | D-012, D-013, D-014, D-015, D-016, D-017, D-018, D-019, D-020, D-026 |
| `uf-region-links-rule` | D-035 |

D-010 (ballot-number order) and D-011 (type scale) come from the code and its commits, not from a note.

## Decisions

### D-001 Analytics: banner with consent first
- Date: 2026-10-27
- Status: superseded by D-002
- Decision: Show a banner and install GA4 only after the visitor consents; the owner declined the notice-only and cookieless options at that point.
- Reason: The owner first preferred the stricter, consent-first reading of the privacy rules.
- Supersedes: none
- Tickets: none
- Source: analytics-consent-decision

### D-002 Analytics: notice only, no consent gate
- Date: 2026-10-27
- Status: active
- Decision: The metrics banner is a notice with one "Prosseguir" button and no opt-out. GA4 installs on every page when `PUBLIC_GA_MEASUREMENT_ID` is set (no stored-consent gate) and is a strict no-op until it is set. The privacy section says that using the service implies awareness, and names the browser-level opt-out. Never re-suggest consent-first or a Refuse button. The measurement id is an Actions variable of the deploy repository (variables are per repository).
- Reason: The owner saw the notice-only banner of a large Brazilian news site (g1) and chose to match it; the cost to the visitor is one tap either way.
- Supersedes: D-001
- Tickets: private#90
- Source: analytics-consent-decision

### D-003 Deploy from the public repository; the private one is a backup
- Date: 2026-10-27
- Status: active
- Decision: Publishing moved to the public repository `voto-a-voto-oss` (history rewritten, `make deploy` pushes `main` to `origin`, workflow `deploy-pages`). The private repository stays as a backup remote and never receives deploy changes; its deploy workflow is stale on purpose.
- Reason: GitHub Pages was refused on the private repository by the account plan (HTTP 422), so a public repository was the only way to publish.
- Supersedes: none
- Tickets: none
- Source: gh-pages-plan-blocker

### D-004 Code licence: MIT
- Date: 2026-10-27
- Status: active
- Decision: The code is MIT (`LICENSE`, "Hugo Soares 2026", and a README section). Code and data licences are two separate statements.
- Reason: The owner wanted a standard open-source licence for the code.
- Supersedes: none
- Tickets: none
- Source: licence-and-publish-cron

### D-005 Dataset licence: CC BY 4.0 with TSE attribution
- Date: 2026-10-28
- Status: active
- Decision: The open dataset is CC BY 4.0 with attribution to the TSE and the project, stated in its `LEIAME.md` and `CITATION.cff`. The data page and the README state it next to the MIT line for the code.
- Reason: The owner confirmed it after the TSE terms were checked.
- Supersedes: none
- Tickets: none
- Source: decisions-2026-10-28, licence-and-publish-cron

### D-006 The publish-edition schedule stays disabled
- Date: 2026-10-27
- Status: active
- Decision: The `publish-edition` workflow (every six hours, commits editions to `main`, about 1 GB on its first run) is disabled on the public repository. Its file and schedule stay in the repository. Do not re-enable it without asking the owner.
- Reason: The owner did not want a live cron on the public repository.
- Supersedes: none
- Tickets: none
- Source: licence-and-publish-cron

### D-007 Release tags follow build order, not milestone numbers
- Date: 2026-10-28
- Status: active
- Decision: Tags `1.1.0` to `1.12.0` were re-pointed in build order (commit date), annotated and force-pushed; `v1.0.0` was untouched. A tag number no longer equals the milestone's G number: [releases.md](releases.md) is the map. The next tag continues the sequence (`1.13.0`, then `1.13.1`). A tag already pushed is never moved.
- Reason: The owner wanted version numbers to follow the order things were built.
- Supersedes: none
- Tickets: none
- Source: release-tags-chronological, post-1-13-0-decisions

### D-008 The maintainability milestone is 1.13.2 "Easier changes"
- Date: 2026-10-28
- Status: active
- Decision: The maintainability tickets live in the milestone "1.13.2 Easier changes" (renamed from 1.14.0); its release tag will be `1.13.2`.
- Reason: The owner asked for the rename so the work reads as a follow-up to 1.13.x.
- Supersedes: none
- Tickets: none
- Source: post-1-13-0-decisions

### D-009 Two issue trackers: ticket numbers are per tracker
- Date: 2026-10-28
- Status: active
- Decision: The private repository holds the historical ticket sequence that commits reference. The public repository has its own counter (the dot-map spec is `oss#2`). Before creating or citing a ticket, say which tracker it is on: write `private#N` or `oss#N`, never a bare number in a tracked document.
- Reason: `gh` defaults to the public repository, whose counter does not continue the project's numbering.
- Supersedes: none
- Tickets: oss#2
- Source: issue-tracker-split

### D-010 Ballot-number order for two candidates
- Date: 2026-10-26
- Status: active
- Decision: Two candidates are always listed lower ballot number first, whoever leads; a separate function computes who is ahead, and no sentence favours a candidate. It applies to the City card, legend, alt text, picture, link preview, three-cycle page and recap, and to the "Dados para nerds" candidate measures.
- Reason: Neutral wording: the order must not signal a ranking.
- Supersedes: none
- Tickets: private#104
- Source: `web/src/shared/ballot-order.test.ts` (no note; recorded from the code and its commits; first model on 2026-10-26, applied everywhere on 2026-10-28)

### D-011 Type scale: four sizes and two weights
- Date: 2026-10-28
- Status: active
- Decision: Four sizes (13, 16, 20 and 26 px, ratio about 1.25, floor 13 px), each with its line height, and weights 400 and 700, all as tokens. Nothing off the scale is allowed on a migrated screen.
- Reason: One checkable scale keeps text legible on phones and makes an off-scale size a test failure.
- Supersedes: none
- Tickets: private#86
- Source: `web/src/shared/tokens.ts` (no note; recorded from the code and its commits)

### D-012 Home is task-first
- Date: 2026-10-28
- Status: active
- Decision: A task block ("Ver minha cidade", "Compartilhar um resultado", "Comparar", "Conferir um número", "Entender o país e os estados", "Usar os dados", "Falar ou criar") replaces "Para explorar" on Home.
- Reason: 15 of 61 routes could not be reached by clicking from Home; the flow follows what visitors do, not feature names.
- Supersedes: none
- Tickets: none
- Source: task-flow-decisions-2026-10-28

### D-013 The desktop top bar is named for tasks
- Date: 2026-10-28
- Status: active
- Decision: The desktop top bar reads Ver minha cidade, Comparar, Conferir, Usar os dados. Relatórios and Mapa por estado move under the Home block and a footer line. There is no phone menu.
- Reason: Same reason as D-012.
- Supersedes: none
- Tickets: none
- Source: task-flow-decisions-2026-10-28

### D-014 "Usar os dados" is a section of Sobre os dados
- Date: 2026-10-28
- Status: active
- Decision: No new page: the section gets the first inbound links to `/imprensa/`, `/api/` and "Falar ou criar" (`/fale-sem-errar/`, with the overlay and the game behind it).
- Reason: Those routes had no inbound link; a section avoids a new page.
- Supersedes: none
- Tickets: none
- Source: task-flow-decisions-2026-10-28

### D-015 The state story gets an entry on the state page
- Date: 2026-10-28
- Status: active
- Decision: `/<uf>/historia/` is linked from the state page next to "Resumo do estado".
- Reason: The story page was unreachable by clicking.
- Supersedes: none
- Tickets: none
- Source: task-flow-decisions-2026-10-28

### D-016 "Compartilhar um resultado" adds a destination parameter to the city search
- Date: 2026-10-28
- Status: active
- Decision: The city search takes a destination parameter. Home's first load is measured with `scripts/measure.ts` before and after.
- Reason: One search serves the share task; Home's first-load budget is tight.
- Supersedes: none
- Tickets: none
- Source: task-flow-decisions-2026-10-28

### D-017 The /compartilhar/ and /qr/ demos stay hidden
- Date: 2026-10-28
- Status: active
- Decision: They stay noindex and unlinked.
- Reason: They are demos, not tasks.
- Supersedes: none
- Tickets: none
- Source: task-flow-decisions-2026-10-28

### D-018 Sharing starts on Brasil e regiões, reports later
- Date: 2026-10-28
- Status: active
- Decision: The share task is built on Brasil e regiões first; the reports follow.
- Reason: One surface first limits the change.
- Supersedes: none
- Tickets: none
- Source: task-flow-decisions-2026-10-28

### D-019 One finality line on Home; task order is judgment, to revisit with data
- Date: 2026-10-28
- Status: active
- Decision: Home carries one "Final, não ao vivo" line. The order of the tasks is the team's judgment and is revisited with GA4 data.
- Reason: The results are final, not live, and visitors must not read them as live.
- Supersedes: none
- Tickets: none
- Source: task-flow-decisions-2026-10-28

### D-020 Slice 1 of the task-flow work
- Date: 2026-10-28
- Status: active
- Decision: Approved: fix the tap on a city row in a state list (it must select, not open); rename "Comparar com 2022" to mention 2022 and 2018; one task-named "De onde vem este número?" link on the City card, replacing the "ver cálculo" wording (the card has no HTML room); the Home finality sentence.
- Reason: These are the smallest changes with the most visible effect.
- Supersedes: none
- Tickets: private#83
- Source: task-flow-decisions-2026-10-28

### D-021 A wrapped-style card gets a ticket
- Date: 2026-10-28
- Status: active
- Decision: A swipeable vertical story built from the places a visitor picks in Meu Brasil, reusing the story component and the places list; queued behind the story ticket in G8. Its breakdown is shown to the owner before publishing.
- Reason: The owner asked for it while going through the open questions.
- Supersedes: none
- Tickets: private#47, private#27
- Source: decisions-2026-10-28

### D-022 Two entry points are added
- Date: 2026-10-28
- Status: active
- Decision: A line "Já tem um cartão? Abrir cartão" on `/gerador/` (for `/abrir-cartao/`), and a "Baixar adesivo" button on the Meu Brasil card (for `/meu-brasil/adesivo/`).
- Reason: Both pages had no inbound link.
- Supersedes: none
- Tickets: none
- Source: decisions-2026-10-28

### D-023 Two compare links are added
- Date: 2026-10-28
- Status: active
- Decision: "Comparar com outro estado" on the state page and "Comparar regiões" on Brasil e regiões, each opening Cara a cara at that level with the place filled in.
- Reason: Comparison starts from the place a visitor is looking at.
- Supersedes: none
- Tickets: none
- Source: decisions-2026-10-28

### D-024 G6 deviation accepted: one rules page for earlier cycles
- Date: 2026-10-28
- Status: active
- Decision: "ver cálculo" for 2018 and 2022 figures opens one general rules page (`/fato/metodo/ciclos-anteriores/`), not a per-city page.
- Reason: The earlier cycles follow one set of rules; per-city pages would repeat it.
- Supersedes: none
- Tickets: none
- Source: decisions-2026-10-28

### D-025 Sketch frames of G4, G5 and G6 approved as built
- Date: 2026-10-28
- Status: active
- Decision: The frames drawn while building the G4, G5 and G6 milestones are the approved design.
- Reason: The owner reviewed them.
- Supersedes: none
- Tickets: none
- Source: decisions-2026-10-28

### D-026 No entry points beyond the approved ones
- Date: 2026-10-28
- Status: active
- Decision: A new route, entry point, framework or layout that no ticket names is a blocking question, not a decision.
- Reason: Agents had invented entry points; the owner decides what is reachable.
- Supersedes: none
- Tickets: none
- Source: task-flow-decisions-2026-10-28; `docs/agent-brief.md`

### D-027 Flaky specs are hardened in a spec-only push; the tag stays
- Date: 2026-10-28
- Status: active
- Decision: Harden the nerds-actions spec (wait for `data-drawn`) and the guess-card spec in a spec-only follow-up push. The 1.13.0 tag is not moved.
- Reason: A pushed tag is a record; the fix is a later commit.
- Supersedes: none
- Tickets: none
- Source: post-1-13-0-decisions

### D-028 Bottom padding while the metrics notice shows
- Date: 2026-10-28
- Status: active
- Decision: The page makes room at the bottom only while the fixed metrics notice is visible.
- Reason: The notice covered the footer on short pages.
- Supersedes: none
- Tickets: private#90
- Source: post-1-13-0-decisions

### D-029 Accepted limits after 1.13.0
- Date: 2026-10-28
- Status: active
- Decision: Accepted as they are: map SVG labels slightly under 13 px on phones narrower than 390 px; the 44 px target of the tiny east-coast states is their callout row.
- Reason: The alternative costs more legibility than it gains.
- Supersedes: none
- Tickets: none
- Source: post-1-13-0-decisions

### D-030 Desktop search is called "Ver minha cidade"
- Date: 2026-10-28
- Status: active
- Decision: The desktop search placeholder and accessible name are "Ver minha cidade".
- Reason: They match the task name of D-013.
- Supersedes: none
- Tickets: none
- Source: post-1-13-0-decisions

### D-031 Small ticket: the "Sua cidade" shortcut and Home sub-lines
- Date: 2026-10-28
- Status: active
- Decision: The "Sua cidade" shortcut honours the share destination, and the Home sub-lines use the remembered city (Home's eager JS has about 350 B of room).
- Reason: Follows D-016.
- Supersedes: none
- Tickets: none
- Source: post-1-13-0-decisions

### D-032 Small ticket: phone footer, legend and Brasil picture
- Date: 2026-10-28
- Status: superseded by D-038
- Decision: The phone footer grows by one 44 px line, a legend goes under the long Estado list, and the Brasil picture is 1080x1710 against the fixed 1080x1350.
- Reason: Leftovers of the 1.13.0 review.
- Supersedes: none
- Tickets: none
- Source: post-1-13-0-decisions

### D-033 The "Final, não ao vivo" chip joins the global footer line
- Date: 2026-10-28
- Status: active
- Decision: The chip sits on the global footer line (watch the City card HTML margin, 67.6 B at the time).
- Reason: Finality must be visible on every page, not only on Home (D-019).
- Supersedes: none
- Tickets: none
- Source: post-1-13-0-decisions

### D-034 Left as is, or done by the owner
- Date: 2026-10-28
- Status: active
- Decision: Stale Sketch frames and shared text styles are redrawn later, with no action now. The owner checks by hand whether WhatsApp shows the share as a photo or a document. The tag message range wording stays.
- Reason: Low value now, or only a person with the phone can check.
- Supersedes: none
- Tickets: private#38
- Source: post-1-13-0-decisions

### D-035 Every UF and every region mention is a link
- Date: 2026-10-28
- Status: active
- Decision: A UF (abbreviation or name) links to its state page and a region links to its region page, as a separate link next to the text; in lists the whole row may be the link. A page's own title does not link to itself.
- Reason: The owner asked for it while reviewing the story-flow frames.
- Supersedes: none
- Tickets: none
- Source: uf-region-links-rule

### D-036 No code redundancy
- Date: 2026-10-28
- Status: active
- Decision: Every ticket names the one shared piece it reuses or builds; a piece needed by several tickets is built once in the first ticket that needs it. Dead code, styles, specs and catalog sentences leave in the same change; specs use the shared fakes.
- Reason: The owner asked for it after the task-flow tickets were created over the same surfaces.
- Supersedes: none
- Tickets: none
- Source: no-code-redundancy

### D-037 Playback page "a noite da apuração": design decisions
- Date: 2026-10-27
- Status: active
- Decision: Feasible for the 2026 second round only, from the local scrape cache (`dt`/`ht` timestamps per municipality). Not yet ticketed. A slider on a hybrid time axis with a derived "% apurado"; a mosaic canvas, not a map, with cities lighting up at their timestamp; one build-extracted `reporting.csv` committed through the manifest pipeline; a lazy payload after hydration and a pre-rendered page with a static pin timeline; 8 to 9 curated pins; a play button; a `?t=` deep link; the intro states the three honesty sentences (derivation of the percentage, no per-city partials, 2026-only coverage); a leader line only from 50% coverage, with real candidate names.
- Reason: Earlier cycles were published final-only, so no playback exists for them; the design stays honest about what the data can show.
- Supersedes: none
- Tickets: none
- Source: apuracao-playback-data

### D-038 Small ticket: the phone footer is not taller, the legend goes above the list, Brasil is 1080x1350
- Date: 2026-10-29
- Status: active
- Decision: The phone page footer keeps the height it had before the type-scale pass while its "Sobre os dados" link stays a 44 px target. The colour legend of the Estado page goes above the long city list, not under it. The Brasil share picture is exactly 1080x1350, the fixed share format, and its goldens are recaptured once for that layout.
- Reason: The 1.13.0 review leftovers were not to be accepted as they were: D-032 took a taller footer, a legend under the list and a 1080x1710 picture; the owner asked for the three to be fixed.
- Supersedes: D-032
- Tickets: private#106
- Source: owner decision after the 1.13.0 review

### D-039 Legislative data lives in its own folder, with its own manifest
- Date: 2026-10-29
- Status: active
- Decision: Senador and Deputado Federal votes for 2018, 2022 and 2026 are extracted by `make data` into `data/legislative/`, per cargo and year, aggregated from TSE zones to municipalities, with their own `manifest.json` (hashes, row counts, and the etag, last-modified and sha256 of the source zips). The folder is git-ignored and rebuilt, not committed. The same cache, revalidation and fingerprint code as the president data is used, and an unchanged source parses nothing. Supplementary elections are excluded. Votes are kept as the TSE gives them (the 2018 Senate had two votes per voter), and the vote identity includes the sub judice annulled and the separate-count columns.
- Reason: The existing data, the web shard fingerprints and the published editions stay untouched, and the legislative volume (about 160 MB) does not belong in the repository. Nothing was normalised, so no meaning is lost between cycles.
- Supersedes: none
- Tickets: none
- Source: owner request of 2026-10-29 to put the legislative download in the same task with cache and fingerprinting

### D-040 The v1.0.0 tag lives in two histories
- Date: 2026-10-29
- Status: active
- Decision: The release-map check requires a row for `v1.0.0` but does not compare its commit, because the tag points at a different commit in the original history (the private backup) and in the rewritten one (the public repository). Every other tag is compared as before, and a pushed tag is still never moved.
- Reason: Both commits are right in their own history; comparing them made the check fail on the backup for a reason that is not a defect.
- Supersedes: none
- Tickets: none
- Source: the release-map check of `web/scripts/releases.ts`, owner decision of 2026-10-29

### D-041 Legislative features: party-first, only the elected named, hydration for the budgets
- Date: 2026-10-29
- Status: active
- Decision: The site brings the legislative data as seven features specified in `docs/specs/legislative/`: a hydrated delivery pattern, the elected and seats verified against the TSE allocation rules, a searchable party and federation page (a new route), a cargo switch on the city card, blank and null votes per cargo, the vote pullers (people elected because of a candidate, as a counterfactual) and the seat changes over the elections for the Senate and the Chamber. Views are party and federation level; only the elected people are named, never in an order that ranks by votes; everything on the elected is kept and checked against the TSE rules before a seat figure prints. Tight HTML and CSS budgets are met by hydration: the page prerenders an accessible table of the latest data and loads shards on interaction.
- Reason: Party and federation level avoids listing thousands of candidates and ranking people, the elected are the one fact readers ask for, and hydration keeps the city card and the new routes inside their budgets.
- Supersedes: none
- Tickets: none
- Source: SCAMPER pass on the legislative data with the dataviz checklist, owner amendments of 2026-10-29

### D-042 Differences accepted in 1.13.2
- Date: 2026-10-29
- Status: active
- Decision: The 1.13.2 release is accepted although its built output is not byte-identical to 1.13.1 in these ways: hashed asset names changed where shared scripts moved (footer and base-path helpers, the report layout); the class tokens of the page column and footer follow one canonical order on 32 pages; the two demo pages `/qr/` and `/compartilhar/` carry `noindex`; and the island scripts of the share pictures and the maps grew (about 250 to 510 B gzip per single-picture island, and about 410 to 460 B per map page) in exchange for one builder and shared map helpers.
- Reason: Each is a consequence of removing a copy or fixing an omission the ticket stated, and none changes what a visitor sees; the growth was weighed against the maintenance gain and accepted.
- Supersedes: none
- Tickets: none
- Source: the 1.13.2 tickets on the shared pieces, owner decisions of 2026-10-28 and 2026-10-29

### D-043 A stub has no size cap of its own; the QR pages stay unindexable
- Date: 2026-10-29
- Status: active
- Decision: The 5 KB cap on a stub page is dropped. A stub is as small as the shared shell allows (a built QR stub is about 7.9 KB) and the size of the stub families is governed by the family budget of `check:dist-size`, not by a per-page cap. The QR page of every city stays `noindex`, as the PRD already says for the share sheet and the calculation pages.
- Reason: The shared shell alone is about 5.6 KB, so a 5 KB stub is only possible with a lighter shell on every page; what matters for the Pages limit is the family total. The city QR page had no `noindex` before the stub, but these pages are not meant for search.
- Supersedes: none
- Tickets: private#206, private#208
- Source: owner decision of 2026-10-29 on the `BLOCKED` question of private#206 and on the QR indexing difference reported by private#208

### D-044 The Pages build does not repeat the unit tests; a deploy follows a green ci on the same commit
- Date: 2026-10-29
- Status: active
- Decision: `deploy.yml` builds and publishes only; the unit tests stay in `ci.yml`. The deploy job waits for a `ci-green` job that requires the `ci` workflow run of the same commit to have succeeded. The preview-picture cache is content-addressed (each raster is named by the digest of its own picture) and its Actions cache key holds only the picture code and the city tables, with a prefix restore.
- Reason: The deploy repeated about 90 s of tests the `ci` run had just done, and its cache key changed with any dataset file (the manifest included), so a commit that changed no picture redrew every one.
- Supersedes: none
- Tickets: private#201
- Source: the plan of private#196
