import json
import pytest

from voto_a_voto import editions, publishing
from voto_a_voto.cli import BuildOptions, Services
from voto_a_voto.publishing import options_builder, run_gate
from voto_a_voto.tse_scrape import decode_jws


@pytest.fixture
def paths(tmp_path):
    return tmp_path / "data", tmp_path / "editions", tmp_path / "cache"


def gate(services, paths):
    data, published, cache = paths
    return run_gate(options_builder(BuildOptions(data_dir=data, cache_dir=cache), services), data, published, cache)


def tree(directory):
    return {str(p.relative_to(directory)): p.read_bytes() for p in sorted(directory.rglob("*")) if p.is_file()} if directory.exists() else {}


def test_final_valid_deterministic_data_publishes_itself_as_a_new_edition_with_its_checks(services, paths):
    svc, _, _ = services

    outcome = gate(svc, paths)

    assert outcome.result == "published"
    edition = editions.load_editions(paths[1])[outcome.edition]
    assert edition["publication"]["mode"] == "automatic"
    assert [(c["name"], c["ok"]) for c in edition["publication"]["checks"]] == [
        (publishing.CHECK_FINAL, True), (publishing.CHECK_SCHEMA, True), (publishing.CHECK_NATIONAL, True), (publishing.CHECK_DETERMINISM, True),
    ]
    assert editions.check_editions(paths[1], paths[0]) == []
    assert json.loads((paths[1] / "status.json").read_text(encoding="utf-8"))["result"] == "published"


def test_running_again_with_nothing_new_publishes_nothing(services, paths):
    svc, _, _ = services
    gate(svc, paths)
    before = tree(paths[1])

    outcome = gate(svc, paths)

    assert outcome.result == "unchanged"
    assert tree(paths[1]) == before


def test_data_that_is_not_final_is_never_published(make_site, fake_cdn, fake_ibge, paths):
    site, _ = make_site(status="p")  # the fixture of partial data: the TSE has not marked the results final
    svc = Services(fetch_transport=site, stream_transport=fake_cdn, ibge_transport=fake_ibge, published={}, brazilian_cities={2018: 1, 2022: 1, 2026: 5},
                   clock=lambda: 1_000_000.0, sleep=lambda seconds: None)

    outcome = gate(svc, paths)

    assert outcome.result == "rejected"
    assert [(c.name, c.ok) for c in outcome.checks] == [(publishing.CHECK_FINAL, False)]
    assert not paths[0].exists()  # data/ untouched
    assert editions.load_editions(paths[1]) == {}
    status = json.loads((paths[1] / "status.json").read_text(encoding="utf-8"))
    assert status["result"] == "rejected" and "sem resultado final" in status["checks"][0]["detail"]


def test_a_national_total_that_differs_from_the_tse_publishes_nothing_and_records_why(services, make_jws, paths):
    svc, site, _ = services
    for key in [k for k in site.files if "/dados/br/" in k]:
        payload = decode_jws(site.files[key])
        payload["v"]["vvc"] = str(int(payload["v"]["vvc"]) + 1)  # the TSE's own national file says one more valid vote
        site.files[key] = make_jws(payload)

    outcome = gate(svc, paths)

    assert outcome.result == "rejected"
    assert [c.name for c in outcome.checks if not c.ok] == [publishing.CHECK_NATIONAL]
    assert not paths[0].exists()
    assert editions.load_editions(paths[1]) == {}
    assert json.loads((paths[1] / "status.json").read_text(encoding="utf-8"))["result"] == "rejected"


def test_non_deterministic_builds_publish_nothing(services, paths):
    svc, _, _ = services
    real = options_builder(BuildOptions(data_dir=paths[0], cache_dir=paths[2]), svc)

    def flaky(offline):
        result = real(offline)
        if offline:
            result.manifest = {**result.manifest, "identity": [*result.manifest["identity"], {"extra": 1}]}
        return result

    outcome = run_gate(flaky, paths[0], paths[1], paths[2])

    assert outcome.result == "rejected"
    assert [(c.name, c.ok) for c in outcome.checks if not c.ok] == [(publishing.CHECK_DETERMINISM, False)]
    assert editions.load_editions(paths[1]) == {}


def test_a_rolled_back_data_dir_is_not_undone_by_the_next_run(services, paths):
    svc, _, _ = services
    gate(svc, paths)
    first = editions.load_editions(paths[1])
    older = tree(paths[0])
    # a later (different) edition, then a rollback to the first
    (paths[0] / "votes.csv").write_text((paths[0] / "votes.csv").read_text(encoding="utf-8") + "2026,1,sp,71072,99,1\n", encoding="utf-8")
    editions.publish(paths[0], paths[1], date="2099-01-01")
    editions.rollback(paths[1], paths[0])
    assert tree(paths[0]) == older and len(first) == 1

    outcome = gate(svc, paths)  # the real source still gives the first dataset

    assert outcome.result == "unchanged"
    assert tree(paths[0]) == older


def test_the_command_exits_1_and_names_the_reason_file_when_it_rejects(make_site, fake_cdn, fake_ibge, paths, capsys):
    from voto_a_voto.cli import main

    site, _ = make_site(status="p")
    svc = Services(fetch_transport=site, stream_transport=fake_cdn, ibge_transport=fake_ibge, published={}, brazilian_cities={2018: 1, 2022: 1, 2026: 5},
                   clock=lambda: 1_000_000.0, sleep=lambda seconds: None)
    data, published, cache = paths

    code = main(["publish-auto", "--data-dir", str(data), "--editions-dir", str(published), "--cache-dir", str(cache)], services=svc)

    assert code == 1
    captured = capsys.readouterr()
    assert "FAIL Dados finais, não ao vivo" in captured.out
    assert "status.json" in captured.err


def test_the_command_publishes_and_then_reports_nothing_new(services, paths, capsys):
    from voto_a_voto.cli import main

    svc, _, _ = services
    data, published, cache = paths
    args = ["publish-auto", "--data-dir", str(data), "--editions-dir", str(published), "--cache-dir", str(cache)]

    assert main(args, services=svc) == 0
    assert "published" in capsys.readouterr().out
    assert main(args, services=svc) == 0
    assert "nothing to publish" in capsys.readouterr().out
