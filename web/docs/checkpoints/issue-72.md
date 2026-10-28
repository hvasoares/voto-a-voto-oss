# Issue 72: Dados para nerds, level shards

Data-only ticket: no page changes, so there is no screenshot review (checkpoint step 2 does not apply).

## Checkpoints
1. `src/voto_a_voto/nerds.py` + `voto-data nerds` / `make data-nerds`: 198 shards for the real data (6 Brasil, 30 região, 162 UF; the fixture makes 28), `nerds/manifest.json`.
2. `voto-data check` (`make data-check`) rebuilds every shard from the dataset and compares bytes, then checks the reconciliations; `publish-edition` / `publish-auto` / `rollback-edition` regenerate them.

## Decisions
- Shards are committed data under `data/nerds/` (derived, pinned to the edition; header = edition id + dataset fingerprint). Not copied to `dist`: pages print them at build time.
- Brasil includes the overseas posts as the sixth child `exterior` / UF `zz`, so "sum of regions = Brasil" and "sum of UFs = Brasil" hold exactly; they have no page of their own.
- `brancos_nulos` includes anulados e apurados em separado (746 votes nationally in 2018-1) so the identity candidates + brancos + nulos = votantes is exact.
- `nao_instalados` is carried because comparecimento + abstenção ≠ eleitorado for the overseas posts (3,100 voters) and one 2022 municipality: the TSE reports the remainder apart.
- Seções apuradas: NOT in the dataset (neither the CSVs nor the manifest carry section counts for the final results); the ticket's "seções apuradas" column cannot be met and is
  left out of the shards. #73's Placar prints the row as "não consta nos dados publicados" and #77's Sinais coverage says so instead of inventing 100%.
