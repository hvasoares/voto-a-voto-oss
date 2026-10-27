# Data shards (issue #49)

The build turns the committed dataset into small pre-rendered JSON files so the browser never
fetches or parses a CSV. Each page loads only the shard it needs — or none, when the data is
already in its HTML. The generator lives in `web/integrations/shards.ts`; the data check is
`npm run check:shards` (acceptance of the ticket).

## Paths — `public/data/v<fingerprint>/…`

The version directory changes whenever the dataset changes, so a stale copy is never served:

| Shard | Path | Used by |
|---|---|---|
| Search index | `search.json` | The home search (fetched only when the field gains focus) |
| City | `city/<uf>/<slug>.json` | The city card, one request per page view |
| State | `state/<uf>.json` | State list pages |
| Totals | `totals.json` | National and region totals |

`<fingerprint>` is 16 hex characters of sha256 over the five committed dataset files
(`cities.csv`, `turnout.csv`, `votes.csv`, `candidates.csv`, `manifest.json`). Client and page
code learn it through `virtual:data-shards` (`@/shards` exports `SHARD_VERSION`).

## Fields

**City** — `{ city, cycles, candidates }`:

- `city`: the identity block — `uf, slug, nome, regiao, cdMunicipio, cdIbge, ciclos` (ciclos is
  the dataset's own list; a cycle missing there means "sem dados", never zero).
- `cycles`: `{ [ano]: { [turno]: block } }`, a key **only** where the CSVs have rows. Block:
  `aptos, comparecimento, abstencoes, brancos, nulos, anuladosApuSep, validos` (integers, and the
  identity `validos+brancos+nulos+anuladosApuSep = comparecimento` holds per row), then
  `"votes": { [candidato_numero]: votos }` when the round has candidate rows.
- `candidates`: the same block every city shard embeds —
  `{ [ano]: { [turno]: { [numero]: [nome_urna, partido] } } }`.

**State** — `{ uf, regiao, cities: [{ nome, slug }] }` (the fields a list needs; overseas posts,
`uf = "zz"`, are cities, not a state).

**Totals** — `{ national: cycles, regions: { [regiao]: cycles } }`; the sums per cycle and round
over all their cities. Overseas posts enter the national totals and form the `"exterior"` region.
A region has a block only when it has cities — never invented.

**Search** — an array of `[nome, slug, uf]` rows, every city (overseas included).

## Determinism

Regenerating the shards from an unchanged `data/` is byte-identical: the dataset files are read
as bytes for the fingerprint, and JSON is written with keys in a fixed order (years and round
numbers numerically, names code-point — never locale/ICU), no rounding, no trailing newline,
`JSON.stringify` separators not customized.

## Semantics of absence

The dataset decides what exists: a cycle or round the CSVs have no rows for is an absent key —
never zeros. Boa Esperança do Norte (MT) exists only in 2026; its shard has only the 2026 block.

## Measured sizes and proposed budgets

`npm run check:shards:real` (the 5,760-city dataset in `../data`, fingerprint `2cc25d2e8eb691bf`,
5,789 shard files) measures, uncompressed and gzipped on disk:

| Shard | Typical | Largest | Budget proposed |
|---|---|---|---|
| City | 2.5 kB raw / 1.1 kB gzip (ba/urandi) | sp/sao-paulo 2.8 kB / 1.2 kB gzip | 8 kB raw / 4 kB gzip |
| State | 6.8 kB raw / 1.9 kB gzip | mg 38.7 kB / 10.1 kB gzip | 120 kB raw / 32 kB gzip |
| `totals.json` | — | — | 30 kB raw / 12 kB gzip (9.7 kB / 3.0 kB today) |
| `search.json` | — | — | 400 kB raw / 120 kB gzip (205 kB / 60 kB today) |

The budgets leave about 3x headroom over the largest measured file of each kind. The browser loads
at most one of them per page view: the city card loads only its city shard, a state or region page
only its state shard, and the home only `search.json` (about 60 kB gzip) once the search field
gains focus. A city page loads none: the city is already in its HTML.

Fixture values for comparison (`npm run check:shards`, 9 cities): city shards 0.9 to 1.5 kB raw,
state shards 0.1 to 0.4 kB, `totals.json` 3.3 kB raw, `search.json` 0.4 kB raw. Run again whenever
the budgets need a fresh number.

The dataset changes on its own schedule: these numbers were measured in October 2026. Every shard
is rebuilt on every build, so the sizes cannot drift from the dataset without a build noticing.