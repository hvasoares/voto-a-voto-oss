# `make data`: download, cache and normalize the TSE data behind "Election SPA v2"

Date: 2026-10-26
Repo: `voto-a-voto`
Sketch file: page `Election SPA v2` (14 mobile screens, document "Untitled 2")

## Overview

Add a `make data` task that downloads every TSE source the v2 screens need, caches the raw downloads, and writes a small set of
normalized, committed CSVs plus a hashed manifest. Same command run twice changes nothing. The site build reads only the committed
CSVs and never touches TSE.

## What the v2 screens need (read from the Sketch file)

| Screen | Data it needs |
|---|---|
| 1 Home, 5 Estado | City index: name, UF, slug, TSE code; municipality list per UF (e.g. 92 in RJ) |
| 2 Cartão da cidade, 3 Compartilhar, 4 QR | Per city, latest cycle: voted % of electorate, non-voted split (abstention, blank, null), candidate votes and % of valid votes; slug for `votoavoto.../rj/cidade`  |
| 9 Três ciclos (cidade), 13 Três ciclos por estado | Same fields for 2018, 2022, 2026, round 1 and 2 (screen 9 text: "Dados de 2018 e 2022 ainda não foram coletados") |
| 8 Brasil e regiões | National and regional valid votes, turnout (compareceram / não). Screen 8 text: "O arquivo não separa brancos e nulos" |
| 10, 10b Mapa por estado; 6, 7, 11, 11b, 12 Relatórios | State aggregates and per-city margins/swings, 2026 R1 and R2 plus 2018 and 2022 R2 |

## Current state

- `src/voto_a_voto/tse_scrape.py` scrapes the 2026 per-city signed files (`.jws`) with a validator-aware disk cache. It keeps votes,
  electorate, turnout and valid votes. It drops blank, null and abstention counts, drops the IBGE code, and skips overseas (`zz`).
- `scripts/munzona_to_municipios.py` builds 2018/2022 candidate votes only. No turnout, blank, null or abstention for those cycles.
- No data is cached in this repo yet. The old repo `centraleleicao2026` holds `.cache/tse` (22,284 files) and `.cache/tse-opendata`
  (2018 zip 377 MB, 2022 zip 613 MB).

## Verified in research (2026-10-26)

- **2026 file already has the missing fields.** Per-city payload: `e.te` electorate, `e.c` turnout, `e.a` abstention, `v.vvc` valid, `v.vb` blank,
  `v.vn` null. São Paulo R2: 7,284,071 = 6,962,277 + 104,890 + 216,904. Only the scraper discards them.
- **IBGE code comes from TSE.** The 2026 config file `config/mun-e006258-cm.jws` lists every city with `cd` (TSE) and `cdi` (IBGE, 7 digits).
  Overseas posts have `cdi = ""`.
- **Overseas votes were missing from our totals.** The config has a `zz` block with 186 posts. TSE's own national file
  (`dados/br/br-c0001-e006258-u.jws`) gives Lula **64,256,232** and Flavio **59,826,041**. Our city sums (64,056,078 / 59,654,544,
  used in the runoff highlights note and on screen 8) leave out about 200k and 171k overseas votes. Shares barely move (51.78% both ways).
- **2018 and 2022 turnout files exist.** `cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_{2018,2022}.zip`,
  4.3 MB and 4.4 MB. Member `..._BR.csv` has `QT_APTOS`, `QT_COMPARECIMENTO`, `QT_ABSTENCOES`, `QT_VOTOS_BRANCOS`, `QT_VOTOS_NULOS`, per
  municipality x zone, presidential rows have `CD_CARGO = 1`. 5,570 cities each, R2 totals match known magnitudes (2018: 146.8M electorate; 2022: 1.76M blank, 3.92M null).
- **Identity differs by cycle.** 2018 R2: `aptos = comparecimento + abstencoes` exactly. 2022 R2 is off by 84 voters (consistent with electors in
  sections not installed; confirm against `QT_ELEITORES_SECOES_NAO_INSTALADAS` in Phase 2).
- **Candidate numbers are reused by different people.** 13 = Haddad (2018), Lula (2022, 2026); 17 = Bolsonaro (2018); 22 = Bolsonaro (2022), Flavio (2026).
- **One city exists only in 2026:** Boa Esperança do Norte/MT (code 73709). It has no 2018/2022 rows.
- **Presidential rows live only in the `_BR.csv` member** of the votes zip, not in the per-UF members.

