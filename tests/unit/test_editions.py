import json
import shutil
from pathlib import Path

import pytest

from voto_a_voto import editions
from voto_a_voto.editions import EditionError

FIXTURE_DATA = Path(__file__).parent.parent.parent / "web" / "fixtures" / "data"


@pytest.fixture
def data_dir(tmp_path) -> Path:
    target = tmp_path / "data"
    shutil.copytree(FIXTURE_DATA, target, ignore=shutil.ignore_patterns("nerds"))
    return target


@pytest.fixture
def editions_dir(tmp_path) -> Path:
    return tmp_path / "editions"


def snapshot(directory: Path) -> dict[str, bytes]:
    return {str(p.relative_to(directory)): p.read_bytes() for p in sorted(directory.rglob("*")) if p.is_file()}


def with_source(data_dir: Path, retrieved_at: str) -> None:
    path = data_dir / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8"))
    manifest["sources"] = [{"id": "x", "kind": "opendata", "retrieved_at": retrieved_at}]
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def test_the_id_is_the_collection_date_of_the_newest_source(data_dir, editions_dir):
    with_source(data_dir, "2026-10-27T18:44:42Z")

    published = editions.publish(data_dir, editions_dir)

    assert published == editions.Published("2026-10-27", created=True)
    assert (editions_dir / "2026-10-27" / "edition.json").exists()


def test_a_dataset_without_sources_needs_an_explicit_date(data_dir, editions_dir):
    with pytest.raises(EditionError, match="--date"):
        editions.publish(data_dir, editions_dir)


def test_an_edition_describes_its_files_counts_and_notes(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")

    edition = json.loads((editions_dir / "2026-10-26" / "edition.json").read_text(encoding="utf-8"))

    assert (edition["id"], edition["date"]) == ("2026-10-26", "2026-10-26")
    assert edition["counts"]["municipalities"] == 8  # the overseas post is not one of them
    assert edition["counts"]["overseas_posts"] == 1
    assert edition["counts"]["municipalities_per_cycle"] == {"2018": 7, "2022": 7, "2026": 8}
    assert set(edition["files"]) == set(editions.DATA_FILES)
    assert edition["notes"] and "fictícios" in edition["notes"][0]
    assert len(edition["fingerprint"]) == 16


def test_the_frozen_copy_is_the_dataset_byte_for_byte(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")

    assert snapshot(editions_dir / "2026-10-26" / "data") == snapshot(data_dir)


def test_the_same_inputs_give_the_same_bytes_on_a_second_run(data_dir, editions_dir, tmp_path):
    editions.publish(data_dir, editions_dir, date="2026-10-26")
    editions.publish(data_dir, tmp_path / "again", date="2026-10-26")

    assert snapshot(editions_dir) == snapshot(tmp_path / "again")


def test_publishing_the_same_dataset_twice_writes_nothing(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")
    before = snapshot(editions_dir)

    again = editions.publish(data_dir, editions_dir, date="2026-11-01")

    assert again == editions.Published("2026-10-26", created=False)
    assert snapshot(editions_dir) == before


def test_a_new_edition_never_overwrites_an_older_one(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")
    older = snapshot(editions_dir / "2026-10-26")
    (data_dir / "votes.csv").write_text((data_dir / "votes.csv").read_text(encoding="utf-8") + "2026,1,rj,99001,99,1\n", encoding="utf-8")

    second = editions.publish(data_dir, editions_dir, date="2026-10-26")  # same day, different data

    assert second == editions.Published("2026-10-26-2", created=True)
    assert snapshot(editions_dir / "2026-10-26") == older
    assert list(editions.load_editions(editions_dir)) == ["2026-10-26", "2026-10-26-2"]


def test_an_existing_edition_directory_is_never_replaced(data_dir, editions_dir):
    (editions_dir / "2026-10-26").mkdir(parents=True)  # a directory without edition.json: not a valid edition, but not ours to clobber

    with pytest.raises(EditionError, match="never overwritten"):
        editions.publish(data_dir, editions_dir, date="2026-10-26")


def test_check_passes_for_published_data(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")

    assert editions.check_editions(editions_dir, data_dir) == []


def test_check_fails_when_a_published_file_changes(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")
    (editions_dir / "2026-10-26" / "data" / "votes.csv").write_text("tampered\n", encoding="utf-8")

    findings = editions.check_editions(editions_dir, data_dir)

    assert any("2026-10-26: data/votes.csv differs from edition.json" in str(f) for f in findings)


def test_check_fails_when_the_edition_manifest_is_edited(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")
    path = editions_dir / "2026-10-26" / "edition.json"
    path.write_text(path.read_text(encoding="utf-8").replace('"municipalities": 8', '"municipalities": 9'), encoding="utf-8")

    findings = editions.check_editions(editions_dir, data_dir)

    assert any("edition.json is not what the frozen data describes" in str(f) for f in findings)


def test_check_fails_when_data_is_not_a_published_edition(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")
    (data_dir / "votes.csv").write_text((data_dir / "votes.csv").read_text(encoding="utf-8") + "2026,1,rj,99001,99,1\n", encoding="utf-8")

    findings = editions.check_editions(editions_dir, data_dir)

    assert any("is not a published edition" in str(f) for f in findings)


def test_check_fails_without_editions(data_dir, editions_dir):
    assert any("make publish-edition" in str(f) for f in editions.check_editions(editions_dir, data_dir))


def test_the_fingerprint_is_the_one_the_site_uses_for_its_shards(data_dir):
    # web/integrations/shards-fingerprint.ts: sha256 over `name NUL content NUL`, files in code-point order, 16 hex.
    assert editions.fingerprint(editions.read_files(data_dir)) == "f591db74932ecbdc"


def test_rollback_restores_the_previous_edition_and_changes_no_edition(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")
    first = {name: (data_dir / name).read_bytes() for name in editions.DATA_FILES}
    (data_dir / "votes.csv").write_text((data_dir / "votes.csv").read_text(encoding="utf-8") + "2026,1,rj,99001,99,1\n", encoding="utf-8")
    editions.publish(data_dir, editions_dir, date="2026-10-27")
    published = snapshot(editions_dir)

    restored = editions.rollback(editions_dir, data_dir)

    assert restored == "2026-10-26"
    assert {name: (data_dir / name).read_bytes() for name in editions.DATA_FILES} == first
    assert snapshot(editions_dir) == published
    assert editions.check_editions(editions_dir, data_dir) == []


def test_rollback_refuses_without_a_previous_edition(data_dir, editions_dir):
    editions.publish(data_dir, editions_dir, date="2026-10-26")

    with pytest.raises(EditionError, match="no previous edition"):
        editions.rollback(editions_dir, data_dir)
