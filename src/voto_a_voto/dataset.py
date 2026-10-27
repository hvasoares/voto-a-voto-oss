"""Assemble the cycles into the committed ``data/`` tables and write them deterministically.

Rules for every file: UTF-8, LF, fixed column order, rows sorted by key, no timestamps. Row types list their
fields in column order and sort by key, so the same input always produces the same bytes.
"""
import csv
import hashlib
import io
import json
import os
from collections.abc import Iterable, Mapping
from dataclasses import astuple, dataclass, field, fields
from pathlib import Path

from voto_a_voto.cities import City, DuplicateSlugError, region_of, slugify
from voto_a_voto.munzona import Candidate, CandidateConflictError, Turnout


@dataclass(frozen=True, order=True)
class CityRow:
    uf: str
    cd_municipio: int
    cd_ibge: str
    nome: str
    slug: str
    regiao: str
    ciclos: str  # cycles with data, e.g. "2018;2022;2026"


@dataclass(frozen=True, order=True)
class TurnoutRow:
    ano: int
    turno: int
    uf: str
    cd_municipio: int
    aptos: int
    comparecimento: int
    abstencoes: int
    brancos: int
    nulos: int
    anulados_apu_sep: int
    validos: int


@dataclass(frozen=True, order=True)
class VoteRow:
    ano: int
    turno: int
    uf: str
    cd_municipio: int
    candidato_numero: int
    votos: int


@dataclass(frozen=True, order=True)
class CandidateRow:
    ano: int
    turno: int
    candidato_numero: int
    nome_urna: str
    partido: str


@dataclass(frozen=True, order=True)
class CentroidRow:
    """The centre of a municipality as IBGE publishes it (WGS84 degrees); one row per city that has an IBGE code."""

    cd_ibge: str
    lat: float
    lon: float


CITY_COLUMNS = tuple(f.name for f in fields(CityRow))
TURNOUT_COLUMNS = tuple(f.name for f in fields(TurnoutRow))
VOTE_COLUMNS = tuple(f.name for f in fields(VoteRow))
CANDIDATE_COLUMNS = tuple(f.name for f in fields(CandidateRow))
CENTROID_COLUMNS = tuple(f.name for f in fields(CentroidRow))
TABLES = {
    "cities.csv": (CityRow, CITY_COLUMNS),
    "turnout.csv": (TurnoutRow, TURNOUT_COLUMNS),
    "votes.csv": (VoteRow, VOTE_COLUMNS),
    "candidates.csv": (CandidateRow, CANDIDATE_COLUMNS),
    "centroids.csv": (CentroidRow, CENTROID_COLUMNS),
}


@dataclass(frozen=True)
class CycleData:
    """Everything one election contributes, before the cycles are merged."""

    ano: int
    turnout: list[TurnoutRow]
    votes: list[VoteRow]
    candidates: list[CandidateRow]
    names: Mapping[tuple[str, int], str] = field(default_factory=dict)


@dataclass(frozen=True)
class Dataset:
    cities: list[CityRow]
    turnout: list[TurnoutRow]
    votes: list[VoteRow]
    candidates: list[CandidateRow]
    centroids: list[CentroidRow] = field(default_factory=list)

    def table(self, name: str) -> list:
        return {
            "cities.csv": self.cities, "turnout.csv": self.turnout, "votes.csv": self.votes, "candidates.csv": self.candidates,
            "centroids.csv": self.centroids,
        }[name]


def cycle_from_results(ano: int, results: Iterable[dict]) -> CycleData:
    """Rows from the scraped per-city results of the TSE results site (see ``tse_scrape.scrape_municipalities``)."""
    turnout, votes, names = [], [], {}
    candidates: dict[tuple[int, int], Candidate] = {}
    for result in results:
        uf, cd = result["uf"], int(result["code"])
        names[(uf, cd)] = result["name"]
        for turno, parsed in sorted(result["rounds"].items()):
            if parsed is None:
                continue
            turnout.append(TurnoutRow(
                ano, turno, uf, cd, parsed["voters"], parsed["turnout"], parsed["abstentions"],
                parsed["blank"], parsed["null"], 0, parsed["valid_votes"],  # 2026: no annulled-in-separate-tally votes (see tse_scrape)
            ))
            for number, (name, count) in parsed["candidates"].items():
                votes.append(VoteRow(ano, turno, uf, cd, int(number), count))
                candidate = Candidate(nome_urna=name, partido=parsed["parties"][number])
                if candidates.setdefault((turno, int(number)), candidate) != candidate:
                    raise CandidateConflictError(f"{ano} turno {turno} number {number}: {candidates[(turno, int(number))]} and {candidate}")
    candidate_rows = [CandidateRow(ano, turno, number, c.nome_urna, c.partido) for (turno, number), c in candidates.items()]
    return CycleData(ano, turnout, votes, candidate_rows, names)


