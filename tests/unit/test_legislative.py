import hashlib
import json
from pathlib import Path

import pytest
from synthetic_tse import legislative_zip_pair, tse_zip, uf_rows

from voto_a_voto import csvio, legislative, manifest
from voto_a_voto.munzona import CandidateConflictError, MissingColumnError
from voto_a_voto.opendata import CachedFile
from voto_a_voto.reconcile import check_legislative

KNOWN = {("pi", 10430)}


def write_zips(directory: Path, year: int, **kwargs) -> tuple[Path, Path]:
    candidate_zip, detail_zip = legislative_zip_pair(year, **kwargs)
    paths = directory / f"votacao_candidato_munzona_{year}.zip", directory / f"detalhe_votacao_munzona_{year}.zip"
    for path, content in zip(paths, (candidate_zip, detail_zip)):
        path.write_bytes(content)
    return paths


def cached(path: Path, sha: str, year: int = 2022, etag: str = '"e1"') -> CachedFile:
    return CachedFile(url=f"https://cdn.example/{path.name}", path=path, sha256=sha, bytes=path.stat().st_size if path.exists() else 0,
                      etag=etag, last_modified="Thu, 29 Oct 2026 07:18:04 GMT", retrieved_at="2026-10-29T10:00:00Z", source="downloaded")


def sources_for(directory: Path, year: int, sha: str = "a" * 64) -> dict:
    candidate_path, detail_path = write_zips(directory, year)
    registration = directory / f"consulta_cand_{year}.zip"
    registration.write_bytes(tse_zip({f"consulta_cand_{year}_BR.csv": b"x"}))
    return {year: {
        "votacao_candidato_munzona": cached(candidate_path, sha), "detalhe_votacao_munzona": cached(detail_path, "b" * 64),
        "consulta_cand": cached(registration, "c" * 64),
    }}


def read(directory: Path, name: str) -> list[dict]:
    return csvio.read_rows((directory / name).read_bytes())


@pytest.fixture
def extracted(tmp_path):
    def run(year: int, **kwargs):
        candidate_path, detail_path = write_zips(tmp_path, year, **kwargs)
        return legislative.extract_year(candidate_path, detail_path, year, tmp_path / "out"), tmp_path / "out"

    return run


def test_votes_are_summed_over_the_zones_of_each_municipality_per_candidate(extracted):
    _, out = extracted(2022)

    votes = read(out, "senador-2022-votos.csv")

    assert votes == [
        {"uf": "pi", "cd_municipio": "10430", "candidato_numero": "111", "votos_nominais": "300", "votos_nominais_validos": "300"},
        {"uf": "pi", "cd_municipio": "10430", "candidato_numero": "222", "votos_nominais": "150", "votos_nominais_validos": "150"},
    ]


def test_each_cargo_gets_its_own_files_and_nothing_else_is_extracted(extracted, tmp_path):
    result, out = extracted(2022)

    assert sorted(p.name for p in out.iterdir()) == sorted(legislative.output_names(2022))
    assert sorted(result["outputs"]) == sorted(legislative.output_names(2022))
    assert [r["candidato_numero"] for r in read(out, "deputado-federal-2022-votos.csv")] == ["1111", "2222"]


def test_only_the_uf_members_are_read_not_the_president_member_nor_the_brasil_concatenation(extracted):
    _, out = extracted(2022)  # the zips carry 999999-vote rows in _BR and _BRASIL

    assert "999999" not in (out / "deputado-federal-2022-votos.csv").read_text(encoding="utf-8")
    assert read(out, "deputado-federal-2022-totais.csv")[0]["votos"] == "195"


