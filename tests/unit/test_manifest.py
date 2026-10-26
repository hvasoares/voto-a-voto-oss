import hashlib
import json

import pytest

from voto_a_voto.dataset import Dataset, TurnoutRow, write_dataset
from voto_a_voto.manifest import build_manifest, check_manifest, summarize_results_files, turnout_identity


def jws(make_jws, status="f", dg="25/10/2026", hg="23:27:43"):
    return make_jws({"and": status, "dg": dg, "hg": hg})


def write_files(tmp_path, make_jws, items):
    paths = []
    for name, text in items.items():
        (tmp_path / name).write_text(text, encoding="utf-8")
        paths.append(tmp_path / name)
    return paths


def test_results_summary_counts_files_final_ones_and_the_newest_generation(tmp_path, make_jws):
    paths = write_files(tmp_path, make_jws, {
        "a.jws": jws(make_jws, "f", "25/10/2026", "23:27:43"),
        "b.jws": jws(make_jws, "p", "26/10/2026", "01:02:03"),
        "c.jws": jws(make_jws, "f", "25/10/2026", "23:59:59"),
    })

    summary = summarize_results_files(paths)

    assert (summary["files"], summary["final"]) == (3, 2)
    assert summary["newest_generation"] == "2026-10-26T01:02:03"


def test_results_digest_does_not_depend_on_file_order_and_changes_with_content(tmp_path, make_jws):
    paths = write_files(tmp_path, make_jws, {"a.jws": jws(make_jws, hg="10:00:00"), "b.jws": jws(make_jws, hg="11:00:00")})
    digest = summarize_results_files(paths)["digest"]

    assert summarize_results_files(list(reversed(paths)))["digest"] == digest
    paths[0].write_text(jws(make_jws, hg="10:00:01"), encoding="utf-8")
    assert summarize_results_files(paths)["digest"] != digest


def test_results_digest_is_the_sha256_of_sorted_name_and_file_hash_lines(tmp_path, make_jws):
    paths = write_files(tmp_path, make_jws, {"b.jws": jws(make_jws, hg="11:00:00"), "a.jws": jws(make_jws, hg="10:00:00")})
    lines = "".join(f"{p.name} {hashlib.sha256(p.read_bytes()).hexdigest()}\n" for p in sorted(paths))

    assert summarize_results_files(paths)["digest"] == hashlib.sha256(lines.encode("utf-8")).hexdigest()


def row(ano, turno, uf, cd, aptos, comparecimento, abstencoes):
    return TurnoutRow(ano, turno, uf, cd, aptos, comparecimento, abstencoes, 0, comparecimento, 0, 0)


def test_turnout_identity_reports_the_remainder_and_what_the_tse_says_it_is():
    dataset = Dataset([], [row(2022, 2, "pi", 1, 100, 70, 29), row(2022, 2, "zz", 2, 10, 6, 3)], [], [])

    identity = turnout_identity(dataset, reported={(2022, 2): 2})

    assert identity == [{
        "ano": 2022, "turno": 2, "aptos_menos_comparecimento_menos_abstencoes": 2,
        "eleitores_secoes_nao_instaladas_informado": 2,
    }]


def test_turnout_identity_has_no_reported_value_when_the_source_gives_none():
    dataset = Dataset([], [row(2026, 1, "pi", 1, 100, 70, 29)], [], [])

    assert turnout_identity(dataset, reported={})[0]["eleitores_secoes_nao_instaladas_informado"] is None


@pytest.fixture
def written(tmp_path):
    dataset = Dataset([], [row(2022, 2, "pi", 1, 100, 70, 29)], [], [])
    outputs = write_dataset(dataset, tmp_path)
    manifest = build_manifest(sources=[{"id": "s"}], outputs=outputs, reference={}, identity=[])
    (tmp_path / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    return tmp_path, manifest


def test_a_consistent_manifest_has_no_findings(written):
    data_dir, manifest = written

    assert check_manifest(manifest, data_dir) == []


def test_manifest_is_sorted_and_carries_a_schema_version(written):
    _, manifest = written

    assert manifest["schema_version"] == 1
    assert list(manifest["outputs"]) == ["candidates.csv", "cities.csv", "turnout.csv", "votes.csv"]


def test_a_changed_byte_is_caught_by_the_file_hash(written):
    data_dir, manifest = written
    path = data_dir / "turnout.csv"
    path.write_bytes(path.read_bytes().replace(b",100,", b",101,"))

    findings = check_manifest(manifest, data_dir)

    assert any("turnout.csv" in f.message and "sha256" in f.message for f in findings)


def test_a_missing_file_and_a_wrong_row_count_are_reported(written):
    data_dir, manifest = written
    (data_dir / "votes.csv").unlink()
    manifest["outputs"]["turnout.csv"]["rows"] += 1

    messages = " ".join(f.message for f in check_manifest(manifest, data_dir))

    assert "votes.csv" in messages and "missing" in messages
    assert "turnout.csv" in messages and "rows" in messages
