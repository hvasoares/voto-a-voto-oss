# Real-data sample (ticket #109)

GENERATED from `web/e2e/sample.json` by `npx tsx scripts/sample-manifest.ts doc` — do not edit by hand;
`web/scripts/sample-manifest.test.ts` refuses a stale or hand-edited copy.

The full real-data run (`make e2e-real` / `npm --prefix web run test:real`, all 5.760 cities) is unchanged and
stays the release gate. The sample is the pre-push step: `make e2e-sample` builds a subset dataset
(`DATA_DIR=.sample-data OUT_DIR=dist-sample`, git-ignored) and runs the `sample` Playwright project over it with
`E2E_PREBUILT=1`, so a full-data run can never silently use the sample build (the stamp records the data dir, #108).

Measured 2026-10-28: **15.474 pages in 111s** (gate: under 180s; page bound 16.000).

## States of the sample (ap, ba, ce, df, es, go, pr, rj, sp)

| uf | why |
| --- | --- |
| `ap` | ITAUBAL is named in reports-real-data.spec.ts (turnout extremes of the same report); 16 cities, nearly free |
| `ba` | largest Lula total of 2026: the subset must keep Lula as the national 2nd-round leader — ladoA of every margin sentence is the national leader, and real-data-mapa-rj pins those sentences |
| `ce` | with ba, tips the subset's national aggregate to Lula (needs +5.5M net without sp/rj/pr/go outweighing it); keeps the build under the 3-minute gate |
| `df` | single-city state: the launch gate and real-data-preview visit /df/brasilia/ |
| `es` | Apiacá is the second row of the disputas test of reports-real-data.spec.ts (backtest case 4bd5da4) |
| `go` | ANHANGÜERA, the one-vote race whose row id failed in 1.13.0 (backtest case 4bd5da4) |
| `pr` | Marquinho, the tie that tops the disputas test of reports-real-data.spec.ts (backtest case 4bd5da4) |
| `rj` | real-data-mapa-rj.spec.ts is green on the sample (92 municipalities, mesh join); the launch gate visits rj/rio-de-janeiro |
| `sp` | the tres-ciclos backtest (9a2e801) needs the /tres-ciclos/sp/ page; the largest state keeps the build honest |

## Specs the sample covers (1)

- `real-data-mapa-rj.spec.ts`

## Specs that need the full build (20)

| spec | why |
| --- | --- |
| `cohorts-real-data.spec.ts` | national cohort counts over the whole country (2.755 / 2.391 / 368 / 54 of 5.571) |
| `capture-cohorts-real-data.spec.ts` | screenshots of the national cohort pages |
| `comparar-real-data.spec.ts` | the /comparar/ rows assert the six largest states of the country (sp mg rj ba pr rs) |
| `real-data-brasil.spec.ts` | national totals of the whole country, checked against the manifest |
| `real-data-cidades-fora-da-curva.spec.ts` | national outlier ranking ('25 de 3.588') and an mg route |
| `real-data-estado.spec.ts` | visits sp AND an mg page; mg has 853 cities, over half the sample's whole budget |
| `real-data-ficaram-em-casa.spec.ts` | 27 state tiles and national stay-home percentages |
| `real-data-launch-gate.spec.ts` | national figures, region shares, all 27 state tiles |
| `real-data-map.spec.ts` | the 27 home-map links |
| `real-data-mapa-desktop.spec.ts` | 27 state shapes of the desktop map |
| `real-data-mapa-toque.spec.ts` | 27 touch shapes |
| `real-data-mapa-uf.spec.ts` | exact municipality counts of rs, mg, mt, rr — states out of the sample |
| `real-data-mapa.spec.ts` | 27 state tiles and national margin figures |
| `real-data-nerds.spec.ts` | 33 level pages, national manifest totals, the 853-row mg state table |
| `real-data-preview.spec.ts` | spot-checks city heads of states out of the sample (al, pa, pb, ce, zz) |
| `real-data-smoke.spec.ts` | asserts the full build serves more than 23,000 routes |
| `real-data-widget.spec.ts` | longest sentences over all 5,760 cities (pi, mg, pb, zz) |
| `real-data.spec.ts` | national home search (Belém of three states, the 20-result cut, 27 tiles) |
| `reports-real-data.spec.ts` | national counts and extremes over every state; the sample reaches its disputas test only through scripts/sample-backtest.sh |
| `tres-ciclos-real-data.spec.ts` | asserts the national six-largest ordering (mg rj ba pr rs), which a subset inside the page bound cannot reproduce; backtested by scripts/sample-backtest.sh |

## The 1.13.0 backtest

`web/scripts/sample-backtest.sh` re-runs the failures that escaped 1.13.0 against the sample in throwaway git
worktrees (parent of the fixing commit must be RED, the fix GREEN): the disputas data-race id of 4bd5da4, the
three-cycles 2018 candidate name of 9a2e801 and the donation-footer regex of 71f4e2e. `c29dd4d` is deliberately
not a case: it changed a fixture-project spec that the sample cannot see. Known limitation: the 9a2e801 case is
RED on both sides — the named test asserts the national six-largest ordering before the candidate name, which no
subset inside the page bound reproduces; its parent-side RED still shows the sample runs the tres-ciclos page.
