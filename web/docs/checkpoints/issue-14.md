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