# Issue 101: Comparar, one door to the existing comparisons

## What changed
- `src/pages/index.astro`: new entry `li[data-task="comparar"]#comparar` right after `compartilhar` (nested 44px+ rows like `entender`; strong `#comparar-titulo` "Comparar", sub-line "O que você quer comparar?"). The old `meu-brasil` task row and its `EXPLORE` row are gone.
- `src/lib/explore.ts`: new `COMPARAR` list (the chooser's options).
- `src/lib/destinations.ts`: the closed list now has ONE shape, an address template: `{ to: '{c}/tres-ciclos/', goes: '...' }`, where `{c}` is `<uf>/<slug>`. A page of the city and a route that takes the city (`cara-a-cara/?nivel=cidade&a={c}`) are the same kind of entry, so no `kind` field is needed. `cityTarget(uf, slug, destination?)` builds the target; `CitySearch.tsx` uses it and prints the note from `goes` ("Ao escolher a cidade, você vai direto para <goes>."). Still read with `Object.hasOwn`; unknown values ignored.
- `src/scripts/home-place.ts`: when a CITY is remembered, the needs-a-city options (`data-place-to` template) point straight at it; forgetting restores the search links. No storage read beyond the one the script already did.

## Option table
| Label | Sub-line | Destination | Needs a place |
|---|---|---|---|
| Minha cidade em 2018, 2022 e 2026 | Escolha a cidade e veja os três ciclos | `/?para=tres-ciclos#busca` -> `/<uf>/<slug>/tres-ciclos/` | yes |
| Duas cidades lado a lado | Escolha a primeira cidade; a outra vem depois | `/?para=cara-a-cara#busca` -> `/cara-a-cara/?nivel=cidade&a=<uf>/<slug>` | yes |
| Dois estados ou duas regiões | Lado a lado, no Cara a cara | `/cara-a-cara/?nivel=estado` (the level switch offers regions) | no |
| Meus lugares ao longo do tempo | Até três lugares, em três ciclos | `/meu-brasil/` | no |
| O mesmo estado nos três ciclos | 2018, 2022 e 2026 lado a lado | `/tres-ciclos/<first state>/` | no |

Correction against the story map: "minha cidade com 2022 e 2018" does NOT go to `/comparar/<ciclo>/` (that page is by state, not by city); it goes to the city's own three-cycle page. `/comparar/2022|2018/` stays reachable from the City card ("Comparar com 2022 e 2018"), as before. "Três ciclos por estado" also remains under "Entender".

## Bytes (fixture, gzip, before -> after)
- `/` 390x844: JS 3765 -> 3845 B (budget 4.2 KB; +80 B, all in `home-place`), CSS 15183 -> 15183, HTML 8724 -> 8948, data 0.
- `/` 1440x900: JS 4224 -> ~4304, HTML 15762 -> 15986.
- Island (search) grows a few bytes on interaction (destination table). No budget raised; `check:perf` green.

## Tests
`e2e/home-comparar.spec.ts` (chooser order and labels, every option followed, needs-a-city by click, Enter, reload, island held back, near-miss destinations ignored, remembered city, no-JS, keyboard, 44px, no scroll 390/768/1440, axe); `home-tasks`, `home`, `meu-brasil` updated; `destinations.test.ts` extended. 10x clean.

## Sketch
"1c Home (Comparar, celular)" BF9B1C04-054E-48EB-A984-395D064FC0E1 ("Election SPA v3"), "1c Home (Comparar, desktop)" 5A7CA37A-6673-4F6E-B956-F19789006E5F ("Election SPA v3 desktop"); both screenshot-verified. Captures `ux-review/2026-10-27/101-{antes,depois}-home-*.png` (untracked).

## For #102 and #103
Home task block order: `ver-cidade`, `compartilhar`, `comparar`, `conferir`, `entender` (no `meu-brasil` any more). #102 inserts `<li data-task="usar-os-dados">` after `entender`. Anchors: `#busca`, `#comparar`, `#entender` (strong id), `#tarefas`. `home-tasks.spec.ts` pins the entry list and the link count (12 now).
