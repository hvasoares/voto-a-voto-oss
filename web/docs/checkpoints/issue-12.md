# Issue #12 (reports hub + "Cidades que viraram") : checkpoints

Each checkpoint: behaviour tests first, implement, green, commit. Screenshot review follows
`../site/docs/screenshot-review-protocol.md` against `site/reference/06-relatorios.png` and
`site/reference/07-cidades-que-viraram.png`. Source of truth for the figures:
`thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md` (pinned by
`src/lib/reports/*.test.ts` against `data/`) and the Lean Analytics principles
(`2026-10-26-lean-analytics-visualization-principles.md`: every rate is paired with its volume and
rankings take a minimum-size filter). Candidate pair comes from `data/candidates.csv` (2º turno,
first = lower number: Lula 13 / Flavio Bolsonaro 22; fixtures play Candidato A 91 / B 92).

1. **Pure computations: `src/lib/reports/` (compute, format, hub, load).** `compute.ts` derives the
   pair, per-round margins in pp of valid votes (a city "vira" when the margin changes sign between
   the 2026 rounds), ranked flips with the 5 mil+ valid-vote filter, cities won (2.875/2.695/1 tie),
   closest races (diff of exact votes), turnout extremes of the 5 mil+ electorate (overseas "zz"
   posts excluded everywhere), biggest swing of the 100 mil+ cities, net votes vs the 2022 runoff
   (cities without a 2022 round take no part). `hub.ts` builds the seven hub headlines from those
   computations; rows whose report is not built yet (tickets #13-15) keep the headline and get no
   route. `format.ts` renders pt-BR one-decimal pp and dot-thousands integers. Tests: vitest, 61
   green (fixture state + real-data suite: 211/1 flips; top-5 flips exact; Marquinho tie;
   +3.862.039/+1.591.101 net votes; turnout 90,5%/59,0%; Campos dos Goytacazes +9,8 pp).

2. **The pages + share + e2e + captures.** `/relatorios/` (frame 6): back "‹ Início", subtitle,
   seven rows — the built one links, the six stubs show an "Em breve" tag and keep the computed
   headline. `/relatorios/cidades-que-viraram/` (frame 7): back "‹ Relatórios", the pp definition
   ("5 mil+" derived from MIN_FLIP_VALIDOS), ranked rows `/​{uf}/{slug}/` with "Margem -4,5 pp →
   +5,0 pp · 34.159 votos válidos", the ⓘ notice in a box, full-width Compartilhar. Share +
   analytics is a plain script (`src/scripts/report-analytics.ts`, like tile-analytics): report_opened
   on load; report_shared {report, method: native|clipboard} via navigator.share with a clipboard
   fallback answered by "Link copiado!" (aria-live). Playwright: `e2e/reports.spec.ts` (9 checks,
   including no-JS state and the request allow-list), `e2e/capture-reports.spec.ts`
   (`.captures/reports/fixture/`, 390x844 fullPage + open viewport + JSON sidecars),
   `e2e/reports-real-data.spec.ts` (`npm run test:real`: 211 headline, Itabirito/Barra/João
   Monlevade top rows, 129 rows, screenshots in `.captures/reports/real/`).

## Screenshot review (390x844, fixture + real builds, 2026-10-26)

- LAYOUT MATCHES: hub rows with title/headline/chevron and teal link row; report list with filled
  rank badges, pp arrows and valid-vote volume; boxed ⓘ notice; full-width share button; footer.
- Deliberate difference (both screens): the "Em breve" tag on the six stub rows comes from the
  ticket ("note stubs 'em breve'"); the frames do not show it.
- Minor (severity small): report rows in the frame hug the edges slightly tighter (px-5 vs the
  frame's 32px gutter at the rank badge); hub row spacing a few px taller where the "Em breve" tag
  wraps the headline. No content difference on real data: every frame figure reproduces.

## Known notes

- `tsc --noEmit` reports one pre-existing error in `src/scripts/fallback.ts` (import.meta.env,
  committed with issue-48); not touched here.
- The six stub rows carry no route; when tickets #13-15 land they add `to` in `hub.ts` and the
  "Em breve" tag disappears for that row automatically.
- The report list links to `/{uf}/{slug}/` city routes; city/state pages are ported by other
  tickets (#50/#5), so the e2e asserts the PATH, as the home spec does.