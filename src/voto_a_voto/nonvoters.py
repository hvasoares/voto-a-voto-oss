"""Do the people who did not vote for anyone outnumber the winning margin? (ticket #24, an analysis with no screen).

For each cycle, round and state: in what share of the cities, and of the registered voters, is the number of people who
did not vote for any candidate larger than the winning margin in votes? Pure functions over the committed dataset
(``data/``); ``voto-data nonvoters`` prints the tables and ``docs/nonvoters-vs-margin.md`` states the method and the limits.

- non-voters of a city and round = ``aptos - validos``: abstention + blank + null (+ votes annulled in a separate tally),
  the same definition the site's city card uses; it also counts the few registered voters of sections the TSE reports as
  not installed (470, 657 and 423 people in the whole country in 2018, 2022 and 2026).
- winning margin = valid votes of the first candidate minus those of the second, in that city and round (the second is 0
  when only one candidate has votes).
- "larger" is strictly larger: a city where the two numbers are equal does not count.
- cities with no electorate or no valid votes at all have no winner and no margin: they are left out of the base and counted
  apart. Overseas posts (``zz``) are never counted.
"""
from collections import defaultdict
from dataclasses import dataclass

from voto_a_voto.cities import OVERSEAS
from voto_a_voto.dataset import Dataset

BRAZIL = "br"


@dataclass(frozen=True)
class Group:
    ano: int
    turno: int
    uf: str  # lowercase UF, or "br" for the country without the overseas posts
    cities: int  # cities in the base (with an electorate and valid votes)
    exceeding: int  # of those, cities where non-voters > margin
    aptos: int  # registered voters of the cities in the base
    aptos_exceeding: int  # registered voters of the cities where non-voters > margin
    left_out: int  # cities of the group with no electorate or no valid votes

    @property
    def cities_share(self) -> float:
        return self.exceeding / self.cities if self.cities else 0.0

    @property
    def voters_share(self) -> float:
        return self.aptos_exceeding / self.aptos if self.aptos else 0.0


def _margins(dataset: Dataset) -> dict[tuple, int]:
    """First minus second valid votes of every city, cycle and round (a missing second counts as 0)."""
    tallies: dict[tuple, list[int]] = defaultdict(list)
    for vote in dataset.votes:
        tallies[(vote.ano, vote.turno, vote.uf, vote.cd_municipio)].append(vote.votos)
    margins = {}
    for key, votes in tallies.items():
        top = sorted(votes, reverse=True)[:2] + [0, 0]
        margins[key] = top[0] - top[1]
    return margins


def measure(dataset: Dataset) -> list[Group]:
    margins = _margins(dataset)
    base: dict[tuple, list[int]] = defaultdict(lambda: [0, 0, 0, 0, 0])
    for row in dataset.turnout:
        if row.uf == OVERSEAS:
            continue
        for uf in (row.uf, BRAZIL):
            cell = base[(row.ano, row.turno, uf)]
            if row.aptos <= 0 or row.validos <= 0:
                cell[4] += 1
                continue
            exceeds = row.aptos - row.validos > margins[(row.ano, row.turno, row.uf, row.cd_municipio)]
            cell[0] += 1
            cell[1] += exceeds
            cell[2] += row.aptos
            cell[3] += row.aptos if exceeds else 0
    return [Group(ano, turno, uf, *cell) for (ano, turno, uf), cell in sorted(base.items(), key=lambda item: (item[0][0], item[0][1], item[0][2] == BRAZIL, item[0][2]))]


def _number(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def _percent(share: float) -> str:
    return f"{share * 100:.1f}".replace(".", ",") + "%"


def render(groups: list[Group]) -> str:
    """One markdown table per cycle and round: the states by UF, then the country."""
    lines = []
    for (ano, turno) in sorted({(g.ano, g.turno) for g in groups}):
        lines += [f"### {ano}, {turno}º turno", "", "| UF | Cidades | Com não-votantes > margem | % das cidades | Eleitorado | % do eleitorado |", "|---|---:|---:|---:|---:|---:|"]
        for g in (g for g in groups if (g.ano, g.turno) == (ano, turno)):
            name = "Brasil (sem exterior)" if g.uf == BRAZIL else g.uf.upper()
            lines.append(f"| {name} | {_number(g.cities)} | {_number(g.exceeding)} | {_percent(g.cities_share)} | {_number(g.aptos)} | {_percent(g.voters_share)} |")
        states = [g for g in groups if (g.ano, g.turno) == (ano, turno) and g.uf != BRAZIL]
        majority = sum(g.cities_share > 0.5 for g in states)
        left_out = next(g.left_out for g in groups if (g.ano, g.turno, g.uf) == (ano, turno, BRAZIL))
        lines += ["", f"Estados em que mais da metade das cidades tem não-votantes > margem: {majority} de {len(states)}.", f"Cidades fora da base (sem eleitorado ou sem votos válidos): {left_out}.", ""]
    return "\n".join(lines).rstrip() + "\n"
