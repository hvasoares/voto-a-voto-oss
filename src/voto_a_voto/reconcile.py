"""Consistency checks over the assembled tables. Pure functions: each returns a list of findings (empty = pass)."""
import csv
import hashlib
import json
from collections import defaultdict
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path

from voto_a_voto.cities import OVERSEAS, region_of
from voto_a_voto.dataset import Dataset

SUM_FIELDS = ("aptos", "comparecimento", "abstencoes", "brancos", "nulos", "anulados_apu_sep", "validos")


@dataclass(frozen=True)
class Finding:
    check: str
    message: str

    def __str__(self) -> str:
        return f"[{self.check}] {self.message}"


@dataclass(frozen=True)
class NationalTotals:
    """What the TSE itself publishes for a whole round, overseas included. ``None`` fields are not compared."""

    aptos: int | None = None
    comparecimento: int | None = None
    abstencoes: int | None = None
    validos: int | None = None
    brancos: int | None = None
    nulos: int | None = None
    anulados_apu_sep: int | None = None
    candidates: dict[int, int] = field(default_factory=dict)
    source: str = ""


def _label(row) -> str:
    return f"{row.uf}/{row.cd_municipio}"


def _accounted(row) -> int:
    return row.validos + row.brancos + row.nulos + row.anulados_apu_sep


def check_turnout_identity(dataset: Dataset) -> list[Finding]:
    """Per city and round: valid + blank + null + annulled-in-separate-tally votes add up to the turnout."""
    return [
        Finding("turnout_identity", f"{row.ano} turno {row.turno} {_label(row)}: validos {row.validos} + brancos {row.brancos} + nulos {row.nulos} + anulados_apu_sep {row.anulados_apu_sep} = {_accounted(row)}, comparecimento {row.comparecimento} (difference {row.comparecimento - _accounted(row)})")
        for row in dataset.turnout
        if _accounted(row) != row.comparecimento
    ]


def check_vote_sums(dataset: Dataset) -> list[Finding]:
    """Per city and round: the candidates' votes add up to the valid votes."""
    sums: dict[tuple, int] = defaultdict(int)
    for vote in dataset.votes:
        sums[(vote.ano, vote.turno, vote.uf, vote.cd_municipio)] += vote.votos
    return [
        Finding("vote_sums", f"{row.ano} turno {row.turno} {_label(row)}: candidate votes {sums[key]} != validos {row.validos}")
        for row in dataset.turnout
        if sums[(key := (row.ano, row.turno, row.uf, row.cd_municipio))] != row.validos
    ]


def check_cities(dataset: Dataset, brazilian_cities: dict[int, int]) -> list[Finding]:
    """Every round of a cycle has the same cities, the Brazilian count is the TSE's, and every city is in the index."""
    findings = []
    index = {(city.uf, city.cd_municipio): city for city in dataset.cities}
    rounds: dict[tuple[int, int], set[tuple[str, int]]] = defaultdict(set)
    for row in dataset.turnout:
        rounds[(row.ano, row.turno)].add((row.uf, row.cd_municipio))
        city = index.get((row.uf, row.cd_municipio))
        if city is None:
            findings.append(Finding("cities", f"{row.ano} turno {row.turno} {_label(row)} has turnout but is not in cities.csv"))
        elif str(row.ano) not in city.ciclos.split(";"):
            findings.append(Finding("cities", f"{row.ano} {_label(row)}: cities.csv lists ciclos {city.ciclos!r}"))
    for vote in dataset.votes:
        if (vote.uf, vote.cd_municipio) not in rounds[(vote.ano, vote.turno)]:
            findings.append(Finding("cities", f"{vote.ano} turno {vote.turno} {_label(vote)} has votes but no turnout row"))
    for ano in sorted({ano for ano, _ in rounds}):
        union = set().union(*(cities for (a, _), cities in rounds.items() if a == ano))
        for (a, turno), cities in sorted(rounds.items()):
            if a == ano:
                findings += [Finding("cities", f"{ano} turno {turno}: missing {uf}/{cd}") for uf, cd in sorted(union - cities)]
        if ano in brazilian_cities:
            count = sum(1 for uf, _ in union if uf != OVERSEAS)
            if count != brazilian_cities[ano]:
                findings.append(Finding("cities", f"{ano}: {count} Brazilian cities, the TSE has {brazilian_cities[ano]}"))
    return sorted(dict.fromkeys(findings), key=str)


