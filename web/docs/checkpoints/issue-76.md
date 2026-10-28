# Issue 76: Dados para nerds, Tabela de detalhe at every level

Frames: the Tabela panel of "N1/N2/N3" (header row, ▸/▾ rows, indented children, total row, footer), compared at 1440x900.

## What was built
- Record `detalhe` (kind `table`, `shard: 'ciclo'`); `lib/nerds/detalhe.ts` builds the same columns at every level from the level's own shard (the column set comes from the measure family;
  `candidatos` throws until #81 adds its columns): Brasil lists its regiões (+ Exterior, unlinked), a região its UFs, an estado every município, alphabetical, total on the last row (a test: last row = sum of the rows).
- Server-rendered complete table (header row, right-aligned numbers, "sem 2º turno" for a place with no 2º turno row); a name degrades to a link to the child level's page (or the city card).
- Enhancer `lib/nerds/table-enhance.ts` (DOM-level, jsdom-tested) behind the island `DetalheEnhancer` (client:panel: from 1024 px, when in view): name filter (accent-insensitive), sort by any column (stable, "sem 2º turno" last either way), paging (25), ▸/▾ rows that fetch the shard of
  the região/UF for the cycle on screen and insert the children indented, CSV download (provenance block: Fonte, Edição, Data, Cálculo, Licença; then the rows as printed).
- Async rules: opening a row bumps its token; a result is applied only if the row still waits for that token (tested: close while loading, open-close-open with stale answers arriving last); `data-state` on the row, `data-busy` on the table and `data-ready` on the wrapper are what e2e waits on.
- Shipped data: `integrations/nerds-shards.ts` copies the `regiao/` and `uf/` shards (3.3 MB raw for real data, 192 files) to `public/data/v<fingerprint>/nerds/`; nothing per city beyond what the shards of #72 carry.

## Deviations
- Header labels are the frame's short forms ("COMPAR. 1º", "BR.+NULOS 1º") with the full name in `title`/`data-label` (the CSV uses the full name).
- Without scripts a row does not open inline (it is a link to the child page, as the ticket allows); there is no outlier or ranking list anywhere.
- The Brasil level also lists "Exterior" (a sixth child that has no page) so the last row equals the sum of the rows.
- The three cycles are in the HTML (one table each); the island of a hidden cycle never hydrates (display:none is never "in view").

## Screenshot review (1440x900 vs frame): fixed the first draft's wrapped names and 2-line headers (blocker, long headers -> short forms, name column min-width); remaining: caption line under the filter row (low), Citar/CSV/Imagem actions (#79).

## Measured (fixture build)
- Phone: no table chunk and no React requested (tested at 390); desktop table chunk loads only when the panel is in view (tested at 1440x300).
- Real-data budgets (largest estado page, desktop DOM) are measured on the real build, see the milestone note on #76.
