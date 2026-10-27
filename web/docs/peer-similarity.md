# Peer cities: the method (ticket #23)

The build publishes `v<fingerprint>/peers.json`: for every city, the cities most like it. The city card links the twin (#31); a later
screen can compare a city with its peers. The code is `src/lib/peers.ts` (pure), called by the
shard builder (`integrations/shards.ts`); `npm run check:peers` prints the size and a spot check over the real data.

## What "peer" means

The five cities closest to a city in a space of **size band, turnout, margin and history**, not neighbours on the map and
not the same candidates: two cities are peers when their electorates are of a similar size and behaved alike in the
three presidential cycles. It says nothing about why they behaved so.

## Features (round 1 only)

Every cycle has a round 1, so it is the comparable round.

| Feature | Definition |
|---|---|
| `size` | band of the registered electorate (`aptos`) in the latest cycle the city has: <5k, <10k, <20k, <50k, <100k, <200k, <500k, <1M, 1M or more (0 to 8) |
| `turnout{2018,2022,2026}` | `comparecimento / aptos` |
| `margin{2018,2022,2026}` | (votes of the first candidate - votes of the second) / valid votes. Which candidates they are does not matter, and the file publishes no margin |

"History" is the three cycles' turnout and margin taken together, not a separate number.

## Scaling and distance

Each feature is z-scored over the cities that have it (a feature with no spread counts as 0). The distance between two
cities is the weighted mean of the squared z-differences over the features **both** have; `size` has weight 3, the others 1.
A pair is comparable only with at least 3 features in common (the size band plus one cycle's turnout and margin).

## Cities missing a cycle

A city has no features for a cycle it has no round-1 data in ("sem dados", never zero). It is compared on the cycles it has:
Boa Esperança do Norte (MT) exists only in 2026 and is compared with every other city on size, turnout 2026 and margin 2026.
A city with no round-1 data at all (none today) is left out of the file. Two cities that share no cycle are not compared.

## Overseas posts

Excluded: they are neither subjects nor peers, and do not take part in the scaling (uf `zz`).

## Result and ties

The K = 5 nearest cities, closest first, never the city itself. Equal distances (compared at 1e-9) are ordered by
`uf/slug` in code-point order, so the result does not depend on the order of the input rows or on the runtime's locale.
The same dataset gives the same bytes.

## The twin (ticket #31)

The card's "cidade gêmea" is the closest comparable city of **another state**: the same distance and the same tie-break, taken
over every city of the file whose state differs (not only over the five peers, which are often all of one state). A city that
no other state has a comparable city for (and every overseas post) has no twin and the card shows nothing. The reason line
names the features the match uses: "porte, participação, margem e histórico".

## The file

```
{ "k": 5, "cities": ["ac/acrelandia", ...], "peers": [[12, 40, 7, 3, 99], ...], "twins": [57, -1, ...] }
```

`cities` is every city that has features in code-point order of `uf/slug`; `peers[i]` are the indices into `cities` of the
peers of `cities[i]`, closest first. `twins[i]` is the index of the twin of `cities[i]`, or -1. Index encoding keeps each city name once (`peersOf` and `twinOf(file, uf, slug)` read it back).

## Limits

- The last size band is open (1M or more), so São Paulo (9.1M) is matched with cities of 0.5M to 2M, not with another 9M city.
- Peers are similar in these numbers only; the method knows nothing about region, economy or people.
- Margin and turnout are of round 1; a city's second round is not part of the match.
