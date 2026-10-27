# Issue #14 (compare with 2022 and 2018; three cycles per state) : checkpoints

Each checkpoint: tests first against the Sketch ground truth (`site/reference/11-…`, `11b-…`,
`13-…` — the frames were drawn from the real committed dataset, so `data/*.csv` reproduces every
figure), implement, green, commit. Review protocol for screenshots:
`../site/docs/screenshot-review-protocol.md`. Routes: `/comparar/2022/` (frame 11),
`/comparar/2018/` (frame 11b), `/tres-ciclos/:uf/` (frame 13, per-UF pages like the old
`/tres-ciclos/rj/`). Runoff pairing: 2018 R2 = 13 (PT) vs 17 (Bolsonaro); 2022 and 2026 R2 =
13 (Lula) vs 22 (Bolsonaro / Flavio Bolsonaro). Comparisons count only the municipalities BOTH
cycles have (2026 adds Boa Esperança do Norte/MT — that vote is never a swing); a whole cycle a
state/municipality does not have is "sem dados", never zero. State aggregates exclude `zz`.

1. **Pure model + build-time aggregation: `src/lib/compare.ts` and `src/lib/compare-data.ts`.**
   Largest-remainder rounding in tenths (bars of one turn add to exactly 100,0), pt-BR forms
   ("46,2%", "+599.392 votos", "+12,7 pp"), pp changes computed from the UNROUNDED shares, the
   frame short labels (Lula / Bolsonaro / Flavio; fixture "Candidato A" gets the generic
   shortening), compare rows that pair 2026 with a cycle over the intersection of municipality
   codes, per-state round tallies (both turnos) excluding `zz`, `electPair` ticket-vs-leaders
   fallback for datasets without the ticket candidates, `stateStatsLoader()` over the configured
   DATA_DIR. Tests: `compare.test.ts` (frame-pinned units), `compare-data.test.ts` (synthetic
   store: intersection, sem-dados, `zz` exclusion), `compare-real.test.ts` (every frame figure of
   SP/MG/RJ/BA/PR/RS re-computed from the raw CSVs; skipped where `data/` is absent). Also:
   `--sketch-lula` / `--sketch-bolsonaro` tokens in `src/theme.ts` (the only sanctioned colour
   source), e2e capture sidecar format decision.

2. **The compare pages `/comparar/2022/` and `/comparar/2018/` (static, no island) + e2e.** Back
   "‹ Início", the frame intro (the 2018 page names the 2018 candidates and the "same
   municipalities" rule), ciclo tabs cross-linked, the six rows of the frames (UF, valid votes,
   both candidates with pct 2026 / pct cycle / signed vote difference, red/blue swatches from the
   tokens), footer "Fonte: TSE, dados finais". Playwright: fixture build for structure and
   no-JS, real-data build for the frame numbers.

3. **The page `/tres-ciclos/[uf]/` (static, no island) + e2e + captures.** One page per state
   (`getStaticPaths` from the state list, ordered by 2026 R2 valid votes): three cycle blocks
   2018/2022/2026 each with the two-way bar, the rates with volumes and the change line against
   the previous cycle with data ("Lula: +12,7 pp vs 2018"), "sem dados" block without any zero;
   the color legend, the method note WITHOUT the outdated "dados ainda não coletados" sentence
   (the data is collected — abstention is what stays out of the valid-vote bars), the UF chip
   selector as plain links, "Outros estados" mini-bar rows, "Ver o estado ›" and "Ver os três
   ciclos de uma cidade ›" links. Playwright: fixture `mt` for "sem dados", real-data for the
   frame; captures 390x844 of the loading/fixture build, no-JS, real data and the sem-dados
   state, JSON sidecars, and a fresh-context screenshot review versus the frames documented here.

## Screenshot review (protocol: site/docs/screenshot-review-protocol.md)

