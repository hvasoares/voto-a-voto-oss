# Issue 84: one identity for the candidates (names + colours) on every screen

## What was built
- `src/shared/candidates.ts`: THE identity table, per runoff cycle (2018, 2022, 2026): TSE ballot name (`urna`), shown name (`name`), short form (`short`), side (`a` = lower ballot number, `b`) and colour (`lula` red `#b02b27`,
  `bolsonaro` blue `#0c54a0`). Pure static data (about 0.5 KB gzip), no imports; `sideTone(ano, numero, other, fallback)` says which colour a candidate wears.
- `src/shared/candidate-name.ts`: `candidateName(urna, 'full' | 'short')`, the only function that spells a candidate (table first, `displayName` for anyone else). Kept apart from the table so a page that only needs
  colours does not load `displayName` (the three-cycle page measured +1.4 KB gzip before the split).
- Decisions, written down once (they live in the table's header comment too):
  - Shown names have the accents people write: 2018 "Fernando Haddad" / "Jair Bolsonaro"; 2022 "Lula" / "Jair Bolsonaro"; 2026 "Lula" / "Flávio Bolsonaro". The TSE form ("FLAVIO BOLSONARO") stays the data key.
  - Short forms (map, narrow bars, table heads) are table data: "Haddad" / "Bolsonaro"; "Lula" / "Bolsonaro"; "Lula" / "Flávio". A short form is the surname or first name the person is called by, never "the first word".
    This is what ends "Fernando 34% beside Jair Bolsonaro 66%" (finding A3): a narrow 2018 bar now says "Haddad 34%".
  - The colour belongs to the pair of the cycle: side `a` red, side `b` blue, in every cycle (2018: Haddad red, Bolsonaro blue). Colour is never the only cue: names and numbers stay printed everywhere.
  - A round 1 runner-up beside a runoff candidate wears no pair colour (neutral `outros` taupe), so the red/blue never lands on someone who is not in the pair. Example data (neither in the table): position decides.
- Tokens (`shared/tokens.ts`): `cand-a` = the pair's red, `cand-b` = the pair's blue (values changed, no CSS rule added), and the map ramp's strongest steps `div-pos-3` / `div-neg-3` are the pair's own colours.
  Text on side b is paper (7.9:1 on the blue) instead of ink; side a is paper on red (6.4:1; it was 14:1 on the old black: still above AA 4.5).
- The City card model (`buildCityResult`) names through the table and carries `tone` and `short` per leader segment; bars, legend, share picture, link preview, three-cycle bars, Meu Brasil (page and picture) read them.
  `sideName` (the #82 seam) is gone: the label that reaches `turnoutBar` is already the table's spelling.
- Words that described the old colours were rewritten: three-cycle page legend ("em vermelho; o outro, em azul"), Meu Brasil legend (`mb.legend`), the state three-cycle legend (now names each colour's candidate per cycle:
  "Vermelho = Haddad (2018) e Lula (2022 e 2026). Azul = Bolsonaro (2018 e 2022) e Flávio (2026)"), the compare note of 2018 ("Fernando Haddad (13) e Jair Bolsonaro (17)"), and the recap no longer calls Haddad "PT".

## Screen by screen: what each read before, and now
| Screen / artefact | Name before | Colour before | Name and colour now |
|---|---|---|---|
| City card bars + legend (`buildCityResult`, `turnoutBar`, `toLegendRows`) | `displayName(nomeUrna)`: "Flavio Bolsonaro" | `cand-a` black / `cand-b` taupe, by position (the city's leader first) | table name "Flávio Bolsonaro"; red/blue by candidate (follows the candidate when the other leads the city) |
| Three-cycle city page (`orderedSides`, `sideText`) | label, "Candidato A" -> "A", narrow = first word ("Fernando") | black / taupe by ballot position | table name, narrow = table short ("Haddad"); red/blue by candidate |
| City replay (`city-replay.ts`) | label minus "Candidato " | black / taupe | table short; red/blue |
| Share picture, link preview image/alt (`share-card.ts`, via `CityResult`) | result label | `cand-a`/`cand-b` by key | table name; fill by `tone`; text on blue is paper. Names are NOT yet fitted (#85) |
| Meu Brasil page + picture | none printed | black / taupe | red / blue (legend words rewritten) |
| State and city map (`state-map-data`, `city-map-data`) | `displayName(...).split(' ')[0]` ("Flavio") | ramp ends `#9b1f1d` / `#0052ab` | table short "Flávio"; full "Flávio Bolsonaro"; ramp ends = the pair's red/blue |
| /brasil/ (`brasil.ts`, page) | `shortLabels` (first word, else last word) | `--c-lula` / `--c-bolsonaro` by position | table full/short; colour from `sideTone` (same hexes) |
| /comparar/ and /tres-ciclos/[uf]/ (`compare.ts`) | `FRAME_SHORT`: Haddad shown as "Lula", "Flavio" | `lula` / `bolsonaro` by position | table short: "Haddad", "Bolsonaro", "Lula", "Flávio"; same colours; note and legend from the table |
| State recap (`recap.ts`) | 2018 left called "PT" | red / blue | table short ("Haddad"); the `pt2018` switch is gone |
| Reports (hub, 4 report pages, outlier pages, fact page names) | `displayName(pair.nome...)` | n/a | `candidateName(...)` |
| Cara a cara (`duel-content.ts`) | `displayName` | n/a (no candidate colours) | `candidateName` |
| Dados para nerds (Escada bars, detail heads) | `displayName(nome)` | `.nerds-cand-a/b` = `--c-lula/--c-bolsonaro` | `candidateName`; colours unchanged (already the pair). The stay-home map names no candidate |
| Cohorts ("Como cada grupo votou") | `DISPLAY` literals ("Flavio") | `segmentColor`: lula/bolsonaro, else `cand-a/b` neutral | person/group words from the table ("Flávio"); the group word "PT" (the camp of 2018) stays; fixture pair now red/blue |
| Sobre os dados copy | literal "Flavio Bolsonaro", "Lula" | n/a | read from the table |

## Tests
- `src/shared/candidates.test.ts` (33 tests): the table's shape and spellings; the same two candidates fed to the card (bars, legend, swapped leader), the three-cycle sides and bars, both maps, /brasil/, compare, the share
  picture, for each of 2018, 2022 and 2026, must return the table's words and colours; the map ramp's ends are the pair; and a guard that no source file holds a string literal spelling a runoff candidate nor the pair's hex
  outside the table/tokens (mutation-checked).
- `e2e/candidate-identity.spec.ts` (3 tests, 10x repeat clean on phone): computed colours of card bars, legend swatches, three-cycle bars and /brasil/ are the same red and blue.
- Existing unit tests and e2e specs updated for the new spellings ("Flávio", "Haddad", "Candidato A" in the three-cycle bar). 1573 unit tests, 730 e2e (`make e2e`) pass.

## Measurements (fixture build, phone 390x844, `scripts/measure.ts`, gzip; before -> after)
- Shared CSS 16357 -> 16359 B (budget 16384: 25 B left). City card html 6539 -> 6515 B (budget 6554).
- JS: home 3765 unchanged; /brasil/, /comparar/2018/, /tres-ciclos/rj/, /mapa/, /rj/, /relatorios/*, /sobre-os-dados/, /dados-para-nerds/ unchanged. Pages that run `buildCityResult` in the browser now ship the table (+0.65 KB):
  city card 6263 -> 6938, city three-cycle 5589 -> 6088, Meu Brasil 128562 -> 129338, Cara a cara 129672 -> 130546, Compartilhar 104911 -> 106464 (lazy tool bundles).
- `check:perf` green, no budget moved.

## For the next tickets
- #85 (truncation on the poster): the share picture reads names from `r.voted[i].label` (the table's spelling, already in `CityResult`) in `segmentLabel` / `bar` of `src/lib/share-card.ts`; the fit logic there (`fit`, `textWidth`,
  "Name 52%" -> shortened name -> "52%") still ellipsizes: use `Segment.short` (the table's short form, added to `CityResult` segments by #84) as the middle step instead of an ellipsis. The recap picture
  (`src/lib/recap-card.ts`, `label`) drops to the bare percent when "Haddad 32,0%" does not fit: same fix.
- CSS bytes: `.bar__seg--b` went from ink to paper text (+6 raw bytes, +2 gzip); there are 25 B of room. A typography ticket that touches `screens.css` must remove bytes first. Scope new rules to a route stylesheet.
- Finding, not fixed: the City card orders its two candidate segments by votes in the city (`buildCityResult` ranks by votes; the leader is segment a), while the three-cycle page orders by ballot number. #82 documented the card
  as "ballot order"; it is not. With candidate colours the card is still unambiguous (the colour follows the candidate), but the standing rule "ballot-number order, never by result" is not met by the card.
  Changing it touches `voted[0]` readers (link preview description names the leader): needs a decision.

## Sketch (file "Election SPA v3" / "Election SPA v3 desktop")
Candidate fills recoloured (#2a2926 -> #b02b27, #8b8274 -> #0c54a0, 98 shapes) in: card family "2 Cartão da cidade" (7 frames) 4935B6A0.., 010178A4.., 60C673A1.., 785740D3.., 35EC323A.., 01AA7E3E.., AACADE1A..; 2b 7BCB1D41..;
3b C2A39DC9..; 9b Replay 4BBC9934..; 16 Meu Brasil 42EA9BC9..; desktop: 2 Cartão (ACADD6EA.., DB032624..), 3 Compartilhar 82CD0B2F.., 9 Três ciclos 8EC18E20.., 16 Meu Brasil 661591D5... "Flavio" -> "Flávio" in
66 text layers of the v3, v3 desktop and story-map pages; card legend rows read "Lula" / "Flávio Bolsonaro"; the desktop three-cycle frame names the candidates per cycle ("Fernando Haddad 55%" ...) and its legend note and the
state three-cycle colour notes say red/blue. Screenshot-verified: 010178A4 (card), 8EC18E20 (three cycles desktop), 42EA9BC9 (Meu Brasil), C2A39DC9 (3b). The /brasil/ frames already carried the pair (only the accent changed).
