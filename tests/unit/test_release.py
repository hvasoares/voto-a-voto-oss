import csv
import hashlib
import io
import json
import shutil
from pathlib import Path

import pytest

from voto_a_voto import dataset, editions, release

FIXTURE_DATA = Path(__file__).parent.parent.parent / "web" / "fixtures" / "data"


@pytest.fixture
def published(tmp_path):
    data = tmp_path / "data"
    shutil.copytree(FIXTURE_DATA, data)
    editions.publish(data, tmp_path / "editions", date="2026-10-26")
    return data, tmp_path / "editions", tmp_path / "editions" / "2026-10-26"


def rows(path: Path) -> list[dict]:
    return list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8"), newline="")))


def test_the_release_has_csv_ndjson_dictionary_readme_citation_and_checksums(published):
    _, _, edition = published

    assert sorted(p.name for p in (edition / "release").iterdir()) == sorted([
        "CITATION.cff", "LEIAME.md", "SHA256SUMS", "candidates.csv", "candidates.ndjson", "cities.csv", "cities.ndjson",
        "dicionario.csv", "turnout.csv", "turnout.ndjson", "votes.csv", "votes.ndjson",
    ])


def test_the_dictionary_lists_every_field_of_every_released_table_with_meaning_and_source(published):
    _, _, edition = published
    listed = {(r["arquivo"], r["campo"]): r for r in rows(edition / "release" / "dicionario.csv")}

    for table in release.TABLES:
        for column in dataset.TABLES[table][1]:
            entry = listed[(table, column)]
            assert entry["significado"].strip() and entry["fonte"].strip() and entry["tipo"] in {"texto", "inteiro", "lista"}
    assert len(listed) == sum(len(dataset.TABLES[t][1]) for t in release.TABLES)  # and nothing the tables do not have


def test_each_ndjson_line_is_a_row_of_the_csv_with_the_same_columns_in_order(published):
    _, _, edition = published
    for table in release.TABLES:
        lines = (edition / "release" / table.replace(".csv", ".ndjson")).read_text(encoding="utf-8").splitlines()
        csv_rows = rows(edition / "release" / table)
        assert len(lines) == len(csv_rows)
        first = json.loads(lines[0], object_pairs_hook=list)
        assert [k for k, _ in first] == list(dataset.TABLES[table][1])


def test_ndjson_types_integers_lists_and_missing_values(published):
    _, _, edition = published
    cities = [json.loads(line) for line in (edition / "release" / "cities.ndjson").read_text(encoding="utf-8").splitlines()]
    overseas = next(c for c in cities if c["uf"] == "zz")
    boa = next(c for c in cities if c["slug"] == "boa-esperanca-do-norte")

    assert overseas["cd_ibge"] is None and overseas["regiao"] == "exterior"
    assert boa["ciclos"] == [2026] and isinstance(boa["cd_municipio"], int)
    turnout = json.loads((edition / "release" / "turnout.ndjson").read_text(encoding="utf-8").splitlines()[0])
    assert all(isinstance(turnout[k], int) for k in ("ano", "turno", "aptos", "validos"))


def test_sha256sums_verify_every_other_file(published):
    _, _, edition = published
    for line in (edition / "release" / "SHA256SUMS").read_text(encoding="utf-8").splitlines():
        digest, name = line.split("  ")
        assert hashlib.sha256((edition / "release" / name).read_bytes()).hexdigest() == digest
    assert "SHA256SUMS" not in (edition / "release" / "SHA256SUMS").read_text(encoding="utf-8")


def test_readme_documents_ties_overseas_licence_and_how_to_cite(published):
    _, _, edition = published
    text = (edition / "release" / "LEIAME.md").read_text(encoding="utf-8")

    assert "**Empates.**" in text and "**Exterior.**" in text and "zz" in text
    assert "Creative Commons Atribuição 4.0" in text
    assert "Como citar" in text and "https://voto-a-voto.com/edicoes/2026-10-26/dados/" in text
    cff = (edition / "release" / "CITATION.cff").read_text(encoding="utf-8")
    assert 'version: "2026-10-26"' in cff and "license: CC-BY-4.0" in cff


def test_the_release_is_tied_to_its_edition_and_recorded_in_edition_json(published):
    _, _, edition = published
    record = json.loads((edition / "edition.json").read_text(encoding="utf-8"))

    assert record["release"]["identifier"] == "voto-a-voto-2026-10-26"
    assert record["release"]["url"] == "https://voto-a-voto.com/edicoes/2026-10-26/dados/"
    assert set(record["release"]["files"]) == {p.name for p in (edition / "release").iterdir()}


def test_a_second_run_changes_no_byte(published, tmp_path):
    data, _, edition = published
    editions.publish(data, tmp_path / "again", date="2026-10-26")

    for path in (edition / "release").iterdir():
        assert path.read_bytes() == (tmp_path / "again" / "2026-10-26" / "release" / path.name).read_bytes()


@pytest.mark.parametrize("name", ["votes.ndjson", "LEIAME.md", "SHA256SUMS"])
def test_check_covers_the_release_files(published, name):
    data, editions_dir, edition = published
    path = edition / "release" / name
    path.write_bytes(path.read_bytes() + b"x")

    findings = editions.check_editions(editions_dir, data)

    assert any(f"release/{name} differs" in str(f) for f in findings)


def test_check_notices_a_missing_or_extra_release_file(published):
    data, editions_dir, edition = published
    (edition / "release" / "dicionario.csv").unlink()
    (edition / "release" / "extra.txt").write_text("x", encoding="utf-8")

    messages = [str(f) for f in editions.check_editions(editions_dir, data)]

    assert any("release/dicionario.csv is missing" in m for m in messages)
    assert any("release/extra.txt is not part of the release" in m for m in messages)
