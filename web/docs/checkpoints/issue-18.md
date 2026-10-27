# Issue #18 (sources, method and limits) : checkpoints

Each checkpoint: failing/behaviour tests first, implement, green, commit. Review protocol for
screenshots: `../site/docs/screenshot-review-protocol.md`. Every figure on the page is pinned to a
committed source by `src/lib/about-data.test.ts` (reads `data/manifest.json` raw) — numbers copied
into prose live in `src/lib/about-data.ts` with the source comment next to each constant.

1. **Content ground truth: `src/lib/about-data.ts` + `src/lib/about.ts` (pure).** One row per
   manifest source (id, kind, retrieved_at, bytes, sha256; the 2026 results site adds files / final /
   newest generation / digest), plus the narrative constants: sections apuradas (497.897), 5.571 + 186
   postos in 2026, 5.570 in 2018/2022 (Boa Esperança do Norte/MT has no earlier data), remainders
   470/657/423 (seções não instaladas; 2026 has no reported field), Salvador/BA 2018 R1 zone 18
   `anulados_apu_sep` = 746, official 2026 runoff totals with overseas (Lula 64.256.232, Flavio
   Bolsonaro 59.826.041), electorate of 2022 as the one re-confirmed constant (156.454.011). Formatters
   (pt-BR integers, UTC collection, short hashes). Tests: vitest, 10 assertions groups, all against
   the raw manifest.

2. **The page `/sobre-os-dados/` (static Astro, no island) + e2e + captures.** Sections: De onde vêm
   os números (+ manifesto blocks), Como os números são calculados (valid votes, voted/not voted,
   whole-percent rounding, margin pp, swing, groups/cohorts, overseas), O que foi conferido, o que
   ainda não temos (extension-window report not in v1; no section/precinct/bairro data), Limites,
   Confira você mesmo (4 steps), Código aberto (GitHub), Fontes e licença (no third-party material;
   provenance recorded in the manifest), Privacidade (nothing sent today; typed text never leaves the
   browser; consent required for any future metrics). Footer "Fonte: TSE, dados finais", back link to
   "/". Playwright phone spec (`e2e/sobre-os-dados.spec.ts`, 6 checks + reachability from the home
   footer with the request allow-list) and capture spec (`.captures/about/phone-full.png` 390x844
   fullPage, `desktop-full.png` 1280 wide, JSON sidecars).

## Wording review (neutrality)

- Reviewer and date: implementing agent of the checkpoint, 2026-10-26.
- Both 2026 runoff candidates appear with the same format and no loaded verb: "Lula
  {64.256.232} / Flavio Bolsonaro {59.826.041}", "Lula 2.875… Flavio 2.695" is NOT on this page
  (city/region screens own those comparisons). The 2022 comparison always pairs candidate 13 with
  candidate 13 and 22 with 22, as the pipeline does.
- No contested-election vocabulary (fraud, "roubado", "atraso das urnas", "apagão"): the extension
  window is stated as a missing report, the identity remainders as file fields with their documented
  meaning, and every limit gets the same phrasing style (what is not there, why, what it implies).
- The page states sources before claims, and the GitHub links give the raw inputs.