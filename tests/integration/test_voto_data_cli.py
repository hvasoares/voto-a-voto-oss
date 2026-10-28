import hashlib
import json
from pathlib import Path

import pytest

from voto_a_voto.cli import main
from voto_a_voto.reconcile import NationalTotals

FILES = ("cities.csv", "turnout.csv", "votes.csv", "candidates.csv", "centroids.csv", "manifest.json")


def run(args, services, tmp_path):
    return main([*args, "--data-dir", str(tmp_path / "data"), "--cache-dir", str(tmp_path / "cache")] if args[0] == "build" else [*args, "--data-dir", str(tmp_path / "data")], services=services)


SQUARE = [[-44.0, -22.0], [-43.0, -22.0], [-43.0, -23.0], [-44.0, -23.0], [-44.0, -22.0]]


class FakeOutlineIbge:
    """IBGE's `/malhas/estados/<code>`: one square per state, and a record of what was asked."""

    def __init__(self):
        self.requests = []

    def __call__(self, url, headers):
        self.requests.append(url)
        geometry = {"type": "MultiPolygon", "coordinates": [[SQUARE]]}
        return 200, {}, json.dumps({"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": geometry}]})


def with_outlines(svc):
    """The same services, with the outline transport (the check needs data/geo next to the tables)."""
    from dataclasses import replace

    ibge = FakeOutlineIbge()
    return replace(svc, ibge_transport=ibge), ibge


def run_outlines(svc, tmp_path, *extra):
    return main(["outlines", "--data-dir", str(tmp_path / "data"), "--cache-dir", str(tmp_path / "cache"), *extra], services=svc)


def snapshot(directory: Path) -> dict[str, bytes]:
    return {name: (directory / name).read_bytes() for name in FILES}


def test_build_writes_the_five_tables_and_the_manifest(services, tmp_path, capsys):
    svc, _, _ = services

    code = run(["build"], svc, tmp_path)

    out = capsys.readouterr().out
    assert code == 0
    for name in FILES:
        assert (tmp_path / "data" / name).exists()
    assert "votacao_candidato_munzona_2018.zip: downloaded" in out
    assert "cities.csv: 10 rows" in out
    manifest = json.loads((tmp_path / "data" / "manifest.json").read_text(encoding="utf-8"))
    assert {s["id"] for s in manifest["sources"]} == {
        "votacao_candidato_munzona_2018", "detalhe_votacao_munzona_2018",
        "votacao_candidato_munzona_2022", "detalhe_votacao_munzona_2022", "tse_results_2026", "ibge_malhas_metadados",
    }
    site = next(s for s in manifest["sources"] if s["id"] == "tse_results_2026")
    assert (site["cities"], site["files"], site["final"]) == (8, 8 * 2 + 2 + 1, 8 * 2 + 2)  # config has no "and" marker
    cities = (tmp_path / "data" / "cities.csv").read_text(encoding="utf-8")
    assert "mt,73709,5101837,BOA ESPERANÇA DO NORTE,boa-esperanca-do-norte,centro-oeste,2026" in cities
    assert "pi,10430,,CAMPO MAIOR,campo-maior,nordeste,2018;2022" in cities


def test_a_second_run_changes_nothing_and_downloads_nothing_new(services, tmp_path):
    svc, site, cdn = services
    run(["build"], svc, tmp_path)
    first = snapshot(tmp_path / "data")
    zip_requests = len(cdn.requests)

    code = run(["build"], svc, tmp_path)

    assert code == 0
    assert snapshot(tmp_path / "data") == first
    assert len(cdn.requests) == zip_requests  # still inside max-age: zero requests
    assert site.requests.count("https://resultados.tse.jus.br/oficial/ele2026/6258/dados/sp/sp71072-c0001-e006258-u.jws") == 1  # final: cached


def test_a_clean_cache_gives_the_same_bytes_as_a_warm_one(services, tmp_path):
    svc, _, _ = services
    run(["build"], svc, tmp_path / "a")
    (tmp_path / "b").mkdir()
    run(["build"], svc, tmp_path / "b")

    assert snapshot(tmp_path / "a" / "data") == snapshot(tmp_path / "b" / "data")


