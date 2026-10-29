"""Senador and Deputado Federal votes per municipality, from the TSE open-data ``munzona`` zips (2018, 2022, 2026).

Source: the per-UF members (``votacao_candidato_munzona_<year>_<UF>.csv``, ``detalhe_votacao_munzona_<year>_<UF>.csv``),
streamed one UF at a time so no zip is ever loaded whole. The ``_BRASIL`` member is the concatenation of every UF member
(4 GB in 2022) and ``_BR`` holds only the president, so the UF members are the one complete, non-redundant partition.

Output, per cargo and year, in ``data/legislative/`` (UTF-8, LF, rows sorted, no timestamps):

- ``<cargo>-<year>-votos.csv``: ``uf, cd_municipio, candidato_numero, votos_nominais, votos_nominais_validos`` summed over
  the zones of the municipality (``votos_nominais`` is the TSE ``QT_VOTOS_NOMINAIS``; ``votos_nominais_validos`` leaves
  out the votes the TSE annulled, ``QT_VOTOS_NOMINAIS_VALIDOS``);
- ``<cargo>-<year>-candidatos.csv``: ``uf, candidato_numero, sq_candidato, nome, nome_urna, partido, federacao, situacao``;
- ``<cargo>-<year>-totais.csv``: ``uf, cd_municipio`` and the TSE counts of the detail file summed over zones.

Votes are exactly as the TSE gives them and are not normalised: in 2018 two senators per state were elected and every voter
had two votes, so ``votos`` of a senator in 2018 is about twice ``comparecimento``; in 2022 one senator per state. Legend
votes (``legenda_validos``) exist only in the totals, never per candidate. ``cd_municipio`` is the TSE code of
``cities.csv`` (the IBGE code is empty there for cities that exist only in 2018/2022). Overseas posts (``zz``) would be
kept as in the president pipeline; the TSE has no overseas votes for these cargos.
"""
import hashlib
import os
import zipfile
from collections.abc import Iterable, Iterator, Mapping
from dataclasses import astuple, dataclass, fields
from datetime import datetime
from pathlib import Path

from voto_a_voto import csvio
from voto_a_voto.munzona import CandidateConflictError, MissingColumnError, read_rows

__all__ = [
    "CARGOS", "VERSION", "LegislativeError", "fingerprint", "parse_uf_totals", "parse_uf_votes", "output_names", "extract_year",
]