def check_city_codes(dataset: Dataset) -> list[Finding]:
    """A TSE municipality code belongs to one UF in every cycle and table."""
    owners: dict[int, set[str]] = defaultdict(set)
    for row in (*dataset.cities, *dataset.turnout, *dataset.votes):
        owners[row.cd_municipio].add(row.uf)
    return [Finding("city_codes", f"cd_municipio {cd} appears under {', '.join(sorted(ufs))}") for cd, ufs in sorted(owners.items()) if len(ufs) > 1]


def aggregate(dataset: Dataset, by: str, ano: int, turno: int) -> dict[str, dict[str, int]]:
    """Turnout sums per ``uf`` or ``regiao`` for Brazilian cities. Overseas posts are left out; use ``national`` for the Brazil total."""
    region = {(city.uf, city.cd_municipio): city.regiao for city in dataset.cities}
    totals: dict[str, dict[str, int]] = defaultdict(lambda: dict.fromkeys(SUM_FIELDS, 0))
    for row in dataset.turnout:
        if (row.ano, row.turno) == (ano, turno) and row.uf != OVERSEAS:
            key = row.uf if by == "uf" else region[(row.uf, row.cd_municipio)]
            for name in SUM_FIELDS:
                totals[key][name] += getattr(row, name)
    return dict(totals)


def _sum(rows) -> dict[str, int]:
    total = dict.fromkeys(SUM_FIELDS, 0)
    for row in rows:
        for name in SUM_FIELDS:
            total[name] += getattr(row, name)
    return total


def national(dataset: Dataset, ano: int, turno: int) -> dict[str, int]:
    """Turnout sums for the whole country, overseas included."""
    return _sum(row for row in dataset.turnout if (row.ano, row.turno) == (ano, turno))


def check_aggregates(dataset: Dataset) -> list[Finding]:
    """Regions match the UF map, and Brazilian regions + overseas = Brazil, for every cycle and round."""
    findings = [
        Finding("aggregates", f"{city.uf}/{city.cd_municipio} is in region {city.regiao!r}, expected {region_of(city.uf)!r}")
        for city in dataset.cities
        if city.regiao != region_of(city.uf)
    ]
    if findings:
        return findings
    for ano, turno in sorted({(row.ano, row.turno) for row in dataset.turnout}):
        brazil = national(dataset, ano, turno)
        exterior = _sum(row for row in dataset.turnout if (row.ano, row.turno, row.uf) == (ano, turno, OVERSEAS))
        for by in ("regiao", "uf"):
            parts = aggregate(dataset, by, ano, turno).values()
            for name in SUM_FIELDS:
                if sum(part[name] for part in parts) + exterior[name] != brazil[name]:
                    findings.append(Finding("aggregates", f"{ano} turno {turno}: {by} sums + exterior != Brazil for {name}"))
    return findings


def check_national_totals(dataset: Dataset, reference: dict[tuple[int, int], NationalTotals]) -> list[Finding]:
    """Totals including overseas equal the numbers published by the TSE. The reference is never computed from our own tables."""
    findings = []
    for (ano, turno), expected in sorted(reference.items()):
        if not any((row.ano, row.turno) == (ano, turno) for row in dataset.turnout):
            findings.append(Finding("national_totals", f"{ano} turno {turno}: no data to compare with {expected.source}"))
            continue
        actual = national(dataset, ano, turno)
        for name in SUM_FIELDS:
            wanted = getattr(expected, name)
            if wanted is not None and actual[name] != wanted:
                findings.append(Finding("national_totals", f"{ano} turno {turno} {name}: data {actual[name]}, {expected.source} {wanted}"))
        votes: dict[int, int] = defaultdict(int)
        for vote in dataset.votes:
            if (vote.ano, vote.turno) == (ano, turno):
                votes[vote.candidato_numero] += vote.votos
        for number, wanted in sorted(expected.candidates.items()):
            if votes[number] != wanted:
                findings.append(Finding("national_totals", f"{ano} turno {turno} candidate {number}: data {votes[number]}, {expected.source} {wanted}"))
    return findings


# -- data/legislative/: Senador and Deputado Federal per municipality (see legislative.py) ----------------------------------------

EXAMPLES = 3


def _csv_rows(path: Path) -> Iterator[dict]:
    with open(path, encoding="utf-8", newline="") as handle:
        yield from csv.DictReader(handle)


def _file_facts(path: Path) -> tuple[str, int, int]:
    """SHA-256, bytes and data rows of a file, read in chunks."""
    digest, size, newlines = hashlib.sha256(), 0, 0
    with open(path, "rb") as handle:
        while chunk := handle.read(1 << 20):
            digest.update(chunk)
            size += len(chunk)
            newlines += chunk.count(b"\n")
    return digest.hexdigest(), size, max(newlines - 1, 0)