def test_offline_with_a_warm_cache_makes_no_requests(services, tmp_path):
    svc, site, cdn = services
    run(["build"], svc, tmp_path)
    requests = len(site.requests) + len(cdn.requests)

    code = run(["build", "--offline"], svc, tmp_path)

    assert code == 0
    assert len(site.requests) + len(cdn.requests) == requests


def test_offline_with_a_cold_cache_fails_and_writes_nothing(services, tmp_path, capsys):
    svc, _, _ = services

    code = run(["build", "--offline"], svc, tmp_path)

    assert code == 1
    assert not (tmp_path / "data").exists()


def test_a_city_that_is_not_final_stops_the_build_and_is_listed(make_site, fake_cdn, services, tmp_path, capsys):
    svc, _, _ = services
    site, _ = make_site(status="p")
    svc.fetch_transport = site

    code = run(["build"], svc, tmp_path)

    assert code == 1
    assert "SÃO PAULO" in capsys.readouterr().err
    assert not (tmp_path / "data").exists()


def test_allow_partial_builds_from_results_that_are_not_final(make_site, services, tmp_path):
    svc, _, _ = services
    site, _ = make_site(status="p")
    svc.fetch_transport = site

    assert run(["build", "--allow-partial"], svc, tmp_path) == 0


def test_a_reconciliation_finding_fails_the_build_without_writing_data(services, tmp_path, capsys):
    svc, _, _ = services
    svc.published = {(2022, 2): NationalTotals(comparecimento=1, source="TSE page")}

    code = run(["build"], svc, tmp_path)

    err = capsys.readouterr().err
    assert code == 1
    assert "national_totals" in err and "2022 turno 2 comparecimento" in err
    assert not (tmp_path / "data").exists()


def test_cycles_limit_the_network_and_the_others_must_already_be_cached(services, tmp_path):
    svc, site, cdn = services
    code = run(["build", "--cycles", "2026"], svc, tmp_path)

    assert code == 1  # 2018/2022 are not cached and not allowed to download
    assert cdn.requests == []


def test_check_passes_on_a_fresh_build(services, tmp_path, capsys):
    svc, _, _ = services
    run(["build"], svc, tmp_path)
    run_outlines(with_outlines(svc)[0], tmp_path)

    code = run(["check"], svc, tmp_path)

    assert code == 0
    assert "data-check OK" in capsys.readouterr().out


def test_check_needs_no_network(services, tmp_path):
    svc, site, cdn = services
    run(["build"], svc, tmp_path)
    requests = len(site.requests) + len(cdn.requests)

    run(["check"], svc, tmp_path)

    assert len(site.requests) + len(cdn.requests) == requests


def test_tampering_with_one_value_makes_check_fail(services, tmp_path, capsys):
    svc, _, _ = services
    run(["build"], svc, tmp_path)
    votes = tmp_path / "data" / "votes.csv"
    lines = votes.read_text(encoding="utf-8").splitlines()
    ano, turno, uf, cd, number, count = lines[1].split(",")
    lines[1] = ",".join([ano, turno, uf, cd, number, str(int(count) + 1)])
    votes.write_text("\n".join(lines) + "\n", encoding="utf-8")

    code = run(["check"], svc, tmp_path)

    assert code == 1
    assert "votes.csv: sha256 differs" in capsys.readouterr().err


