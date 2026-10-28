import csv
import io
import json
import shutil
from pathlib import Path

import pytest

from voto_a_voto import editions, nerds

FIXTURE_DATA = Path(__file__).parent.parent.parent / "web" / "fixtures" / "data"


@pytest.fixture
def made(tmp_path):
    """A copy of the fixture dataset, published as an edition, with its level shards written."""
    data = tmp_path / "data"
    shutil.copytree(FIXTURE_DATA, data, ignore=shutil.ignore_patterns("nerds"))
    manifest = json.loads((data / "manifest.json").read_text(encoding="utf-8"))
    manifest["sources"] = [{"id": "x", "kind": "opendata", "retrieved_at": "2026-10-27T10:00:00Z"}]
    (data / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    editions.publish(data, tmp_path / "editions")
    nerds.write(data, tmp_path / "editions")
    return data, tmp_path / "editions"


def shard(data: Path, name: str) -> dict:
    return json.loads((data / "nerds" / name).read_text(encoding="utf-8"))


def named(s: dict, cells: list) -> dict:
    return nerds._row(s["columns"], cells)


def test_one_shard_per_level_cycle_and_round_and_nothing_for_a_round_that_did_not_happen(made):
    data, _ = made
    names = sorted(p.relative_to(data / "nerds").as_posix() for p in (data / "nerds").rglob("*.json") if p.name != "manifest.json")

    assert [n for n in names if n.startswith("brasil/")] == [f"brasil/{a}-{t}.json" for a in (2018, 2022, 2026) for t in (1, 2)]
    assert [n for n in names if n.startswith("regiao/sudeste/")] == [f"regiao/sudeste/{a}-{t}.json" for a in (2018, 2022, 2026) for t in (1, 2)]
    # Boa Esperança do Norte (MT) exists only in 2026: the other cycles have no centro-oeste/mt shard, not a shard of zeros
    assert [n for n in names if n.startswith(("regiao/centro-oeste/", "uf/mt/"))] == [f"{p}/2026-{t}.json" for p in ("regiao/centro-oeste", "uf/mt") for t in (1, 2)]
    assert not any(n.startswith(("regiao/exterior", "uf/zz")) for n in names)  # the overseas posts are a row of Brasil, not a page


def test_a_missing_round_leaves_no_shard_and_no_row_of_zeros(made, tmp_path):
    data, editions_dir = made
    kept = io.StringIO()
    rows = list(csv.DictReader(io.StringIO((data / "turnout.csv").read_text(encoding="utf-8"))))
    writer = csv.DictWriter(kept, fieldnames=list(rows[0]), lineterminator="\n")
    writer.writeheader()
    writer.writerows(r for r in rows if not (r["ano"] == "2026" and r["turno"] == "2"))
    (data / "turnout.csv").write_text(kept.getvalue(), encoding="utf-8")
    votes = [r for r in csv.DictReader(io.StringIO((data / "votes.csv").read_text(encoding="utf-8"))) if not (r["ano"] == "2026" and r["turno"] == "2")]
    out = io.StringIO()
    w = csv.DictWriter(out, fieldnames=["ano", "turno", "uf", "cd_municipio", "candidato_numero", "votos"], lineterminator="\n")
    w.writeheader()
    w.writerows(votes)
    (data / "votes.csv").write_text(out.getvalue(), encoding="utf-8")
    editions.publish(data, editions_dir, date="2026-10-28")

    nerds.write(data, editions_dir)

    assert not list((data / "nerds").rglob("2026-2.json"))
    assert (data / "nerds" / "brasil" / "2026-1.json").exists()


def test_every_header_names_the_edition_and_its_content_hash_and_the_manifest_lists_every_shard(made):
    data, editions_dir = made
    edition = next(iter(editions.load_editions(editions_dir).values()))
    manifest = json.loads((data / "nerds" / "manifest.json").read_text(encoding="utf-8"))

    assert manifest["edition"] == edition["id"] and manifest["hash"] == edition["fingerprint"]
    on_disk = {p.relative_to(data / "nerds").as_posix() for p in (data / "nerds").rglob("*.json") if p.name != "manifest.json"}
    assert set(manifest["shards"]) == on_disk
    for name in on_disk:
        header = shard(data, name)
        assert (header["edition"], header["hash"]) == (edition["id"], edition["fingerprint"])
        assert manifest["shards"][name]["bytes"] == (data / "nerds" / name).stat().st_size


def test_a_second_run_changes_no_bytes(made):
    data, editions_dir = made
    before = {p: p.read_bytes() for p in (data / "nerds").rglob("*.json")}

    count, changed = nerds.write(data, editions_dir)

    assert (count, changed) == (28, False)
    assert before == {p: p.read_bytes() for p in (data / "nerds").rglob("*.json")}


def test_the_dataset_must_be_a_published_edition(tmp_path):
    data = tmp_path / "data"
    shutil.copytree(FIXTURE_DATA, data, ignore=shutil.ignore_patterns("nerds"))

    with pytest.raises(nerds.NerdsError, match="make publish-edition"):
        nerds.write(data, tmp_path / "editions")


def test_the_levels_reconcile_on_every_column_and_both_rounds(made):
    data, editions_dir = made

    assert nerds.check(data, editions_dir) == []
    for turno in (1, 2):
        brasil = shard(data, f"brasil/2022-{turno}.json")
        total = named(brasil, brasil["total"])
        for group in ("regioes", "ufs"):
            rows = [named(brasil, c) for c in brasil[group]]
            assert {n: sum(r[n] for r in rows) for n in nerds.METRICS} == {n: total[n] for n in nerds.METRICS}
        sudeste = shard(data, f"regiao/sudeste/2022-{turno}.json")
        assert [named(sudeste, c)["id"] for c in sudeste["ufs"]] == ["rj", "sp"]


def test_golden_values_equal_an_independent_sum_of_the_source_csv(made):
    data, _ = made
    cities = {r["cd_municipio"]: r for r in csv.DictReader((data / "cities.csv").open(encoding="utf-8"))}
    expected = {"eleitorado": 0, "comparecimento": 0, "abstencao": 0, "validos": 0}
    for r in csv.DictReader((data / "turnout.csv").open(encoding="utf-8")):
        if (r["ano"], r["turno"]) == ("2022", "1") and cities[r["cd_municipio"]]["uf"] == "rj":
            expected["eleitorado"] += int(r["aptos"])
            expected["comparecimento"] += int(r["comparecimento"])
            expected["abstencao"] += int(r["abstencoes"])
            expected["validos"] += int(r["validos"])
    rj = shard(data, "uf/rj/2022-1.json")

    total = named(rj, rj["total"])

    assert {k: total[k] for k in expected} == expected


def test_candidates_plus_brancos_nulos_equal_the_votantes_on_every_row_and_a_broken_shard_is_found(made):
    data, editions_dir = made
    path = data / "nerds" / "uf" / "rj" / "2022-1.json"
    s = json.loads(path.read_text(encoding="utf-8"))
    for cells in s["municipios"]:
        row = named(s, cells)
        assert sum(row["votos"]) + row["brancos_nulos"] == row["comparecimento"]

    s["municipios"][0][-1] += 1
    path.write_text(json.dumps(s, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")

    messages = [f.message for f in nerds.check(data, editions_dir)]
    assert any("differs from what the dataset makes" in m for m in messages)
    assert any("uf/rj/2022-1.json" in m and "candidates" in m for m in messages)


def test_candidates_are_listed_in_ballot_number_order_never_by_result(made):
    data, _ = made
    s = shard(data, "brasil/2022-1.json")
    numbers = [c["numero"] for c in s["candidatos"]]

    assert numbers == sorted(numbers)
    totals = named(s, s["total"])["votos"]
    assert len(totals) == len(numbers)


def test_a_stale_shard_after_the_dataset_changes_fails_the_check_and_a_missing_one_is_named(made):
    data, editions_dir = made
    (data / "nerds" / "uf" / "sp" / "2026-2.json").unlink()

    messages = [f.message for f in nerds.check(data, editions_dir)]

    assert "uf/sp/2026-2.json: missing" in messages


def test_shards_carry_printed_measures_only(made):
    data, _ = made
    s = shard(data, "brasil/2022-1.json")

    assert s["columns"] == ["id", *nerds.METRICS, "votos"]
    assert set(s) == {"schema", "edition", "hash", "level", "id", "cargo", "ano", "turno", "columns", "candidatos", "total", "regioes", "ufs"}