- Round 1 (fresh-context reviewer, 2026-10-26) over the first captures: **NEEDS FIX** — every
  figure and bar split matched the frames, but text set at body size/ink where the frames use
  small muted (intro paragraphs, "Ponto de partida…", pp-change lines), UF headers and chip labels
  took the link teal instead of ink, names were bold where the frame is regular, the compare pages
  missed the hairline between intro and the first block and had a ~45 px header-to-rows gap
  (44 px tap target), the "Outros estados" divider sat above the heading instead of below it,
  mini-bar tracks were ~20 % too long (percent column auto-sized instead of the frame's ~90 px),
- Round 2 (fresh-context reviewer, 2026-10-26) over the re-captured screenshots after the
  fixes: **NEEDS FIX** — all round-1 blockers resolved, but it found four more: compare-page
  state blocks without the frame's 14 px horizontal inset, tres-ciclos chips back measured at
  ~43 px (the round-1 change to h-8 was wrong; 44 px is right), tres-ciclos vertical rhythm too
  loose (cycle pitch 84 px vs the frame's 60; "Outros estados" +30 %), and a page-wide type scale
  ~15 % wider than the frames (below).
- Round 3 (re-measure by the round-2 reviewer, 2026-10-27) after those fixes: **NEEDS FIX** on
  three tres-ciclos items — "Outros estados" rows still 22 px pitch / 75 px state pitch (the
  16 px row height of the labels made the label rows, not the bars, set the pitch), the percent
  labels right-aligned to the margin where the frame starts them ~10 px after the track end, and
  the big-cycle bars 20 px where the frame band is 26 px. Compare pages already passed round 3.
- Round 4 (same reviewer, re-measured from disk, 2026-10-27) after the fixes (rows h-16 with no
  extra gap, state padding 4, percent column left-aligned in its 90 px, bars 26 px):
  **PASS** — no in-scope blockers remain; remaining differences are the documented deviations
  (type scale for the parent, method-note wording, no app chrome, fullPage capture height).

## Captures (web/.captures/comparar/, not committed)

Static pages have no island and pre-render, so the "loading" render equals the finished page:
the fixture-build capture IS the loading state. States captured per route (JSON sidecar each):
- `/comparar/2018/`, `/comparar/2022/`: fixture build (`2018.png`, `2022.png`), no-JS
  (`*-no-js.png`, identical content), real data (`2018-real.png`, `2022-real.png`, DATA_DIR=../data).
- `/tres-ciclos/sp/`: fixture build, no-JS, real data (`tres-ciclos-sp*.png`).
- `/tres-ciclos/mt/`: the "sem dados" state (`tres-ciclos-mt.png`): 2018 and 2022 blocks show
  "sem dados" (never a zero), the 2026 block draws its bar normally.

## Deviations from the frames (approved)

- Phone app header ("Voto a Voto | Presidente 2026") not rendered — shared navigation, outside #14.
- The frame's method note "Abstenção… (dados ainda não coletados)" is replaced by the accurate
  "As barras mostram só os votos válidos do 2º turno…" — the data is collected (ticket #1).
- The compare pages show the six largest states and cap at 6 rows (frame + contract wording);
  the fixture build naturally shows fewer.
- The "ver os três ciclos de uma cidade ›" target is the state's largest city by 2026 R2 valid
  votes at build time; `/tres-ciclos/rj/cidade-exemplo/tres-ciclos/` city pages are issue #50
  scope, so the link lands on the 404 fallback ("Página em construção") until that ticket ports them.
- The "Outros estados" percent column is a fixed 90 px and the six-largest mini-bar track the
  frame's ~190 px; the frame's per-element horizontal insets are reproduced.

## Type-scale deviation (open, for the ticket parent)

The frames of screens 11/11b/13 render their text ~15 % narrower/smaller than the shared type
scale in `site/src/shared/tokens.ts` (title 30 / body 15 / small 12 / tiny 10). Measured on the
PNGs (same ink and same families): the frame-11 title glyphs span 232 px where the 30 px token
renders 269 px (~26 px effective), the secondary texts are ~10 px glyph size (the `tiny` token)
with 12 px line pitch, and the candidate rows have ~10.5 px glyphs at a 21 px pitch. Frames 01/05
DO match the current tokens (title box 36, body boxes 17) — the Sketch document is internally
inconsistent between frames. Within #14 the two page templates follow frames 11/11b/13: secondary
text uses `text-tiny`, and everything global (title, body, chips' labels, `text-section` headings)
stays on the tokens — changing the shared scale would re-render the home and `/sobre-os-dados/`
pages that already shipped from green reviews, and is the parent's call to make once other
in-flight tickets (#50 …) hit the same question.