def cycle_from_munzona(ano: int, turnout: Mapping, votes: Mapping, candidates: Mapping, names: Mapping) -> CycleData:
    """Rows from the parsed TSE open-data files (see ``munzona``)."""
    return CycleData(
        ano,
        [TurnoutRow(a, t, uf, cd, c.aptos, c.comparecimento, c.abstencoes, c.brancos, c.nulos, c.anulados_apu_sep, c.validos) for (a, t, uf, cd), c in turnout.items()],
        [VoteRow(a, t, uf, cd, number, count) for (a, t, uf, cd, number), count in votes.items()],
        [CandidateRow(a, t, number, c.nome_urna, c.partido) for (a, t, number), c in candidates.items()],
        names,
    )


def assemble(cycles: Iterable[CycleData], config_cities: Iterable[City]) -> Dataset:
    """Merge the cycles. ``cities`` is the union of the cities of every cycle, with the cycles that have data for each."""
    cycles = sorted(cycles, key=lambda cycle: cycle.ano)
    configured = {(city.uf, int(city.code)): city for city in config_cities}
    present: dict[tuple[str, int], set[int]] = {}
    latest_name: dict[tuple[str, int], str] = {}
    for cycle in cycles:
        for row in (*cycle.turnout, *cycle.votes):
            present.setdefault((row.uf, row.cd_municipio), set()).add(cycle.ano)
        latest_name.update(cycle.names)

    city_rows, slugs = [], {}
    for (uf, cd), years in present.items():
        city = configured.get((uf, cd))
        nome, ibge = (city.name, city.ibge) if city else (latest_name[(uf, cd)], "")
        slug = city.slug if city else slugify(nome)
        if (uf, slug) in slugs:
            raise DuplicateSlugError(f"{uf}/{slug}: TSE codes {slugs[(uf, slug)]} and {cd}")
        slugs[(uf, slug)] = cd
        city_rows.append(CityRow(uf, cd, ibge, nome, slug, region_of(uf), ";".join(str(year) for year in sorted(years))))
    return Dataset(
        cities=sorted(city_rows),
        turnout=sorted(row for cycle in cycles for row in cycle.turnout),
        votes=sorted(row for cycle in cycles for row in cycle.votes),
        candidates=sorted(row for cycle in cycles for row in cycle.candidates),
    )


def csv_bytes(rows: Iterable, columns: tuple[str, ...]) -> bytes:
    """UTF-8, LF, header first, one row per record in the order given."""
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(columns)
    writer.writerows(astuple(row) for row in rows)
    return buffer.getvalue().encode("utf-8")


def write_dataset(dataset: Dataset, out_dir) -> dict[str, dict]:
    """Writes the CSVs; returns ``{file: {"rows", "bytes", "sha256"}}`` for the manifest."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    report = {}
    for name, (_, columns) in TABLES.items():
        rows = dataset.table(name)
        content = csv_bytes(rows, columns)
        temporary = out_dir / (name + ".tmp")
        temporary.write_bytes(content)
        os.replace(temporary, out_dir / name)
        report[name] = {"rows": len(rows), "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}
    return report


def read_dataset(data_dir) -> Dataset:
    """Loads the CSVs, failing with the file name when a header or a value is not what we wrote."""
    tables = {}
    for name, (row_type, columns) in TABLES.items():
        path = Path(data_dir) / name
        try:
            with open(path, encoding="utf-8", newline="") as handle:
                reader = csv.reader(handle)
                header = next(reader, None)
                if tuple(header or ()) != columns:
                    raise ValueError(f"{name}: header {header} is not {list(columns)}")
                types = [f.type for f in fields(row_type)]
                tables[name] = [row_type(*(kind(value) for kind, value in zip(types, record, strict=True))) for record in reader]
        except (ValueError, TypeError) as error:
            raise ValueError(f"{name}: {error}") from error
    return Dataset(tables["cities.csv"], tables["turnout.csv"], tables["votes.csv"], tables["candidates.csv"], tables["centroids.csv"])


def write_manifest(manifest: dict, path) -> bytes:
    content = (json.dumps(manifest, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")
    Path(path).write_bytes(content)
    return content