# Bump when the extraction changes what it writes from the same source bytes: every year is then extracted again.
VERSION = 1
CARGOS = {"5": "senador", "6": "deputado-federal"}
UFS = tuple("AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split()) + ("ZZ",)
FIRST_ROUND = "1"

VOTES_COLUMNS = (
    "NR_TURNO", "SG_UF", "CD_MUNICIPIO", "CD_CARGO", "NR_CANDIDATO", "SQ_CANDIDATO", "NM_CANDIDATO", "NM_URNA_CANDIDATO",
    "SG_PARTIDO", "SG_FEDERACAO", "DS_SIT_TOT_TURNO", "QT_VOTOS_NOMINAIS", "QT_VOTOS_NOMINAIS_VALIDOS",
)
TOTALS_COLUMNS = (
    "NR_TURNO", "SG_UF", "CD_MUNICIPIO", "CD_CARGO", "QT_APTOS", "QT_COMPARECIMENTO", "QT_ABSTENCOES", "QT_VOTOS",
    "QT_TOTAL_VOTOS_VALIDOS", "QT_VOTOS_NOMINAIS_VALIDOS", "QT_TOTAL_VOTOS_LEG_VALIDOS", "QT_VOTOS_BRANCOS",
    "QT_TOTAL_VOTOS_NULOS", "QT_TOTAL_VOTOS_ANULADOS", "QT_VOTOS_ANULADOS_APU_SEP",
)


class LegislativeError(RuntimeError):
    """The TSE zips do not have the shape this extraction depends on."""


@dataclass(frozen=True, order=True)
class VoteRow:
    uf: str
    cd_municipio: int
    candidato_numero: int
    votos_nominais: int
    votos_nominais_validos: int


@dataclass(frozen=True, order=True)
class CandidateRow:
    uf: str
    candidato_numero: int
    sq_candidato: int
    nome: str
    nome_urna: str
    partido: str
    federacao: str
    situacao: str


@dataclass(frozen=True)
class Totals:
    """Counts of one cargo summed over the zones of a municipality. ``votos`` is every vote cast for the cargo (two per voter for
    the 2018 Senate); ``validos = nominais_validos + legenda_validos``; ``votos = validos + brancos + nulos + anulados + anulados_apu_sep``."""

    aptos: int
    comparecimento: int
    abstencoes: int
    votos: int
    validos: int
    nominais_validos: int
    legenda_validos: int
    brancos: int
    nulos: int
    anulados: int
    anulados_apu_sep: int

    def __add__(self, other: "Totals") -> "Totals":
        return Totals(*(a + b for a, b in zip(astuple(self), astuple(other))))


VOTE_COLUMNS = ("uf", "cd_municipio", "candidato_numero", "votos_nominais", "votos_nominais_validos")
CANDIDATE_COLUMNS = tuple(f.name for f in fields(CandidateRow))
TOTAL_COLUMNS = ("uf", "cd_municipio", *(f.name for f in fields(Totals)))
FILES = {"votos": VOTE_COLUMNS, "candidatos": CANDIDATE_COLUMNS, "totais": TOTAL_COLUMNS}


def output_names(year: int) -> list[str]:
    return [f"{cargo}-{year}-{kind}.csv" for cargo in CARGOS.values() for kind in FILES]


def fingerprint(year: int, source_hashes: Iterable[str]) -> str:
    """What the extraction of a year was built from: the code version and the SHA-256 of each source zip it reads."""
    digest = hashlib.sha256(f"legislative-v{VERSION}-{year}\n".encode("utf-8"))
    for sha in sorted(source_hashes):
        digest.update(f"{sha}\n".encode("utf-8"))
    return digest.hexdigest()


def _clean(value: str) -> str:
    """The TSE writes ``#NULO#``, ``#NULO`` and ``#NE`` for 'no value' (e.g. no federation in 2018)."""
    return "" if value.startswith("#NULO") or value == "#NE" else value


def _selected(rows: Iterable[Mapping[str, str]], required: tuple[str, ...]) -> Iterator[Mapping[str, str]]:
    """First-round rows of the two legislative cargos; fails loudly when a column the extraction needs is gone."""
    checked = False
    for row in rows:
        if not checked:
            missing = [name for name in required if name not in row]
            if missing:
                raise MissingColumnError(f"TSE file has no column(s) {', '.join(missing)}; found {', '.join(row)}")
            checked = True
        if row["CD_CARGO"] in CARGOS and row["NR_TURNO"] == FIRST_ROUND:
            yield row


def parse_uf_votes(rows: Iterable[Mapping[str, str]]):
    """Per cargo name: votes keyed ``(uf, cd_municipio, numero)`` -> ``[nominais, validos]`` and candidates keyed ``(uf, numero)``."""
    votes: dict[str, dict[tuple[str, int, int], list[int]]] = {name: {} for name in CARGOS.values()}
    candidates: dict[str, dict[tuple[str, int], CandidateRow]] = {name: {} for name in CARGOS.values()}
    for row in _selected(rows, VOTES_COLUMNS):
        cargo, uf, number = CARGOS[row["CD_CARGO"]], row["SG_UF"].lower(), int(row["NR_CANDIDATO"])
        counts = votes[cargo].setdefault((uf, int(row["CD_MUNICIPIO"]), number), [0, 0])
        counts[0] += int(row["QT_VOTOS_NOMINAIS"])
        counts[1] += int(row["QT_VOTOS_NOMINAIS_VALIDOS"])
        candidate = CandidateRow(
            uf, number, int(row["SQ_CANDIDATO"]), row["NM_CANDIDATO"], row["NM_URNA_CANDIDATO"], row["SG_PARTIDO"],
            _clean(row["SG_FEDERACAO"]), row["DS_SIT_TOT_TURNO"],
        )
        if candidates[cargo].setdefault((uf, number), candidate) != candidate:
            raise CandidateConflictError(f"{cargo} {uf} {number}: {candidates[cargo][(uf, number)]} and {candidate}")
    return votes, candidates


def parse_uf_totals(rows: Iterable[Mapping[str, str]]):
    """Per cargo name: totals keyed ``(uf, cd_municipio)``, summed over zones; and the newest totalization stamp seen, if any."""
    totals: dict[str, dict[tuple[str, int], Totals]] = {name: {} for name in CARGOS.values()}
    newest = None
    for row in _selected(rows, TOTALS_COLUMNS):
        zone = Totals(
            int(row["QT_APTOS"]), int(row["QT_COMPARECIMENTO"]), int(row["QT_ABSTENCOES"]), int(row["QT_VOTOS"]),
            int(row["QT_TOTAL_VOTOS_VALIDOS"]), int(row["QT_VOTOS_NOMINAIS_VALIDOS"]), int(row["QT_TOTAL_VOTOS_LEG_VALIDOS"]),
            int(row["QT_VOTOS_BRANCOS"]), int(row["QT_TOTAL_VOTOS_NULOS"]), int(row["QT_TOTAL_VOTOS_ANULADOS"]),
            int(row["QT_VOTOS_ANULADOS_APU_SEP"]),
        )
        key = (row["SG_UF"].lower(), int(row["CD_MUNICIPIO"]))
        cargo = totals[CARGOS[row["CD_CARGO"]]]
        cargo[key] = cargo[key] + zone if key in cargo else zone
        stamp = f"{row.get('DT_ULTIMA_TOTALIZACAO', '')} {row.get('HH_ULTIMA_TOTALIZACAO', '')}".strip()
        try:
            moment = datetime.strptime(stamp, "%d/%m/%Y %H:%M:%S")
        except ValueError:
            continue
        newest = max(newest, moment) if newest else moment
    return totals, newest.isoformat() if newest else None


def uf_members(zip_path, kind: str, year: int) -> dict[str, str]:
    """``{UF: member name}`` of the per-UF CSVs of a zip (``_BR`` and ``_BRASIL`` are not UFs and are left out)."""
    with zipfile.ZipFile(zip_path) as archive:
        names = set(archive.namelist())
    return {uf: f"{kind}_{year}_{uf}.csv" for uf in UFS if f"{kind}_{year}_{uf}.csv" in names}


class _Sink:
    """A CSV written in chunks to ``<name>.tmp`` while its size, row count and SHA-256 are counted; ``commit`` renames it into place."""

    def __init__(self, path: Path, columns: tuple[str, ...]):
        self.path = path
        self.temporary = path.with_name(path.name + ".tmp")
        self.rows = 0
        self.digest = hashlib.sha256()
        self.bytes = 0
        self.handle = open(self.temporary, "wb")
        self.append_bytes(csvio.encode_rows([columns]))

    def append_bytes(self, content: bytes) -> None:
        self.handle.write(content)
        self.digest.update(content)
        self.bytes += len(content)

    def append(self, rows: list[tuple]) -> None:
        self.append_bytes(csvio.encode_rows(rows))
        self.rows += len(rows)

    def close(self) -> None:
        self.handle.close()

    def commit(self) -> dict:
        self.close()
        os.replace(self.temporary, self.path)
        return {"rows": self.rows, "bytes": self.bytes, "sha256": self.digest.hexdigest()}

    def discard(self) -> None:
        self.close()
        self.temporary.unlink(missing_ok=True)


def extract_year(candidate_zip, detail_zip, year: int, out_dir) -> dict:
    """Streams both zips UF by UF and writes the six files of the year; returns ``{"outputs", "newest_totalization", "elected"}``.

    ``elected`` counts, per cargo, the candidates whose situation is some kind of ``ELEITO``, used to judge whether the
    results are final. Nothing is left in ``out_dir`` when it fails."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    candidate_members = uf_members(candidate_zip, "votacao_candidato_munzona", year)
    detail_members = uf_members(detail_zip, "detalhe_votacao_munzona", year)
    if not candidate_members or candidate_members.keys() != detail_members.keys():
        raise LegislativeError(
            f"{year}: the candidate zip has UFs {sorted(candidate_members)} and the detail zip {sorted(detail_members)}; expected the same non-empty set"
        )
    sinks = {name: _Sink(out_dir / name, FILES[name.rsplit("-", 1)[1].removesuffix(".csv")]) for name in output_names(year)}
    elected = dict.fromkeys(CARGOS.values(), 0)
    newest = None
    try:
        for uf in sorted(candidate_members):
            votes, candidates = parse_uf_votes(read_rows(candidate_zip, candidate_members[uf]))
            totals, stamp = parse_uf_totals(read_rows(detail_zip, detail_members[uf]))
            newest = max(filter(None, (newest, stamp)), default=None)
            for cargo in CARGOS.values():
                prefix = f"{cargo}-{year}-"
                sinks[prefix + "votos.csv"].append(sorted((u, cd, n, a, b) for (u, cd, n), (a, b) in votes[cargo].items()))
                sinks[prefix + "candidatos.csv"].append([astuple(c) for _, c in sorted(candidates[cargo].items())])
                sinks[prefix + "totais.csv"].append([(u, cd, *astuple(t)) for (u, cd), t in sorted(totals[cargo].items())])
                elected[cargo] += sum(c.situacao.startswith("ELEITO") for c in candidates[cargo].values())
            del votes, candidates, totals
    except BaseException:
        for sink in sinks.values():
            sink.discard()
        raise
    return {"outputs": {name: sink.commit() for name, sink in sinks.items()}, "newest_totalization": newest, "elected": elected}


SOURCE_KINDS = ("votacao_candidato_munzona", "detalhe_votacao_munzona", "consulta_cand")
USED_KINDS = SOURCE_KINDS[:2]


def member_of(kind: str, year: int) -> str:
    """The member every zip has and the download cache checks for; the extraction itself reads the per-UF members."""
    return f"{kind}_{year}_BR.csv"


def status_of(extraction: dict) -> str:
    """``final`` once every cargo has elected candidates in the file. The TSE zips carry no finality marker (unlike the ``and = f`` of
    the results site used for the 2026 president), so this is the best the files themselves say; the manifest also records the newest
    totalization stamp and the fetch time."""
    return "final" if all(count > 0 for count in extraction["elected"].values()) else "provisional"


def update(out_dir, sources: Mapping[int, Mapping[str, object]]) -> list[str]:
    """Brings ``out_dir`` up to date for each year of ``sources`` (``{year: {kind: CachedFile}}``).

    A year whose source SHA-256 list and code ``VERSION`` equal the recorded fingerprint, and whose files still match the recorded
    hashes, is not parsed at all. Returns one summary line per year."""
    from voto_a_voto import manifest as manifest_module

    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    years = dict(manifest_module.read_legislative_manifest(out_dir)["years"])
    lines = []
    for year, cached in sorted(sources.items()):
        used = fingerprint(year, [cached[kind].sha256 for kind in USED_KINDS])
        source_entries = [manifest_module.legislative_source(kind, member_of(kind, year), cached[kind], kind in USED_KINDS) for kind in SOURCE_KINDS]
        entry = years.get(str(year))
        if manifest_module.legislative_up_to_date(entry, used, out_dir):
            years[str(year)] = {**entry, "sources": source_entries}
            lines.append(f"legislative {year}: unchanged, not parsed ({entry['status']})")
            continue
        extraction = extract_year(cached[USED_KINDS[0]].path, cached[USED_KINDS[1]].path, year, out_dir)
        years[str(year)] = manifest_module.legislative_entry(used, status_of(extraction), source_entries, extraction)
        rows = sum(output["rows"] for output in extraction["outputs"].values())
        lines.append(f"legislative {year}: extracted {len(extraction['outputs'])} files, {rows:,} rows ({years[str(year)]['status']})")
        manifest_module.write_legislative_manifest(out_dir, {"schema_version": manifest_module.LEGISLATIVE_SCHEMA_VERSION, "years": years})  # per year: an interrupted run keeps what it finished
    manifest_module.write_legislative_manifest(out_dir, {"schema_version": manifest_module.LEGISLATIVE_SCHEMA_VERSION, "years": years})
    return lines
