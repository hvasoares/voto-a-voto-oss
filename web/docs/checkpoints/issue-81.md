# Issue 81: Dados para nerds, candidate measures on the same panels

## Sketch frame created (first checkpoint)
"N1b Dados para nerds: Brasil, votos por candidato", id `F7CE9BED-4A9E-4B63-9358-09C7248A15C2` on the page "Election SPA v3 desktop" (1440x1500 at x 6160, y 7400): the measure picker with its two groups (Participação | Votos por candidato),
the Escada by candidate (red/blue bars of "Brasil e regiões", names and values printed, cycles as rows), the map shaded by one candidate with its five-step legend, the Tabela with its "Participação | Candidatos" toggle and the candidate
columns, and the footer note. Screenshot-verified. Its numbers are illustrative (like the other frames). The built page matches it (Escada checked at 1440x900).

## What was built (no new panel component)
- The candidatos family is a second group of the existing pickers: `measure.candidatos` on the records of Escada, Mapa and Distribuição (the options are read from the record and the shards: `cand-<ballot number>` per number found, ascending).
  `lib/nerds/rates.ts` makes `cand-N` a rate like the others (share of votos válidos), so the map, the histogram and Par reuse their code.
- Escada: "Todos os candidatos" (+ turno chips): per cycle, exactly the candidates listed for that turno (two in a 2º turno, all of them in a 1º turno), in BALLOT-NUMBER order, bars from 0% with name and share printed, votes in the Ficha; the 2º turno pair takes the
  first/second colours of "Brasil e regiões" (`--c-lula`, `--c-bolsonaro`), a 1º turno is neutral; every bar is named and valued (colour is never the only cue). Without scripts the Ficha tables by candidate are in the page.
- Map: shaded by one candidate's share (chips "Nº 91", "Nº 92" ...); Distribuição: the same for a candidate's share; Par: a table of candidates (ballot order) with the place's and Brasil's share per turno, no difference.
- Tabela: a "Participação | Candidatos" toggle (enhancer) switches the column set (one column per candidate and turno, ballot-number order, shares of votos válidos, total last); both tables are in the HTML without scripts; the CSV follows the visible set.
- Invariantes: "Candidatos + brancos + nulos = votantes" is listed (checks.ts, #77) and runs on every row.
- Contract tests: printed shares and votes equal an independent sum of the CSV; candidates + brancos + nulos = votantes; no ranking, winner label or difference in any spec or export (`candidatos.test.ts`); the component set is asserted unchanged.

## Deviations
- The candidate measures are options of the existing records (the same panels, as the ticket says), not separate catalogue records; their footers are the panels' own, extended with the candidate calculation and "não ordena nem compara candidatos".
- Candidates are identified by ballot number (the key of the data): `Nº 13` in 2018 and 2022 is the same number, not claimed to be the same person; the picker prints the number, the chart prints the name of that cycle.
- A candidate absent from a turno reads "—" in the Tabela and is absent from the map/histogram of that turno (never zero).
