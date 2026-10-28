# Issue 79: Dados para nerds, Par 1º→2º and Distribuição

Frames: the Par and Distribuição panels of "N1/N2/N3" (rows, note, histogram, box plot, rule, footer), compared at 1440x900 (Par left, Distribuição right, as in the frames).

## What was built
- `par` (kind `table`): the place, the level above it (região for an estado, Brasil for a região) and Brasil, with the 1º and 2º turno values side by side, the fixed note on when a 2º turno exists, "sem 2º turno" where there was none.
  No difference is computed anywhere (test: every cell is a rate of a shard; no signed or "pp" figure; the footer says so).
- `distribuicao` (kind `histogram`, added to the renderers here): fixed two-point bins aligned to even numbers, box plot, min/Q1/median/Q3/max printed, the 1.5 × IQR rule printed. `fiveNumber` is the one pure function
  (linear interpolation between ranks); a test compares it with an independent computation from the source CSV. Bin counts sum to the number of children at all three levels (27 UFs on real Brasil data, the região's UFs, the estado's municípios).
- No place is named: the spec holds numbers and the rule only (tested), there is no outlier list.
- Without scripts: Par is a table; Distribuição is a table of bins plus the five-number summary for each turno. Island `DistribuicaoPanel` (client:panel): the histogram with the box plot, pickers for measure and turno (kept in `?medida=&turno=`), "Ver como tabela" toggle; counts in the chart equal the table (tested). `data-drawn = tabela | grafico`.
- Panel contracts for `par` and `distribuicao` added to `contracts.test.ts` (golden data from the CSV).

## Screenshot review: layout matches. Differences: footer sits right under the content instead of the card bottom (low); the box-plot labels at 1 decimal are small (low). The two-column order is Par | Distribuição below Mapa | Escada, as in the frames.