def test_other_cargos_and_other_rounds_are_ignored(tmp_path):
    candidates, detail = uf_rows(2022)
    extra = [
        {"CD_CARGO": "1", "DS_CARGO": "Presidente", "NR_CANDIDATO": "13", "QT_VOTOS_NOMINAIS": 500, "QT_VOTOS_NOMINAIS_VALIDOS": 500},
        {"CD_CARGO": "7", "DS_CARGO": "Deputado Estadual", "NR_CANDIDATO": "11111", "QT_VOTOS_NOMINAIS": 500, "QT_VOTOS_NOMINAIS_VALIDOS": 500},
        {"CD_CARGO": "5", "NR_TURNO": "2", "NR_CANDIDATO": "111", "QT_VOTOS_NOMINAIS": 500, "QT_VOTOS_NOMINAIS_VALIDOS": 500},
    ]
    candidate_zip, detail_zip = write_zips(tmp_path, 2022, candidates=[*candidates, *extra], detail=detail)

    legislative.extract_year(candidate_zip, detail_zip, 2022, tmp_path / "out")

    assert {r["candidato_numero"] for r in read(tmp_path / "out", "senador-2022-votos.csv")} == {"111", "222"}
    assert read(tmp_path / "out", "senador-2022-candidatos.csv")[0]["candidato_numero"] == "111"


def test_the_2018_senate_keeps_two_votes_per_voter_as_the_tse_gives_them(extracted):
    _, out = extracted(2018)

    totals = read(out, "senador-2018-totais.csv")[0]

    assert (int(totals["comparecimento"]), int(totals["votos"])) == (486, 972)
    assert int(totals["validos"]) + int(totals["brancos"]) + int(totals["nulos"]) == 972


def test_latin1_names_are_decoded_and_written_as_utf8_with_no_value_markers(tmp_path):
    candidates, detail = uf_rows(2022)
    for row in candidates:
        if row["NR_CANDIDATO"] == "111":
            row.update({"NM_CANDIDATO": "JOSÉ AÇÃO", "NM_URNA_CANDIDATO": "ZÉ DA PAÇOCA"})
    candidate_zip, detail_zip = write_zips(tmp_path, 2022, candidates=candidates, detail=detail)

    legislative.extract_year(candidate_zip, detail_zip, 2022, tmp_path / "out")

    first = read(tmp_path / "out", "senador-2022-candidatos.csv")[0]
    assert (first["nome"], first["nome_urna"], first["federacao"], first["situacao"]) == ("JOSÉ AÇÃO", "ZÉ DA PAÇOCA", "", "ELEITO")


def test_overseas_posts_are_kept_with_a_lowercase_zz_like_the_president_pipeline(tmp_path):
    candidates, detail = uf_rows(2022, uf="ZZ", cd=29254)
    candidate_zip, detail_zip = write_zips(tmp_path, 2022, candidates=candidates, detail=detail, uf="ZZ")

    legislative.extract_year(candidate_zip, detail_zip, 2022, tmp_path / "out")

    assert {(r["uf"], r["cd_municipio"]) for r in read(tmp_path / "out", "deputado-federal-2022-totais.csv")} == {("zz", "29254")}


def test_a_candidate_number_with_two_identities_in_one_uf_is_an_error(tmp_path):
    candidates, detail = uf_rows(2022)
    candidates[1].update({"NR_CANDIDATO": "111", "NM_CANDIDATO": "OUTRA PESSOA", "SQ_CANDIDATO": "9"})
    candidate_zip, detail_zip = write_zips(tmp_path, 2022, candidates=candidates, detail=detail)

    with pytest.raises(CandidateConflictError):
        legislative.extract_year(candidate_zip, detail_zip, 2022, tmp_path / "out")
    assert not list((tmp_path / "out").glob("*"))  # nothing half-written


def test_a_missing_column_is_named(tmp_path):
    candidate_zip, detail_zip = write_zips(tmp_path, 2022)
    broken = tse_zip({"votacao_candidato_munzona_2022_PI.csv": b'"CD_CARGO";"NR_TURNO"\r\n"5";"1"\r\n'})
    candidate_zip.write_bytes(broken)

    with pytest.raises(MissingColumnError, match="QT_VOTOS_NOMINAIS"):
        legislative.extract_year(candidate_zip, detail_zip, 2022, tmp_path / "out")