## Desired end state

`make data` leaves these committed files under `data/`, all derived from TSE:

| File | Grain | Columns |
|---|---|---|
| `cities.csv` | one row per city + one per overseas post | `uf, cd_municipio, cd_ibge, nome, slug, regiao, ciclos` (`ciclos` = cycles with data, e.g. `2018;2022;2026`) |
| `turnout.csv` | ano x turno x city | `ano, turno, uf, cd_municipio, aptos, comparecimento, abstencoes, brancos, nulos, validos` |
| `votes.csv` | ano x turno x city x candidate | `ano, turno, uf, cd_municipio, candidato_numero, votos` |
| `candidates.csv` | ano x turno x candidate | `ano, turno, candidato_numero, nome_urna, partido` |
| `manifest.json` | one entry per source | url, retrieved_at, bytes, sha256, member, rows; for 2026: file count, final count, per-file hash digest |

Rules for all files: UTF-8, LF, fixed column order, rows sorted by key, no timestamps inside CSVs (they live in the manifest), so a rerun on cached
input is byte-identical.

`make data-check` re-validates the committed files with no network access.

## What we are NOT doing

- IBGE boundaries and map geometry (not a TSE source). `cd_ibge` is delivered so a later step can join them.
- Section, polling-place and bairro data, and the extension-window report (v1 ships without it, per the forged idea).
- Computing report numbers (swings, cohorts, state margins). Those are derived from these files in a later build step; Phase 3 only checks that
  the known figures can be reproduced.
- Updating the Sketch text. Follow-ups noted at the end.
- Poll data, share images, QR, site build.

## Layout

```
src/voto_a_voto/
  tse_scrape.py   extend: blank/null/abstention, overseas, IBGE code
  opendata.py     resumable, verified download cache for the zips (imperative shell)
  munzona.py      pure parsers: votes, candidates, turnout rows from CSV text
  cities.py       config -> city rows, slug, region (pure)
  dataset.py      assemble + deterministic CSV/manifest writers
  reconcile.py    checks (pure functions returning findings)
  cli.py          `voto-data build [--cycles ...] [--offline]`, `voto-data check`
data/             committed outputs
tests/unit/ tests/integration/ tests/fixtures/
```

Cache layout stays `.cache/tse/` (2026 `.jws`) and `.cache/tse-opendata/` (zips), the same names as the old repo, so an existing cache can be
copied or symlinked instead of re-downloaded (about 1 GB plus 22k small files).

## Phase 1: 2026 completeness (test first)

1. Extend `parse_municipality` to return `blank`, `null`, `abstentions` (and keep `valid_votes`). Update `CSV_COLUMNS` and `to_rows`. Existing tests
   change shape, add tests for the new fields.
2. Scrape the overseas posts: `list_municipalities` must include `zz`, with `uf = "zz"`, empty IBGE code kept as empty.
3. `cities.py`: parse the config into city rows including `cd_ibge`; `slugify(name)` (NFKD, ASCII, lowercase, hyphens); unique per UF (assert);
   static UF -> region map; overseas rows get region `exterior`.
4. Guard: a city whose `situacao` is not `f` fails the build unless `--allow-partial`; the failure lists the cities.

Success criteria:
- [x] Automated: `uv run pytest` passes; new unit tests cover the fields, slug rules (accents, apostrophes, duplicates), region map for all 27 UFs.
- [x] Automated: running the 2026 step on the copied cache gives 5,571 + 186 rows per round; for every city `validos + brancos + nulos == comparecimento`.
- [ ] Manual: spot-check São Paulo R2 against the TSE results page.

Phase 1 findings (2026-10-26): `tvn` (not `vn`) is the null count: `tvn = vn + vnt` (technical nulls, 5,123 votes nationally) and only
`validos + brancos + nulos == comparecimento` with `tvn` holds in all 11,142 final city files (`vn` fails in 1,628). 80 overseas post-rounds
(40 posts) are not installed (`comparecimento = 0`, `abstencoes = 0`, `eleitorado > 0`); the identity `comparecimento + abstencoes == eleitorado` holds for every other row.

## Phase 2: 2018 and 2022 from TSE open data

