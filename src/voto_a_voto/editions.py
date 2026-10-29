"""Dated, immutable editions of the dataset (ticket #59).

An edition is a frozen copy of ``data/`` under ``editions/<id>/data/`` plus ``editions/<id>/edition.json``, the
description of that copy: id, date, fingerprint, counts, notes and the size and SHA-256 of every file. The id is the
collection date of the sources (``2026-10-27``; ``2026-10-27-2`` when a different dataset is published on the same
date). Nothing in an edition depends on the clock or on a later edition, so the same inputs give the same bytes and
publishing a new edition never touches an older one.
"""
import hashlib
import json
import shutil
from dataclasses import dataclass
from pathlib import Path

from voto_a_voto import csvio, release
from voto_a_voto.reconcile import Finding

SCHEMA_VERSION = 1
# The six files of a dataset, in fingerprint order (code-point); web/integrations/shards-fingerprint.ts lists the same.
DATA_FILES = ("candidates.csv", "centroids.csv", "cities.csv", "manifest.json", "turnout.csv", "votes.csv")
TABLES = ("candidates.csv", "centroids.csv", "cities.csv", "turnout.csv", "votes.csv")
EDITION_FILE = "edition.json"
OVERSEAS = "zz"


class EditionError(Exception):
    """An edition cannot be published or restored."""


@dataclass(frozen=True)
class Published:
    id: str
    created: bool  # False: the same dataset was already an edition, nothing was written


def read_files(directory: Path) -> dict[str, bytes]:
    missing = [name for name in DATA_FILES if not (Path(directory) / name).exists()]
    if missing:
        raise EditionError(f"{directory} is missing {', '.join(missing)}")
    return {name: (Path(directory) / name).read_bytes() for name in DATA_FILES}


def fingerprint(files: dict[str, bytes]) -> str:
    """The shard directory name of the site: 16 hex characters of SHA-256 over ``name NUL content NUL`` per file."""
    digest = hashlib.sha256()
    for name in DATA_FILES:
        digest.update(name.encode("utf-8") + b"\0" + files[name] + b"\0")
    return digest.hexdigest()[:16]