def check_legislative(directory, known_cities: set[tuple[str, int]]) -> list[Finding]:
    """Validates ``data/legislative/`` with no network. Without its manifest nothing was built there and nothing is checked.

    Per file: it exists and matches the manifest (sha256, bytes, rows). Per year and cargo, on the files themselves:
    no negative count; every ``(uf, cd_municipio)`` is in ``cities.csv``; every voted candidate is in the candidates file;
    per municipality, the candidates' valid nominal votes equal the detail file's ``nominais_validos``, ``nominais_validos +
    legenda_validos = validos``, and ``validos + brancos + nulos + anulados + anulados_subjud + anulados_apu_sep = votos``."""
    directory = Path(directory)
    manifest_path = directory / "manifest.json"
    if not manifest_path.exists():
        return []
    findings = []
    for year, entry in sorted(json.loads(manifest_path.read_text(encoding="utf-8"))["years"].items()):
        intact = True
        for name, recorded in sorted(entry["outputs"].items()):
            path = directory / name
            if not path.exists():
                findings.append(Finding("legislative_manifest", f"{name} is missing"))
                intact = False
                continue
            sha, size, rows = _file_facts(path)
            for label, actual, wanted in (("sha256", sha, recorded["sha256"]), ("bytes", size, recorded["bytes"]), ("rows", rows, recorded["rows"])):
                if actual != wanted:
                    findings.append(Finding("legislative_manifest", f"{name}: {label} {actual}, manifest.json says {wanted}"))
                    intact = False
        if intact:
            for name in sorted(entry["outputs"]):
                if name.endswith(f"-{year}-votos.csv"):
                    findings += _legislative_identities(directory, int(year), name.removesuffix(f"-{year}-votos.csv"), known_cities)
    return findings


def _legislative_identities(directory: Path, year: int, cargo: str, known_cities: set[tuple[str, int]]) -> list[Finding]:
    label = f"{cargo} {year}"
    problems: dict[str, list[str]] = defaultdict(list)
    counted: dict[str, int] = defaultdict(int)

    def flag(rule: str, detail: str) -> None:
        counted[rule] += 1
        if len(problems[rule]) < EXAMPLES:
            problems[rule].append(detail)

    candidates = {(row["uf"], int(row["candidato_numero"])) for row in _csv_rows(directory / f"{cargo}-{year}-candidatos.csv")}
    summed: dict[tuple[str, int], int] = defaultdict(int)
    for row in _csv_rows(directory / f"{cargo}-{year}-votos.csv"):
        key = (row["uf"], int(row["cd_municipio"]))
        nominais, validos = int(row["votos_nominais"]), int(row["votos_nominais_validos"])
        if nominais < 0 or validos < 0 or validos > nominais:
            flag("negative_or_inconsistent_votes", f"{key[0]}/{key[1]} candidate {row['candidato_numero']}: nominais {nominais}, validos {validos}")
        if key not in known_cities:
            flag("unknown_city", f"{key[0]}/{key[1]} (votos)")
        if (row["uf"], int(row["candidato_numero"])) not in candidates:
            flag("unknown_candidate", f"{key[0]} candidate {row['candidato_numero']}")
        summed[key] += validos
    seen = set()
    for row in _csv_rows(directory / f"{cargo}-{year}-totais.csv"):
        key = (row["uf"], int(row["cd_municipio"]))
        seen.add(key)
        values = {name: int(value) for name, value in row.items() if name not in ("uf", "cd_municipio")}
        where = f"{key[0]}/{key[1]}"
        if min(values.values()) < 0:
            flag("negative_totals", where)
        if key not in known_cities:
            flag("unknown_city", f"{where} (totais)")
        if summed.get(key, 0) != values["nominais_validos"]:
            flag("candidates_vs_nominais_validos", f"{where}: candidates {summed.get(key, 0)}, detail {values['nominais_validos']}")
        if values["nominais_validos"] + values["legenda_validos"] != values["validos"]:
            flag("nominais_plus_legenda", f"{where}: {values['nominais_validos']} + {values['legenda_validos']} != {values['validos']}")
        accounted = values["validos"] + values["brancos"] + values["nulos"] + values["anulados"] + values["anulados_subjud"] + values["anulados_apu_sep"]
        if accounted != values["votos"]:
            flag("votos_accounted", f"{where}: validos+brancos+nulos+anulados+subjud+apu_sep {accounted}, votos {values['votos']}")
    for key in sorted(set(summed) - seen):
        flag("votes_without_totals", f"{key[0]}/{key[1]}")
    return [
        Finding("legislative", f"{label} {rule}: {counted[rule]} case(s), e.g. " + "; ".join(examples))
        for rule, examples in problems.items()
    ]