def test_a_tampered_value_is_caught_by_the_content_checks_even_if_the_manifest_is_regenerated(services, tmp_path, capsys):
    svc, _, _ = services
    run(["build"], svc, tmp_path)
    data = tmp_path / "data"
    votes = data / "votes.csv"
    lines = votes.read_text(encoding="utf-8").splitlines()
    ano, turno, uf, cd, number, count = lines[1].split(",")
    lines[1] = ",".join([ano, turno, uf, cd, number, str(int(count) + 1)])
    votes.write_text("\n".join(lines) + "\n", encoding="utf-8")
    manifest = json.loads((data / "manifest.json").read_text(encoding="utf-8"))
    content = votes.read_bytes()
    manifest["outputs"]["votes.csv"]["sha256"] = hashlib.sha256(content).hexdigest()
    manifest["outputs"]["votes.csv"]["bytes"] = len(content)
    (data / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

    code = run(["check"], svc, tmp_path)

    assert code == 1
    assert "vote_sums" in capsys.readouterr().err


def test_check_fails_when_there_is_no_manifest(services, tmp_path):
    svc, _, _ = services

    assert run(["check"], svc, tmp_path) == 1


def test_build_adds_the_ibge_centroids_of_the_cities_that_have_an_ibge_code(services, tmp_path, capsys):
    svc, _, _ = services
    run(["build"], svc, tmp_path)

    lines = (tmp_path / "data" / "centroids.csv").read_text(encoding="utf-8").splitlines()
    cities = (tmp_path / "data" / "cities.csv").read_text(encoding="utf-8").splitlines()[1:]

    assert lines[0] == "cd_ibge,lat,lon"
    assert [line.split(",")[0] for line in lines[1:]] == sorted(city.split(",")[2] for city in cities if city.split(",")[2])
    assert "IBGE centroids: 5 municipalities" in capsys.readouterr().out
    source = next(s for s in json.loads((tmp_path / "data" / "manifest.json").read_text(encoding="utf-8"))["sources"] if s["id"] == "ibge_malhas_metadados")
    assert source["rows"] == 5 and source["files"] >= 1


def test_a_second_build_and_an_offline_one_do_not_ask_ibge_again(services, fake_ibge, tmp_path):
    svc, _, _ = services
    run(["build"], svc, tmp_path)
    asked = len(fake_ibge.requests)

    run(["build"], svc, tmp_path)
    run(["build", "--offline"], svc, tmp_path)

    assert len(fake_ibge.requests) == asked


def test_ibge_being_down_fails_the_build_and_writes_nothing(services, tmp_path, capsys):
    svc, _, _ = services
    svc.ibge_transport = lambda url, headers: (503, {}, "")

    code = run(["build"], svc, tmp_path)

    assert code == 1
    assert "IBGE centroids" in capsys.readouterr().err
    assert not (tmp_path / "data").exists()


def test_check_fails_when_a_city_loses_its_centroid(services, tmp_path, capsys):
    svc, _, _ = services
    run(["build"], svc, tmp_path)
    path = tmp_path / "data" / "centroids.csv"
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    path.write_text("".join(lines[:-1]), encoding="utf-8")

    assert run(["check"], svc, tmp_path) == 1
    assert "centroids" in capsys.readouterr().err


def test_check_with_editions_requires_data_to_be_a_published_edition(services, tmp_path, capsys):
    svc, _, _ = services
    run(["build"], svc, tmp_path)
    run_outlines(with_outlines(svc)[0], tmp_path)
    editions_dir = tmp_path / "editions"

    assert main(["check", "--data-dir", str(tmp_path / "data"), "--editions-dir", str(editions_dir)], services=svc) == 1
    assert "make publish-edition" in capsys.readouterr().err

    assert main(["publish-edition", "--data-dir", str(tmp_path / "data"), "--editions-dir", str(editions_dir)], services=svc) == 0
    assert main(["check", "--data-dir", str(tmp_path / "data"), "--editions-dir", str(editions_dir)], services=svc) == 0
    assert main(["publish-edition", "--data-dir", str(tmp_path / "data"), "--editions-dir", str(editions_dir)], services=svc) == 0
    assert "already published" in capsys.readouterr().out


def test_outlines_writes_the_geo_files_asks_the_ibge_once_per_state_and_a_second_run_changes_no_bytes(services, tmp_path, capsys):
    svc, ibge = with_outlines(services[0])

    assert run_outlines(svc, tmp_path) == 0
    first = {p.name: p.read_bytes() for p in (tmp_path / "data" / "geo").iterdir()}
    assert run_outlines(svc, tmp_path) == 0
    second = {p.name: p.read_bytes() for p in (tmp_path / "data" / "geo").iterdir()}

    assert first == second and set(first) == {"uf-outlines.json", "regions.json", "manifest.json"}
    assert len(ibge.requests) == 27
    out = capsys.readouterr().out
    assert "27 states, written" in out and "27 states, unchanged" in out


def test_outlines_offline_fails_without_the_cache_and_names_the_file(services, tmp_path, capsys):
    svc, ibge = with_outlines(services[0])

    assert run_outlines(svc, tmp_path, "--offline") == 1
    assert "uf-11.geojson" in capsys.readouterr().err
    assert ibge.requests == []


def test_check_fails_without_the_outlines_and_says_how_to_make_them(services, tmp_path, capsys):
    svc, _, _ = services
    run(["build"], svc, tmp_path)

    assert run(["check"], svc, tmp_path) == 1
    assert "make data" in capsys.readouterr().err