def test_zips_with_different_ufs_are_refused(tmp_path):
    candidate_zip, _ = write_zips(tmp_path, 2022)
    _, detail_zip = legislative_zip_pair(2022, uf="AC")
    (tmp_path / "detail.zip").write_bytes(detail_zip)

    with pytest.raises(legislative.LegislativeError, match="same non-empty set"):
        legislative.extract_year(candidate_zip, tmp_path / "detail.zip", 2022, tmp_path / "out")


# -- fingerprint and skip ----------------------------------------------------------------------------------------------------------


def test_a_second_update_parses_nothing_and_changes_no_byte(tmp_path):
    sources = sources_for(tmp_path, 2022)
    out = tmp_path / "out"
    first_lines = legislative.update(out, sources)
    before = {p.name: p.read_bytes() for p in out.iterdir()}
    for kind in legislative.USED_KINDS:  # same recorded hash, but unreadable bytes: any parse would fail
        sources[2022][kind].path.write_bytes(b"not a zip")

    second_lines = legislative.update(out, sources)

    assert first_lines[0].startswith("legislative 2022: extracted 6 files")
    assert second_lines == ["legislative 2022: unchanged, not parsed (final)"]
    assert {p.name: p.read_bytes() for p in out.iterdir()} == before


def test_a_new_revision_of_a_source_zip_is_extracted_again(tmp_path):
    out = tmp_path / "out"
    legislative.update(out, sources_for(tmp_path, 2022))
    changed = sources_for(tmp_path, 2022, sha="d" * 64)

    lines = legislative.update(out, changed)

    assert lines[0].startswith("legislative 2022: extracted")
    recorded = manifest.read_legislative_manifest(out)["years"]["2022"]
    assert next(s for s in recorded["sources"] if s["kind"] == "votacao_candidato_munzona")["sha256"] == "d" * 64


def test_a_new_extraction_code_version_extracts_again(tmp_path, monkeypatch):
    out = tmp_path / "out"
    sources = sources_for(tmp_path, 2022)
    legislative.update(out, sources)
    monkeypatch.setattr(legislative, "VERSION", legislative.VERSION + 1)

    assert legislative.update(out, sources)[0].startswith("legislative 2022: extracted")


def test_a_tampered_or_missing_output_is_rebuilt_not_trusted(tmp_path):
    out = tmp_path / "out"
    sources = sources_for(tmp_path, 2022)
    legislative.update(out, sources)
    (out / "senador-2022-votos.csv").write_bytes(b"uf\n")

    assert legislative.update(out, sources)[0].startswith("legislative 2022: extracted")
    (out / "senador-2022-totais.csv").unlink()
    assert legislative.update(out, sources)[0].startswith("legislative 2022: extracted")


def test_the_manifest_records_the_revision_each_output_was_built_from(tmp_path):
    out = tmp_path / "out"
    legislative.update(out, sources_for(tmp_path, 2022))

    entry = manifest.read_legislative_manifest(out)["years"]["2022"]

    source = next(s for s in entry["sources"] if s["kind"] == "detalhe_votacao_munzona")
    assert (source["sha256"], source["etag"], source["last_modified"], source["retrieved_at"], source["used"]) == (
        "b" * 64, '"e1"', "Thu, 29 Oct 2026 07:18:04 GMT", "2026-10-29T10:00:00Z", True)
    assert next(s for s in entry["sources"] if s["kind"] == "consulta_cand")["used"] is False
    assert entry["outputs"]["senador-2022-votos.csv"]["rows"] == 2
    assert entry["newest_totalization"] == "2022-10-03T22:00:00"


def test_results_without_any_elected_candidate_are_provisional(tmp_path):
    candidates, detail = uf_rows(2026)
    for row in candidates:
        row["DS_SIT_TOT_TURNO"] = "#NULO"
    candidate_zip, detail_zip = write_zips(tmp_path, 2026, candidates=candidates, detail=detail)

    extraction = legislative.extract_year(candidate_zip, detail_zip, 2026, tmp_path / "out")

    assert legislative.status_of(extraction) == "provisional"
    assert legislative.status_of({"elected": {"senador": 2, "deputado-federal": 513}}) == "final"


