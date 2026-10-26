# 2026 runoff: outstanding results from the final TSE data

Date: 2026-10-26

## Data

- Refreshed with `make tse-scrape` (`src/videoprep/tse_scrape.py`, cache in `.cache/tse`). That run downloaded 686 files that were
  not yet final in the cache. The other 10,456 came from cache.
- Output: `outbox/tse/presidente_municipios.csv`, 5,571 municipalities x 2 rounds (77,994 rows).
- Every municipality is final (`situacao = f`) in both rounds. Sections counted: 497,897 of 497,897.
- Analysis was a throwaway script in the session scratchpad and is not in the repo.
  Recreate it from the definitions below if needed.
- Runoff: Lula 64,056,078 (51.78%), Flavio Bolsonaro 59,654,544. Round 1: Flavio 55.96M, Lula 53.72M.
- Cities won in the runoff: Lula 2,875, Flavio 2,695, 1 tie.

## Definitions

- Margin = Lula share minus Flavio share, in percentage points of valid votes. Swing = R2 margin minus R1 margin.
- Comparison with 2022 uses the 2022 runoff in `.cache/tse-opendata/presidente_2022_municipios.csv`, joined on the TSE
  municipality code (5,570 cities matched, overseas `zz` excluded). Lula 2022 is compared with Lula 2026. Flavio 2026 is
  compared with Bolsonaro 2022 (candidate 22).
- The 2022 file has nominal votes and the 2026 file has valid votes. For one candidate's own total they are the same.
- "Counted the most" is read as volume of valid votes. The final files carry no count-order timeline.

## Overcomes, round 1 to round 2

- Lula flipped 211 cities he lost in round 1. Flavio flipped 1. Almost every city moved toward Lula, so a "biggest swing
  toward Flavio" ranking only lists the cities that moved least and is not meaningful.
- Largest flips to Lula (5k+ valid votes):
  - Itabirito/MG: -4.5pp to +5.0pp
  - Barra do Piraí/RJ: -5.1pp to +4.2pp
  - João Monlevade/MG: -5.1pp to +4.1pp
  - Pirapora do Bom Jesus/SP: -0.1pp to +8.8pp
  - São Vicente/SP: -7.7pp to +0.7pp (189k valid votes)
- Largest swings to Lula among cities of 100k+ valid votes:
  - Campos dos Goytacazes/RJ: +9.8pp, still lost by 15.8pp
  - Sobral/CE: +8.8pp
  - Nossa Senhora do Socorro/SE: +8.7pp
  - Belford Roxo/RJ: +8.6pp
  - Salvador/BA: +8.2pp
- States: MG is the only flip (-4.9pp to +0.9pp for Lula). Largest swings: RJ +7.4pp (Flavio still won), AL +7.3, SE +6.9,
  PB +6.7, RN +6.5. Smallest: RO +2.3, AC +2.7, SC +2.8.
- Lula R1 to R2 gains: São Paulo +812k, Rio +374k, Salvador +210k, Brasília +150k, Belo Horizonte +149k.
- Flavio R1 to R2 gains: São Paulo +337k, Rio +123k, Belo Horizonte +74k, Curitiba +74k, Goiânia +72k.

## Votes lost and gained, 2022 runoff vs 2026 runoff

- Lula gained 3,862,039 votes nationally: gained in 3,428 cities, lost in 2,132.
  - Largest gains: São Paulo +186k, Rio +164k, Brasília +96k, Manaus +83k, Recife +75k, Salvador +64k.
  - Largest losses are small, at most 2.4k each: Itaituba/PA -2,403, Rio Grande/RS -2,205, Catalão/GO -1,731,
    Santiago/RS -1,609, São Mateus do Sul/PR -1,565.
- Flavio vs Bolsonaro 2022 gained 1,591,101 votes nationally: gained in 5,118 cities, lost in 451.
  - Largest losses: Rio -144k, São Paulo -94k, Belo Horizonte -69k, Brasília -62k, Belém -44k.
  - Largest gains: Maricá/RJ +14.8k, Sinop/MT +12.3k, Canaã dos Carajás/PA +11.7k, Palmas/TO +10.8k, Rio Verde/GO +10.6k.

## Biggest net-vote wins in the runoff

- Lula: São Paulo +766k (55.5%), Salvador +732k (73.2%), Fortaleza +313k, Recife +233k, Teresina +178k, São Luís +150k,
  Rio +113k, Feira de Santana +103k.
- Flavio: Curitiba +277k (Lula 37.7%), Goiânia +204k, Joinville +173k, Brasília +154k, Manaus +137k, Londrina +120k,
  Campo Grande +114k, Blumenau +102k.
- Closest city races: Marquinho/PR tie (0), Apiacá/ES (+1 Lula), Anhangüera/GO (+1 Flavio), Altamira do Paraná/PR (+1 Lula),
  Nova Luzitânia/SP (+1 Flavio).

## What counted the most (runoff valid votes)

| Region | Valid votes | Share | Turnout | Lula | Cities |
|---|---|---|---|---|---|
| Sudeste | 50.88M | 41.1% | 79.7% | 47.2% | 1,668 |
| Nordeste | 35.25M | 28.5% | 83.5% | 69.4% | 1,794 |
| Sul | 18.20M | 14.7% | 81.8% | 37.4% | 1,191 |
| Norte | 10.05M | 8.1% | 78.8% | 50.0% | 450 |
| Centro-Oeste | 9.34M | 7.5% | 79.9% | 40.0% | 468 |

- States: SP 26.3M, MG 12.6M, RJ 9.7M, BA 9.1M, PR 6.9M, RS 6.7M, PE 6.0M, CE 5.9M. Highest turnout: CE 86.1%, PE 84.8%.
- Cities: São Paulo 6.96M, Rio 3.68M, Brasília 1.80M, Salvador 1.58M, Fortaleza 1.55M, Belo Horizonte 1.51M, Manaus 1.18M,
  Curitiba 1.13M.
- City turnout (5k+ voters): highest Santa Maria do Herval/RS 90.5%, Riacho das Almas/PE 90.2%, Cândido Godói/RS 90.2%.
  Lowest Itaubal/AP 59.0%, Barcelos/AM 59.3%, Marechal Thaumaturgo/AC 59.3%.

## Caveats and next steps

- Absolute-vote rankings favour big cities. Use percentage-point swings and shares to compare places of different sizes.
- Next: put these rankings into the site as precomputed data files, and add 2018 (`presidente_2018_municipios.csv`) as a
  third point of comparison. See [map and granularity note](2026-10-26-frontend-map-and-tse-granularity.md).
