"""Pure parsers for the TSE open-data ``votacao_candidato_munzona`` and ``detalhe_votacao_munzona`` CSVs.

Rows are mappings keyed by the TSE column names (latin-1, ``;`` separated files). Only presidential rows
(``CD_CARGO = 1``) are kept. Overseas rows (``SG_UF = ZZ``) are kept with ``uf = "zz"``. UF is lowercase and
the municipality code is an int, exactly as in the old ``presidente_<year>_municipios.csv``.
"""
import csv
import io
import zipfile
from collections.abc import Iterable, Iterator, Mapping
from dataclasses import dataclass
from pathlib import Path

PRESIDENT = "1"

VOTES_COLUMNS = (
    "ANO_ELEICAO", "NR_TURNO", "SG_UF", "CD_MUNICIPIO", "CD_CARGO", "NR_CANDIDATO", "QT_VOTOS_NOMINAIS",
)
CANDIDATE_COLUMNS = ("ANO_ELEICAO", "NR_TURNO", "CD_CARGO", "NR_CANDIDATO", "NM_URNA_CANDIDATO", "SG_PARTIDO")
TURNOUT_COLUMNS = (
    "ANO_ELEICAO", "NR_TURNO", "SG_UF", "CD_MUNICIPIO", "CD_CARGO", "QT_APTOS", "QT_COMPARECIMENTO",
    "QT_ABSTENCOES", "QT_VOTOS_BRANCOS", "QT_VOTOS_NULOS", "QT_VOTOS_ANULADOS_APU_SEP", "QT_TOTAL_VOTOS_VALIDOS",
    "QT_ELEITORES_SECOES_NAO_INSTALADAS",
)


class MissingColumnError(KeyError):
    """A column this pipeline depends on is not in the TSE file."""


class CandidateConflictError(ValueError):
    """One candidate number maps to two different ballot names or parties in the same cycle and round."""


@dataclass(frozen=True)
class Candidate:
    nome_urna: str
    partido: str


@dataclass(frozen=True)
class Turnout:
    """Counts summed over the zones of a city. ``nao_instalados`` is the electorate of sections not installed."""

    aptos: int
    comparecimento: int
    abstencoes: int
    brancos: int
    nulos: int
    anulados_apu_sep: int  # votes annulled in a separate tally: part of the turnout, neither valid, blank nor null
    validos: int
    nao_instalados: int

    def __add__(self, other: "Turnout") -> "Turnout":
        return Turnout(*(a + b for a, b in zip(self._values(), other._values())))

    def _values(self) -> tuple[int, ...]:
        return (self.aptos, self.comparecimento, self.abstencoes, self.brancos, self.nulos, self.anulados_apu_sep, self.validos, self.nao_instalados)


def read_rows(zip_path: str | Path, member: str) -> Iterator[dict]:
    """Streams the rows of one CSV member of a TSE zip."""
    with zipfile.ZipFile(zip_path) as archive, archive.open(member) as raw:
        yield from csv.DictReader(io.TextIOWrapper(raw, encoding="latin-1", newline=""), delimiter=";")


def _presidential(rows: Iterable[Mapping[str, str]], required: tuple[str, ...]) -> Iterator[Mapping[str, str]]:
    checked = False
    for row in rows:
        if not checked:
            missing = [name for name in required if name not in row]
            if missing:
                raise MissingColumnError(f"TSE file has no column(s) {', '.join(missing)}; found {', '.join(row)}")
            checked = True
        if row["CD_CARGO"] == PRESIDENT:
            yield row


def parse_votes(rows: Iterable[Mapping[str, str]]) -> dict[tuple[int, int, str, int, int], int]:
    """Nominal votes per ``(ano, turno, uf, cd_municipio, candidato_numero)``, summed over zones."""
    totals: dict[tuple[int, int, str, int, int], int] = {}
    for row in _presidential(rows, VOTES_COLUMNS):
        key = (int(row["ANO_ELEICAO"]), int(row["NR_TURNO"]), row["SG_UF"].lower(), int(row["CD_MUNICIPIO"]), int(row["NR_CANDIDATO"]))
        totals[key] = totals.get(key, 0) + int(row["QT_VOTOS_NOMINAIS"])
    return totals


def parse_candidates(rows: Iterable[Mapping[str, str]]) -> dict[tuple[int, int, int], Candidate]:
    """Ballot name and party per ``(ano, turno, candidato_numero)``. Numbers are reused across cycles, so the cycle is part of the key."""
    candidates: dict[tuple[int, int, int], Candidate] = {}
    for row in _presidential(rows, CANDIDATE_COLUMNS):
        key = (int(row["ANO_ELEICAO"]), int(row["NR_TURNO"]), int(row["NR_CANDIDATO"]))
        candidate = Candidate(nome_urna=row["NM_URNA_CANDIDATO"], partido=row["SG_PARTIDO"])
        if candidates.setdefault(key, candidate) != candidate:
            raise CandidateConflictError(f"{key}: {candidates[key]} and {candidate}")
    return candidates


def parse_city_names(rows: Iterable[Mapping[str, str]]) -> dict[tuple[str, int], str]:
    """Municipality name per ``(uf, cd_municipio)``; overseas posts are named by their city."""
    return {
        (row["SG_UF"].lower(), int(row["CD_MUNICIPIO"])): row["NM_MUNICIPIO"]
        for row in _presidential(rows, ("SG_UF", "CD_MUNICIPIO", "CD_CARGO", "NM_MUNICIPIO"))
    }


def parse_turnout(rows: Iterable[Mapping[str, str]]) -> dict[tuple[int, int, str, int], Turnout]:
    """Turnout counts per ``(ano, turno, uf, cd_municipio)``, summed over zones."""
    totals: dict[tuple[int, int, str, int], Turnout] = {}
    for row in _presidential(rows, TURNOUT_COLUMNS):
        key = (int(row["ANO_ELEICAO"]), int(row["NR_TURNO"]), row["SG_UF"].lower(), int(row["CD_MUNICIPIO"]))
        zone = Turnout(
            aptos=int(row["QT_APTOS"]), comparecimento=int(row["QT_COMPARECIMENTO"]), abstencoes=int(row["QT_ABSTENCOES"]),
            brancos=int(row["QT_VOTOS_BRANCOS"]), nulos=int(row["QT_VOTOS_NULOS"]), anulados_apu_sep=int(row["QT_VOTOS_ANULADOS_APU_SEP"]), validos=int(row["QT_TOTAL_VOTOS_VALIDOS"]),
            nao_instalados=int(row["QT_ELEITORES_SECOES_NAO_INSTALADAS"]),
        )
        totals[key] = totals[key] + zone if key in totals else zone
    return totals
