# Issue 99: task-first Home, the task block replaces "Para explorar"

## What changed
- `src/pages/index.astro`: the list "Para explorar" is now `section[data-tasks]` ("O que você quer fazer?") with these entries, in order:
  `ver-cidade` (link to `#busca`, the search box), `compartilhar` (`/?para=compartilhar#busca`), `conferir`
  (`/sobre-os-dados/#confira-voce-mesmo`), `entender` (title plus nested Brasil e regiões, Mapa por estado, Relatórios, Três ciclos por estado),
  `meu-brasil` (the old row, kept until #101).
- The finality line "Final, não ao vivo." is a plain `p[data-finality]` right under "Compare com 2018 e 2022." (calm secondary tone, no link,
  visible at 390x844 without scrolling). It links to nothing on purpose: a calm line, not a call to action.
- `src/components/TaskRow.astro`: one row (title, sub-line, chevron, 44px+). `src/lib/explore.ts` keeps the destinations (`task` says where each shows).
- `src/lib/destinations.ts`: the CLOSED list (`DESTINATIONS = { compartilhar: 'compartilhar/' }`), `readDestination(search)` and `destinationLink()`.
  Home builds its link from it and `CitySearch` reads it. Unit test `destinations.test.ts`.
- `src/components/CitySearch.tsx` (main search only, not the top-bar one): reads the destination in the mount effect, before the cities are
  requested, and appends the path to every result href. Root carries `data-ready="search"` (cities loaded, results can be drawn) and
  `data-destination`. A note "Ao escolher a cidade, você vai direto para Compartilhar." shows in the island (`data-destination-note`).

## Decisions
- How the destination travels: a query parameter on Home (`/?para=compartilhar#busca`), not a click-set data attribute. Reasons: it survives
  reload, Back and bookmark, a visitor can send the link, no script runs on the first paint (a click handler or a Home script would grow the
  Home JS; the island already ships on first interaction). The parameter is NOT dropped after use: dropping it would make a reload change
  behaviour, and "Ver minha cidade" (`#busca`, no parameter) is the way back to the plain search. Sticky state is therefore visible in the address.
- Closed list: the value is only looked up with `Object.hasOwn` in `DESTINATIONS`; the value is never an address; unknown values (including
  `constructor`, `__proto__`, URLs, other case) are ignored: the pick opens the City card as before.
- Without scripts: the entry is a plain link whose sub-line IS the instruction "Escolha a cidade e toque em Compartilhar"; it lands on Home at
  the search, where the noscript line sends the visitor to the state tiles (state, city, Compartilhar). The sub-line is the same with scripts.
- Remembered place: the "Sua cidade" shortcut does NOT take the destination (it would add JS to Home's first load). Left as is.
- Meu Brasil: stays as its own last row (`li[data-task="meu-brasil"]`) until #101 moves it into the Comparar chooser. Three ciclos por estado (an old
  "Para explorar" row) sits under "Entender".
- Analytics: the old rows emitted no events (no `explore`/`home_link` event in `events.ts`), so none were added; the docs table and
  `event-props.ts` are unchanged. The search keeps its payloads (result count, query length, no typed text).

## Hooks for #101, #102, #103
- Every entry is `section[data-tasks] > ul > li[data-task="<name>"]`, order = reading order. A new entry is `<li data-task="..."><TaskRow href title sub /></li>`
  (a nested group copies the `entender` `li`).
- #101: insert `<li data-task="comparar" id="comparar">` right after `compartilhar` (before `conferir`); `#comparar` is the reserved anchor. When the
  chooser ships, move Meu Brasil into it and delete the `meu-brasil` `li` (and the `meu-brasil` item of `EXPLORE`).
- #102: insert `<li data-task="usar-os-dados">` after `entender` and before `meu-brasil` (or after `conferir`; judgment order is Ver, Compartilhar,
  Comparar, Conferir, Entender, Usar). Destination `/sobre-os-dados/#usar-os-dados` once that section exists.
- #103 (top bar): `Conferir` link target is `/sobre-os-dados/#confira-voce-mesmo`; `Ver minha cidade` is `#busca` on Home. The Home test
  `home-tasks.spec.ts` pins the entry list (`titles` array) and the key count of 8 links: update it when an entry is added.
- A link to a screen that does not exist yet is not shown (nothing is rendered for Comparar and Usar os dados today).

## Measurements (scripts/measure.ts, fixture build, gzip)
| | before | after |
|---|---|---|
| `/` 390x844: JS / CSS / html / data | 3765 / 15175 / 8412 / 0 | 3765 / 15183 / 8724 / 0 |
| `/` 1440x900: JS / CSS / html | 4224 / 15175 / 15450 | 4224 / 15183 / 15762 |
| `/` after typing (island): JS / data | 108951 / 170 | 109134 / 170 |

No budget raised.

## Sketch
Phone "1 Home (task-first, phone)" BBC66507-00D5-437F-BD53-6B5951B6A8CD (page "Election SPA v3"); desktop "1 Home (task-first, desktop)"
8B5E5B73-DD7A-40AF-B501-B3383B0B2C6E (page "Election SPA v3 desktop"). Both screenshot-verified against the build.
Captures: `ux-review/2026-10-27/99-{antes,depois}-home-{390x844,1440x900}.png` (untracked).

## Tests
`e2e/home-tasks.spec.ts` (28), `home.spec.ts` and `desktop-home.spec.ts` updated; 10x clean together with consent, type-scale, tap-targets, notice-calm, a11y.
