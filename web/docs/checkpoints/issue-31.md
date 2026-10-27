# Issue #31 (Cidade gêmea on the city card): checkpoints

1. **The twin in the peer data.** `computePeers` also finds, for each city, its closest comparable city of another state
   (`twins`, an index or -1) in the same loop, with the same distance and tie-break; `peers.json` carries it and `twinOf(file,
   uf, slug)` reads it. The five peers are often all of the same state (the big cities of one state), so taking the first peer
   of another state would show no twin for many cities: the twin is searched over all comparable cities instead. Tests: always another
   state, nearest of the other states, none when the state holds every comparable city, overseas posts and unknown cities have none,
   independent of row order; the fixture shards (`shards.test.ts`).
2. **The line.** The `twin.*` keys of the catalog (label and reason, standard and plain), `viewTwin` (a link to the twin's card
   plus the reason, both registers, no empty link when there is no twin), the page reads `peers.json` and the search shard at build time.
   The reason line says "porte, participação, margem e histórico" because those are the features of the method (size band, round-1
   turnout and margin of three cycles); the ticket's wording had no "porte".
3. **Screenshot review**, `/rj/cidade-exemplo/?turno=1` at 390x844 (page captured in full, the line sits below the fold) and 1440x900.
   Frames: "2 Cartão da cidade, with the twin line" and the desktop frame "com as linhas V3".

## Screenshot review

Done by the author (no subagents in this run).

| # | Location | Frame shows | Render shows | Severity |
|---|---|---|---|---|
| 1 | twin link | "Cidade gêmea: Vila Modelo (UF2) ›", accent, sans ~15 px (phone); "Cidade gêmea: Vila Modelo · UF2 ›" 20 px (desktop) | "Cidade gêmea: Boa Esperança do Norte · MT ›" (the fixture's closest city of another state), same style; the phone shows the desktop's " · MT" separator, not the parentheses | accepted: the frame's city is a mock name; the separator is the one of the desktop frame |
| 2 | reason | "Perfil parecido de participação, margem e histórico." 11 px muted | "Perfil parecido de porte, participação, margem e histórico." | accepted: the acceptance criterion asks the reason to be accurate for the features used, and the size band is one of them |
| 3 | position | under the headline (phone), under the margin line with a hairline above (desktop) | same | none |
| 4 | status bar, home indicator | drawn | absent | accepted-platform |

Verdict: PASS (no blockers).
