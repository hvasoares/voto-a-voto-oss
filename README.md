# Voto a Voto

Brazilian election results, vote by vote: a TSE data pipeline and a static, verifiable results site.

Covers the 2018, 2022 and 2026 presidential elections at municipality level, with every number traceable to its source.

## Licence

The code is released under the MIT licence (see `LICENSE`).

The open dataset published with each edition (`editions/<id>/release/`) is released under Creative Commons Attribution 4.0 (CC BY 4.0), with attribution to the source (TSE) and the project. It keeps its own terms in its `LEIAME.md` and `CITATION.cff`; the licence of the code does not apply to it.

## Layout

- `src/voto_a_voto/tse_scrape.py` downloads the signed municipality results of 2026 from the TSE results site, with a disk cache (`make tse-scrape`, the raw per-city CSV).
- `src/voto_a_voto/opendata.py` is the resumable, verified download cache for the TSE open-data zips (2018 and 2022).
- `src/voto_a_voto/munzona.py`, `cities.py` are pure parsers (open-data CSVs; city index, slugs, regions).
- `src/voto_a_voto/dataset.py`, `reconcile.py`, `manifest.py`, `reference.py` assemble the tables, check them against the TSE's own totals and describe where they came from.
- `src/voto_a_voto/centroids.py` fetches the municipality centroids IBGE publishes (27 small state files into `.cache/ibge/`, once) for the site's "Usar minha localização" (ticket #40).
- `src/voto_a_voto/editions.py`, `publishing.py` freeze `data/` as dated, immutable editions in `editions/` and publish them automatically when the TSE data is final (tickets #59, #60).
- `src/voto_a_voto/cli.py` is the `voto-data` command (`build`, `check`, `publish-edition`, `rollback-edition`, `publish-auto`).
- `src/voto_a_voto/nonvoters.py` is the measure of ticket #24 (`make nonvoters`, note in `docs/nonvoters-vs-margin.md`): in what share of cities the people who did not vote outnumber the winning margin.
- `scripts/munzona_to_municipios.py` is the old 2018/2022 aggregation script, kept until the new pipeline replaces it.

## Deploy

`make deploy` pushes `main` to `origin` — the public `voto-a-voto-oss` repository — where GitHub Actions builds the site from the committed dataset and publishes it to GitHub Pages.

## Editions (`editions/`)

An edition is a frozen, dated copy of `data/`: `editions/<id>/data/` (the six files, byte for byte) and `editions/<id>/edition.json` (id, date, fingerprint, counts, notes, the size and SHA-256 of every file and how it was published). The id is the newest collection date in the manifest (`2026-10-27`; `2026-10-27-2` for a different dataset published the same day). The site serves each one at `/edicoes/<id>/`, lists them at `/edicoes/` and in the Atom feed `/edicoes/feed.atom`, and every page footer names the edition it shows (the one whose fingerprint is the `data/` being built; the build fails if there is none).

```
make publish-edition           # after `make data`: freezes data/ as a new edition (DATE=YYYY-MM-DD to choose the date); nothing happens if data/ already is one
make data-check                # also checks every edition against its edition.json and that data/ is one of them
```

A published edition is never rewritten: publishing creates a new directory, an existing id is an error, `make data-check` fails if any frozen file or `edition.json` changes, and the site copies each `edition.json` unchanged.

### Automatic publishing and the "Final, não ao vivo" rule

`voto-data publish-auto` (run every 6 hours by `.github/workflows/publish-edition.yml`, or by hand) builds the data, then publishes a new edition only if all of these pass: the 2026 results are marked final by the TSE (partial data is never published), the tables have the committed schema, the national totals including overseas equal the TSE's own files, and a second build from the cache is byte-identical. The checks are stored in the edition (`publication.checks`) and shown on its page and in the feed. If any check fails nothing is published, `data/` and every edition stay as they were, the command exits 1 and `editions/status.json` records the failed check and why. When the data is the same as an existing edition, nothing happens.

### Rollback

`make rollback-edition` restores `data/` to the edition before the one `data/` shows (it copies `editions/<previous>/data/*` back; no edition is touched). Review the diff, commit `data/` and push: the site then shows the previous edition, and the newer edition stays published at its own address and in the feed. `publish-auto` does not undo a rollback: while the source data equals an existing edition it leaves `data/` alone. To go forward again, restore the newer `data/` with `git checkout <commit> -- data` or publish a corrected build.

## `make data`

```
make data                      # all cycles; downloads only what is missing or changed
make data CYCLES=2026          # only fetch 2026 (same as `make data-2026`); the other cycles must already be cached
make data EXTRA=--offline      # no network at all; fails if something is not in the cache
make data EXTRA=--allow-partial  # accept 2026 cities the TSE has not marked final
make data-check                # offline validation of data/ (and of data/geo/, the UF outlines)
make data-outlines             # only the 27 UF outlines (IBGE malhas, cached in .cache/ibge) -> data/geo/uf-outlines.json + manifest.json (#53); `make data` runs it too
make test
```

`make data` writes the committed tables under `data/` (UTF-8, LF, fixed columns, rows sorted by key, no timestamps, so a rerun on cached input is byte-identical):

| File | Grain | Columns |
|---|---|---|
| `cities.csv` | city, plus overseas post | `uf, cd_municipio, cd_ibge, nome, slug, regiao, ciclos` |
| `turnout.csv` | ano x turno x city | `ano, turno, uf, cd_municipio, aptos, comparecimento, abstencoes, brancos, nulos, anulados_apu_sep, validos` |
| `votes.csv` | ano x turno x city x candidate | `ano, turno, uf, cd_municipio, candidato_numero, votos` |
| `candidates.csv` | ano x turno x candidate | `ano, turno, candidato_numero, nome_urna, partido` |
| `centroids.csv` | Brazilian city (IBGE code) | `cd_ibge, lat, lon` |
| `manifest.json` | one entry per source | see below |

`anulados_apu_sep` (TSE `QT_VOTOS_ANULADOS_APU_SEP`) are votes annulled in a separate tally: part of `comparecimento`, neither valid, blank nor null. The identity is `validos + brancos + nulos + anulados_apu_sep == comparecimento`. It is 0 everywhere except 2018 round 1, Salvador/BA (746 votes, zone 18); the 2026 files carry no such count and it is 0. `nulos` in 2026 is the TSE `tvn` (total, including technical nulls).

Notes for consumers: `uf` is lowercase and overseas posts are `zz` (region `exterior`, empty `cd_ibge`); `cd_municipio` is the TSE code without leading zeros; a city missing from an earlier cycle (Boa Esperança do Norte/MT exists only in 2026) means "sem dados", not zero; candidate numbers are reused across cycles, so key them with `ano`. Region and UF totals exclude `zz`; Brazil totals include it.

Output: a run summary per source (downloaded / not modified / from cache / adopted), then the row count of each table. The command exits non-zero, and writes nothing to `data/`, if a source fails, a 2026 city is missing or not final, or any reconciliation finding appears (city counts per round, `validos + brancos + nulos + anulados_apu_sep == comparecimento`, candidate votes == `validos`, national totals including overseas equal to the TSE's own).

### First run and reusing a cache

A cold cache downloads about 1 GB (plus 27 small IBGE files for the centroids, about 2 MB) (`votacao_candidato_munzona_2018.zip` 377 MB, `_2022.zip` 613 MB, two 4 MB `detalhe_votacao_munzona` zips, and about 11,500 small 2026 files; the 2026 step uses 8 workers). To avoid it, copy an existing cache with the same layout (on APFS `cp -c` clones without using disk):

```
cp -c -R ../other-checkout/.cache/tse .cache/tse
cp -c -R ../other-checkout/.cache/tse-opendata .cache/tse-opendata
```

A zip without its `.meta.json` is adopted after a 1-byte `Range` probe confirms the size and records the validators; it is never re-downloaded when it matches.

### Reading the manifest

`centroids.csv` has the centre IBGE gives each municipality (WGS84, 4 decimals); 5,570 of the 5,571 cities: Boa Esperança do Norte/MT was created after the mesh IBGE serves and has none (the one documented exception; the site never offers it as the nearest city). `data/manifest.json` has, for each source, the URL, `retrieved_at`, `bytes`, `sha256`, `member` and `rows` (open-data zips), and for the 2026 results site the number of files, how many the TSE marked final (`and = f`; the config file carries no marker), the newest TSE generation timestamp, and `digest`, the SHA-256 of the sorted `name sha256` lines of every file used. `outputs` has rows, bytes and SHA-256 of each table. `national_reference` holds the TSE's own national totals used as the independent oracle. `turnout_identity` records, per cycle and round, `aptos - comparecimento - abstencoes` next to the electorate of sections not installed that the source reports (they must be equal where reported).

### When `make data-check` fails

It prints each finding and exits 1. A `manifest` finding means a file in `data/` differs from what was built (restore it with `git checkout data/` or rebuild with `make data`). Any other finding is a data-quality problem: do not edit `data/` by hand. If the TSE re-issued an open-data zip, the `sha256` in the manifest changes and the diff in `git diff data/manifest.json` is what to review.