# -- check -------------------------------------------------------------------------------------------------------------------------


@pytest.fixture
def built(tmp_path):
    out = tmp_path / "out"
    legislative.update(out, sources_for(tmp_path, 2022))
    return out


def rewrite(out: Path, name: str, transform) -> None:
    """Edits a CSV and then makes the manifest agree with the edit, so only the content identities can notice."""
    rows = read(out, name)
    transform(rows)
    content = csvio.write_rows(list(rows[0]), [list(r.values()) for r in rows])
    (out / name).write_bytes(content)
    recorded = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
    entry = recorded["years"]["2022"]["outputs"][name]
    entry.update(bytes=len(content), sha256=hashlib.sha256(content).hexdigest(), rows=len(rows))
    (out / "manifest.json").write_text(json.dumps(recorded), encoding="utf-8")


def test_check_passes_on_a_fresh_extraction_and_is_silent_when_nothing_was_built(built, tmp_path):
    assert check_legislative(built, KNOWN) == []
    assert check_legislative(tmp_path / "never-built", KNOWN) == []


def test_check_catches_an_edited_file_through_the_manifest_hash(built):
    (built / "senador-2022-votos.csv").write_bytes((built / "senador-2022-votos.csv").read_bytes().replace(b"300", b"301"))

    findings = check_legislative(built, KNOWN)

    assert any("senador-2022-votos.csv: sha256" in str(f) for f in findings)


def test_check_catches_candidate_votes_that_no_longer_match_the_detail_file(built):
    rewrite(built, "senador-2022-votos.csv", lambda rows: rows[0].update(votos_nominais_validos="299"))

    findings = [str(f) for f in check_legislative(built, KNOWN)]

    assert any("candidates_vs_nominais_validos" in f and "candidates 449, detail 450" in f for f in findings)


def test_check_catches_a_turnout_that_does_not_add_up(built):
    rewrite(built, "deputado-federal-2022-totais.csv", lambda rows: rows[0].update(nulos="99"))

    assert any("votos_accounted" in str(f) for f in check_legislative(built, KNOWN))


def test_check_catches_nominal_plus_legend_votes_that_are_not_the_valid_votes(built):
    rewrite(built, "deputado-federal-2022-totais.csv", lambda rows: rows[0].update(legenda_validos="1"))

    assert any("nominais_plus_legenda" in str(f) for f in check_legislative(built, KNOWN))


def test_check_catches_negative_counts(built):
    rewrite(built, "senador-2022-totais.csv", lambda rows: rows[0].update(abstencoes="-1"))

    assert any("negative_totals" in str(f) for f in check_legislative(built, KNOWN))


def test_check_catches_a_municipality_that_is_not_in_cities_csv(built):
    assert any("unknown_city" in str(f) for f in check_legislative(built, {("pi", 99999)}))


def test_check_catches_a_voted_candidate_missing_from_the_candidates_file(built):
    rewrite(built, "senador-2022-candidatos.csv", lambda rows: rows.pop())

    assert any("unknown_candidate" in str(f) for f in check_legislative(built, KNOWN))


def test_check_reports_a_missing_file(built):
    (built / "senador-2022-candidatos.csv").unlink()

    assert [str(f) for f in check_legislative(built, KNOWN)] == ["[legislative_manifest] senador-2022-candidatos.csv is missing"]


def test_fingerprint_depends_on_the_year_the_code_version_and_every_source_hash():
    base = legislative.fingerprint(2022, ["a", "b"])

    assert base == legislative.fingerprint(2022, ["b", "a"])
    assert len({base, legislative.fingerprint(2018, ["a", "b"]), legislative.fingerprint(2022, ["a", "c"])}) == 3
