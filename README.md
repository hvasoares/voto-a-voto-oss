# Voto a Voto

Brazilian election results, vote by vote: a TSE data pipeline and a static, verifiable results site.

Covers the 2018, 2022 and 2026 presidential elections at municipality level, with every number traceable to its source.

## Layout

- `src/voto_a_voto/tse_scrape.py` downloads the signed municipality results from the TSE results site, with a disk cache (`make tse-scrape`).
- `scripts/munzona_to_municipios.py` turns a TSE open-data `votacao_candidato_munzona_<year>.zip` into municipality totals (used for 2018 and 2022).
- `thoughts/` holds design and research notes.

## Data

Downloaded data is not committed: `.cache/` and `outbox/` are rebuilt from TSE.