1. `opendata.py` `OpenDataCache.fetch(url)`: stream to `<name>.part`, resume with `Range` if present (if the server answers 200 instead of 206, discard the partial file and restart), verify size against `Content-Length`,
   verify the zip opens and the expected member exists, compute SHA-256, atomic rename, write `<name>.meta.json` (etag, last-modified, sha256, bytes).
   Revalidate with `If-None-Match`; a second call with no change makes no download. Retries with backoff on 5xx/network errors; 4xx fails immediately.
2. `munzona.py` pure parsers over CSV rows (latin-1, `;`): validate the header names we use and fail loudly if a column is missing. Presidential
   rows only (`CD_CARGO = 1`), keep overseas (`SG_UF = ZZ`) as `uf = zz`.
   - votes: sum `QT_VOTOS_NOMINAIS` per ano, turno, uf, city, candidate number (keeps the existing method that matches the 2022 file for all Brazilian cities).
   - candidates: `NR_CANDIDATO`, `NM_URNA_CANDIDATO`, `SG_PARTIDO`, keyed by (ano, turno, numero).
   - turnout: sum `QT_APTOS`, `QT_COMPARECIMENTO`, `QT_ABSTENCOES`, `QT_VOTOS_BRANCOS`, `QT_VOTOS_NULOS` over zones; `validos` = `QT_TOTAL_VOTOS_VALIDOS`
     (confirm column semantics on the real header; runoff valid votes must equal the two candidates' sum).
3. Record in the docs/manifest the per-cycle identity `aptos` vs `comparecimento + abstencoes` and any known remainder (2022: sections not installed).

Success criteria:
- [x] Automated: unit tests on trimmed fixture CSVs (a few rows per case: two zones in one city, overseas row, a city with a blank-only zone); cache tests with a fake
  transport at the HTTP boundary (full download, interrupted download resumed, size mismatch rejected, unchanged second call makes zero requests).
- [x] Automated: for both cycles, 5,570 Brazilian cities in each round with no duplicate keys; the new vote step reproduces the committed `presidente_2018_municipios.csv`
  and `presidente_2022_municipios.csv` of the old repo for every Brazilian city (regression oracle).
- [ ] Manual: open the 2018 R2 national turnout and compare with the TSE results page.

Phase 2 findings (2026-10-26): national R2 identity `aptos = comparecimento + abstencoes + QT_ELEITORES_SECOES_NAO_INSTALADAS` holds exactly in both cycles, including overseas: 2018 R2 remainder 470 (= 470 reported), 2022 R2 remainder 657 (= 657 reported). The plan's "2018 exactly" and "2022 84 voters" were not what the real files show (see the final report). In 2018 R1 one zone (BA, Salvador, zone 18) has 746 votes in `QT_VOTOS_ANULADOS_APU_SEP`, so there `validos + brancos + nulos` is 746 short of `comparecimento`.

## Phase 3: assemble, reconcile, manifest

1. `dataset.py` merges the three cycles into the five files above with the determinism rules. `cities.csv` is the union of 2018/2022/2026 city sets with
   a `ciclos` column. Boa Esperança do Norte/MT shows `2026` only; consumers must treat missing earlier cycles as "sem dados", not zero.
2. `reconcile.py` checks, each returning a list of findings (empty = pass):
   - every (cycle, round) has all expected cities; no city appears with a different UF across cycles;
   - per city: `validos + brancos + nulos == comparecimento`; runoff candidate votes sum to `validos`;
   - national totals including overseas equal TSE's own national numbers: 2026 from `dados/br/br-c0001-e006258-u.jws` (and R1 equivalent), and
     2018/2022 from the TSE national result pages. Expected constants are copied from those independent sources and cited in the test, never recomputed from our own sums;
   - region and UF aggregates exclude `zz`; Brazil totals include it.
3. `manifest.json` written last. For 2026 it stores the file count, the count marked final, the newest TSE generation timestamp seen, and a digest of the sorted per-file hashes.
4. `voto-data check` loads the committed `data/` and runs the pure checks and manifest self-consistency (row counts, file hashes) offline.

Success criteria:
- [x] Automated: `make data && git diff --exit-code data/` (verified as byte comparison of two builds, data/ is untracked) shows no change on a second run; `make data-check` exits 0; tampering with one value makes it exit non-zero (tested).
- [x] Automated: the known figures from the runoff highlights note reproduce from the committed files (Minas Gerais flips, 211 / 1 city flips, 2,875 / 2,695 cities won), with the national
  Lula/Flavio totals now the official overseas-inclusive numbers.
- [ ] Manual: read `data/cities.csv` for Boa Esperança do Norte and one overseas post.

Phase 3 status (2026-10-26): DONE. Decision on the 746-vote finding (2018 R1, BA / Salvador 38490, zone 18; `QT_COMPARECIMENTO` 63,009 = valid 51,969 + blank 1,789
+ null 8,505 + 746 in `QT_VOTOS_ANULADOS_APU_SEP`): `turnout.csv` gets a column `anulados_apu_sep` after `nulos`, and the identity everywhere is
`validos + brancos + nulos + anulados_apu_sep == comparecimento`. It is non-zero in exactly one city-round of all cycles (that one, 746 votes); 2026 files have no such
count (`van`, `vansj`, `vsan`, `vscv` are 0 in all 11,516 final files) so it is 0. 2018/2022 national constants: 2022 electorate 156,454,011 re-confirmed in TSE
`perfil_comparecimento_abstencao_2022` (BRASIL member); the rest could not be re-fetched from TSE pages (static result files of those cycles return 404).

## Phase 4: Make targets, docs, first real run

Makefile:
```
data:        # all cycles; downloads only what is missing or changed
	uv run voto-data build $(if $(CYCLES),--cycles $(CYCLES)) $(EXTRA)
data-2026 data-2022 data-2018:
	uv run voto-data build --cycles $(subst data-,,$@)
data-check:  # offline validation of data/
	uv run voto-data check
```
- `make data` prints a run summary (downloaded / not modified / from cache / failed per source) and exits non-zero on any missing city, hash mismatch or non-final result.
- README gets: what `make data` does, first-run size (about 1 GB of downloads), how to reuse an old cache, how to read the manifest, what to do when `data-check` fails.
- The existing `tse-scrape` target and the old `scripts/munzona_to_municipios.py` stay until Phase 3 reproduces their outputs, then the script is removed in a separate commit.
- `.gitignore`: keep `.cache/` and `outbox/` ignored; `data/` is tracked.

Success criteria:
- [x] Automated: `uv run pytest` green; `make data-check` green; CI (later) runs only these two.
- [ ] Manual: fresh clone, `make data` with a cold cache succeeds; commit `data/`; size of `data/` reported (expected under 15 MB).

## Testing strategy

- Unit: pure parsers, slugs, region map, reconcile checks, determinism of writers. Fixtures are trimmed copies of real TSE rows/payloads committed under `tests/fixtures/`.
- Boundary tests: a fake HTTP transport at the existing transport seam (no patching of internals) for the downloader and the scraper.
- Data-quality tests: `reconcile` against real cached data in an integration test marked `network_cache` (skipped when the cache is absent).
- Idempotency: build twice into a temp dir, compare bytes.
- Contract canary: one scheduled/manual target that fetches the three small TSE files (config, `br` national, one detalhe zip header) and verifies the column names and fields we rely on.

## Open risks

- 1 GB first-run download; TSE can be slow or rate-limit. Worker count stays bounded (8), failed fetches retried, nothing partial is ever renamed into the cache.
- 2022 "sections not installed" remainder and the `tvn` vs `vn` null fields in 2026 must be confirmed on real data in Phases 1 and 2. If they do not reconcile, the build stops and the finding is documented, not patched around.
- TSE may re-issue the open-data zips; the manifest hash will change and `data-check` will show a diff to review.

## Follow-ups outside this plan (Sketch)

- Screen 8: the national line "Lula 64.056.078" excludes overseas; official is 64.256.232 (or label it "sem exterior"). Remove "O arquivo não separa brancos e nulos".
- Screen 9 and 13: remove "dados ainda não coletados" once the data is in. Add a "sem dados em 2018/2022" state for Boa Esperança do Norte/MT.
- The runoff highlights note and the swing note quote the overseas-exclusive totals; correct them when the data lands.

## References

- Sketch: page `Election SPA v2`; forged idea `centraleleicao2026/thoughts/shared/forge/election-spa/forged-idea.md`
- `thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md`, `...-frontend-map-and-tse-granularity.md`
- TSE sources: `resultados.tse.jus.br/oficial/ele2026/{6257,6258}/...`, `cdn.tse.jus.br/estatistica/sead/odsele/{votacao_candidato_munzona,detalhe_votacao_munzona}/`
- Code: `src/voto_a_voto/tse_scrape.py` (`CachedFetcher`, `parse_municipality`, `to_rows`)