def file_entry(content: bytes) -> dict:
    return {"bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}


def collection_date(manifest: dict) -> str:
    """The newest ``retrieved_at`` of the sources, as a date; a dataset with no source needs an explicit date."""
    dates = sorted(source["retrieved_at"][:10] for source in manifest.get("sources", []) if source.get("retrieved_at"))
    if not dates:
        raise EditionError("manifest.json has no source with retrieved_at: pass --date")
    return dates[-1]


def rows_of(content: bytes) -> list[dict]:
    return csvio.read_rows(content)


def counts_of(files: dict[str, bytes]) -> dict:
    """What the edition holds: Brazilian municipalities (overall and per cycle), overseas posts, rows per table."""
    cities = rows_of(files["cities.csv"])
    municipalities = [row for row in cities if row["uf"] != OVERSEAS]
    cycles: dict[str, int] = {}
    for row in municipalities:
        for year in row["ciclos"].split(";"):
            cycles[year] = cycles.get(year, 0) + 1
    return {
        "municipalities": len(municipalities),
        "overseas_posts": len(cities) - len(municipalities),
        "municipalities_per_cycle": dict(sorted(cycles.items())),
        "rows": {name: len(rows_of(files[name])) for name in TABLES},
    }


def totals_of(files: dict[str, bytes]) -> dict:
    """Whole-country ``validos`` and ``comparecimento`` per cycle and round, overseas included (sums only)."""
    totals: dict[str, dict[str, int]] = {}
    for row in rows_of(files["turnout.csv"]):
        entry = totals.setdefault(f"{row['ano']}-{row['turno']}", {"comparecimento": 0, "validos": 0})
        entry["comparecimento"] += int(row["comparecimento"])
        entry["validos"] += int(row["validos"])
    return dict(sorted(totals.items()))


def notes_of(manifest: dict) -> list[str]:
    """Plain, neutral notes about the data of the edition (what it is and where it came from)."""
    if manifest.get("fixture"):
        return ["Dados fictícios de teste, no mesmo formato dos dados reais. Não são resultados de eleição."]
    notes = ["Resultados de presidente por município, 2018, 2022 e 2026, a partir de publicações oficiais do TSE."]
    site = next((source for source in manifest.get("sources", []) if source.get("kind") == "results_site"), None)
    if site is not None:
        notes.append(f"Resultados de 2026: {site['final']} de {site['files']} arquivos do TSE marcados como finais.")
    return notes


def describe(files: dict[str, bytes], edition_id: str, date: str, publication: dict) -> dict:
    """The ``edition.json`` content for a dataset: a pure function of the files, the id, the date and the publication record."""
    manifest = json.loads(files["manifest.json"].decode("utf-8"))
    record = {
        "schema_version": SCHEMA_VERSION,
        "id": edition_id,
        "date": date,
        "fingerprint": fingerprint(files),
        "counts": counts_of(files),
        "totals": totals_of(files),
        "notes": notes_of(manifest),
        "files": {name: file_entry(files[name]) for name in DATA_FILES},
        "publication": publication,
    }
    record["release"] = release.describe(release.build(files, record), edition_id)  # the open dataset release (#63)
    return record


def dump_json(value: dict) -> bytes:
    return (json.dumps(value, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")


def load_editions(editions_dir: Path) -> dict[str, dict]:
    """Every edition on disk by id, oldest first."""
    editions = {}
    for path in sorted(Path(editions_dir).glob(f"*/{EDITION_FILE}")):
        editions[path.parent.name] = json.loads(path.read_text(encoding="utf-8"))
    return dict(sorted(editions.items(), key=lambda item: (item[1]["date"], item[0])))


def edition_id_for(date: str, taken: dict[str, dict]) -> str:
    if date not in taken:
        return date
    number = 2
    while f"{date}-{number}" in taken:
        number += 1
    return f"{date}-{number}"


def publish(data_dir: Path, editions_dir: Path, *, date: str | None = None, publication: dict | None = None) -> Published:
    """Freezes ``data_dir`` as a new edition. A dataset that already is an edition is not published twice; an existing
    edition is never rewritten (the directory is created, never replaced)."""
    files = read_files(data_dir)
    existing = load_editions(editions_dir)
    wanted = fingerprint(files)
    for edition_id, edition in existing.items():
        if edition["fingerprint"] == wanted:
            return Published(edition_id, created=False)
    date = date or collection_date(json.loads(files["manifest.json"].decode("utf-8")))
    edition_id = edition_id_for(date, existing)
    target = Path(editions_dir) / edition_id
    if target.exists():
        raise EditionError(f"{target} already exists: editions are never overwritten")
    record = describe(files, edition_id, date, publication or {"mode": "manual", "checks": []})
    (target / "data").mkdir(parents=True)
    for name, content in files.items():
        (target / "data" / name).write_bytes(content)
    (target / "release").mkdir()
    for name, content in release.build(files, record).items():
        (target / "release" / name).write_bytes(content)
    (target / EDITION_FILE).write_bytes(dump_json(record))
    return Published(edition_id, created=True)


def check_edition(editions_dir: Path, edition_id: str, edition: dict) -> list[Finding]:
    """The recorded description still matches the frozen files, and describing those files again gives the same bytes."""
    directory = Path(editions_dir) / edition_id
    try:
        files = read_files(directory / "data")
    except EditionError as error:
        return [Finding("editions", f"{edition_id}: {error}")]
    findings = []
    for name, content in files.items():
        if edition["files"].get(name) != file_entry(content):
            findings.append(Finding("editions", f"{edition_id}: data/{name} differs from edition.json (a published edition never changes)"))
    if edition["id"] != edition_id:
        findings.append(Finding("editions", f"{edition_id}: edition.json says id {edition['id']}"))
    again = describe(files, edition_id, edition["date"], edition["publication"])
    if dump_json(again) != (directory / EDITION_FILE).read_bytes():
        findings.append(Finding("editions", f"{edition_id}: edition.json is not what the frozen data describes"))
    findings += check_release(directory, edition_id, edition, release.build(files, again))
    return findings


def check_release(directory: Path, edition_id: str, edition: dict, expected: dict[str, bytes]) -> list[Finding]:
    """The files of ``release/`` are exactly what the frozen data gives, and what edition.json recorded."""
    findings = []
    on_disk = {path.name for path in (directory / "release").glob("*")} if (directory / "release").is_dir() else set()
    for name in sorted(on_disk - set(expected)):
        findings.append(Finding("editions", f"{edition_id}: release/{name} is not part of the release"))
    for name, content in expected.items():
        path = directory / "release" / name
        if not path.exists():
            findings.append(Finding("editions", f"{edition_id}: release/{name} is missing"))
        elif path.read_bytes() != content:
            findings.append(Finding("editions", f"{edition_id}: release/{name} differs from what the frozen data gives (a release never changes)"))
        if edition.get("release", {}).get("files", {}).get(name) != file_entry(content):
            findings.append(Finding("editions", f"{edition_id}: release/{name} differs from edition.json"))
    return findings


def check_editions(editions_dir: Path, data_dir: Path) -> list[Finding]:
    """Every edition is intact and ``data/`` is one of them (the site links the edition it shows)."""
    if not Path(editions_dir).is_dir():
        return [Finding("editions", f"{editions_dir} is missing; run `make publish-edition`")]
    editions = load_editions(editions_dir)
    if not editions:
        return [Finding("editions", f"{editions_dir} has no edition; run `make publish-edition`")]
    findings = [finding for edition_id, edition in editions.items() for finding in check_edition(editions_dir, edition_id, edition)]
    try:
        current = fingerprint(read_files(data_dir))
    except EditionError as error:
        return [*findings, Finding("editions", str(error))]
    if current not in {edition["fingerprint"] for edition in editions.values()}:
        findings.append(Finding("editions", f"{data_dir} is not a published edition; run `make publish-edition`"))
    return findings


def current_edition(editions_dir: Path, data_dir: Path) -> str | None:
    """The id of the edition ``data_dir`` is, if any."""
    current = fingerprint(read_files(data_dir))
    return next((edition_id for edition_id, edition in load_editions(editions_dir).items() if edition["fingerprint"] == current), None)


def rollback(editions_dir: Path, data_dir: Path) -> str:
    """Restores ``data_dir`` to the edition before the one it shows. Writes only ``data_dir``; no edition changes."""
    editions = load_editions(editions_dir)
    shown = current_edition(editions_dir, data_dir)
    if shown is None:
        raise EditionError(f"{data_dir} is not a published edition: nothing to roll back from")
    ids = list(editions)
    position = ids.index(shown)
    if position == 0:
        raise EditionError(f"{shown} is the oldest edition: there is no previous edition")
    previous = ids[position - 1]
    for name in DATA_FILES:
        shutil.copyfile(Path(editions_dir) / previous / "data" / name, Path(data_dir) / name)
    return previous
