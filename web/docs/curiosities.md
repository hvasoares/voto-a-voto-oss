# Curiosidades da cidade: the method (ticket #33)

The city card can show up to three facts that rank the city among similar cities. It is a comparison, never a finding: the
card says so ("É uma comparação com cidades do mesmo perfil, não um indício de irregularidade") and no fact says anything is wrong.
The code is `src/lib/curiosities.ts` (pure), called by the shard builder, which publishes `v<fingerprint>/curiosities.json`;
`npm run check:curiosities` prints the counts and a ten-city spot check. The wording is the catalog's `curio.*` keys.

## The group

The cities of the **same size band** (`sizeBand` of `peers.ts`: <5k, <10k, <20k, <50k, <100k, <200k, <500k, <1M, 1M or more
registered voters in the latest cycle with round-1 data) that have the **same measure over the same cycles**. The city is in its
own group, so a group of 48 has ranks 1 to 48 and "Grupo: 48 cidades" counts the city. Overseas posts are never in a group.

## The measures (round 1, the comparable round)

| Fact | Measure | Cycles | Word |
|---|---|---|---|
| `td` / `tu` | turnout (`comparecimento / aptos`) in the latest cycle minus the one before it | the two latest the city has, e.g. 2022 → 2026 | "queda" when it fell, "alta" when it rose; no fact when it did not change |
| `ml` / `mh` | votes of the first minus the second candidate, as a share of the valid votes | the latest cycle | "menor" / "maior diferença entre os dois candidatos no 1º turno" |
| `bl` / `bh` | blank, null and annulled votes as a share of the turnout, the three cycles added together | 2018, 2022 and 2026 (a city needs all three) | "menor" / "maior parcela de votos brancos e nulos" |

## Choosing the facts

- Rank = 1 + the cities of the group strictly ahead of the city on that side; equal cities share a rank. For `ml/mh` and `bl/bh`
  the city gets the side where its rank is smaller (ties: the "maior" side).
- A fact needs: a group of at least **20 cities** (`MIN_GROUP`; the tiny fixture dataset uses 2), a measure that is not equal for
  the whole group, a rank in the first quarter of the group and **no lower than the 25th** (`MAX_RANK`: "251ª de 1.272" is not a curiosity; the frame's worst fact is the 12th of 48).
- The three facts with the smallest rank / group size win; ties go turnout, margin, blank. A city with no fact, or in a
  group below the minimum, shows no card, no link and has no `/curiosidades/` page.

## Where it shows

- from 1024 px: the card under the figures of the city card (frame "2 Cartão da cidade (desktop, com as linhas V3)");
- on a phone: its own screen `/<uf>/<slug>/curiosidades/` (frame "21 Curiosidades da cidade"), reached by "Curiosidades da cidade ›"
  in the links under Compartilhar and left by "‹ Voltar ao cartão da cidade". Both are pre-rendered; no script, no request.

## The file

`{ "minGroup": 20, "facts": { "ac/rio-branco": [["tu", 7, 73, 2022, 2026], ["bl", 7, 73, 2018, 2022, 2026]], ... } }`: tuples
`[code, rank, group size, ...cycles]` for the cities that have any, in code-point order of `uf/slug`.

## Limits

- "Mesmo porte" is the electorate band only; it says nothing about region or economy.
- The blank and null share adds the cycles together, so a city is not penalised for a cycle in which it had no data: it needs all three.
- The capitals of the 1M-or-more band (fewer than 20 cities) have no card by design.
