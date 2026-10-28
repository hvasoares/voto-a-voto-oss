# Issue 77: Dados para nerds, Sinais, Invariantes and panel data contracts

Frames: the Sinais strip and the Invariantes panel of "N1/N2/N3" (strip, list with chips, links, footer). The failure banner is not in the frames; **the frame of the banner state was not created** (the ticket says to add one
if it is absent: it was not added in Sketch; the banner is built from the same tokens as the strip: amber #a8641a border, #fbeed9 fill, bold line, and is tested by building a corrupted copy of the fixture).

## What was built
- `lib/nerds/checks.ts`: seven rules, each a pure check over the shards (Σ filhos = total, parte do Brasil, comparecimento + abstenção + não instalados = eleitorado, válidos + brancos + nulos = comparecimento, sem negativos/acima de 100%,
  candidatos + brancos + nulos = votantes, seções apuradas = esperadas -> "Não conferido", never a pass, because the dataset has no section counts). Brasil lists all; região/estado list their own and link to Brasil's list.
- `lib/nerds/signals.ts`: Cobertura (places with a published result; the seções note), Conferência (diferença, N de M passaram), Edição (date, "conferido em", latest or not). When a check fails a banner leads the page (before "Como ler"),
  the strip goes amber and each panel of the affected cycle carries "não conferido"; the page stays usable. When all pass the strip is minimal.
- Records `sinais` and `invariantes` (same footer gate); both complete in the HTML without scripts.
- Data contracts: `lib/nerds/claims.ts` parses the claims in a footer's definição/cálculo ("O total é a soma das linhas", "comparecimento + abstenção = 100%") and requires an executable rule for each; a failing fixture proves the build fails
  ("footer claim ... has no matching executable check"). `contracts.test.ts` lists every panel of the catalogue with a golden-data contract computed from the source CSV and fails when a panel has none.
- e2e builds a corrupted copy of the fixture shards (a município's comparecimento + 7) in a temp directory and checks the banner, the strip, the failing rule and the "não conferido" label on the page.

## Screenshot review (1440x900 vs N3): strip layout matches; differences: (1) the strip carries a four-field footer (the footer gate applies to every number; frame has none) low; (2) frame has "12 de 12 passaram" summary and two links under the list ("Ver como cada conferência é calculada", "Abrir o relatório de qualidade desta edição"): not added (the quality-report link is outside this milestone's entry points and the calculation link has no destination yet) low.
