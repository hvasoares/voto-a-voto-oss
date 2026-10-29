"""`voto-data build` with the legislative data: same cache, same revalidation, nothing re-parsed when nothing changed."""
import json

import io
import zipfile

from synthetic_tse import candidate_csv, detail_csv, tse_zip, uf_rows

from voto_a_voto.cli import main
from voto_a_voto.opendata import StreamResponse

LEGISLATIVE = "data/legislative"


class RevisingCdn:
    """The TSE CDN with revisions: answers 304 to a matching ``If-None-Match`` and otherwise sends the current body and etag."""

    def __init__(self, inner):
        self.inner = inner
        self.etags: dict[str, str] = {}
        self.requests: list[tuple[str, dict]] = []

    def __call__(self, url, headers):
        self.requests.append((url, dict(headers)))
        etag = self.etags.get(url, '"z"')
        if headers.get("If-None-Match") == etag:
            return StreamResponse(304, {"etag": etag, "cache-control": "max-age=1000"}, iter(()))
        response = self.inner(url, {k: v for k, v in headers.items() if k != "If-None-Match"})
        return StreamResponse(response.status, {**response.headers, "etag": etag, "last-modified": "Thu, 29 Oct 2026 07:18:04 GMT"}, response.body)


def with_member(archive: bytes, name: str, content: bytes) -> bytes:
    members = zipfile.ZipFile(io.BytesIO(archive))
    return tse_zip({**{n: members.read(n) for n in members.namelist()}, name: content})


def build(svc, tmp_path, *extra):
    return main(["build", "--data-dir", str(tmp_path / "data"), "--cache-dir", str(tmp_path / "cache"), *extra], services=svc)


def snapshot(tmp_path):
    return {p.name: p.read_bytes() for p in (tmp_path / LEGISLATIVE).iterdir()}


def test_build_writes_legislative_files_for_every_cycle_and_records_their_sources(services, tmp_path, capsys):
    svc, _, _ = services

    assert build(svc, tmp_path) == 0

    out = capsys.readouterr().out
    assert "legislative 2018: extracted 6 files" in out and "legislative 2026: extracted 6 files" in out
    recorded = json.loads((tmp_path / LEGISLATIVE / "manifest.json").read_text(encoding="utf-8"))
    assert sorted(recorded["years"]) == ["2018", "2022", "2026"]
    assert {s["kind"] for s in recorded["years"]["2026"]["sources"]} == {"votacao_candidato_munzona", "detalhe_votacao_munzona", "consulta_cand"}
    assert all(s["etag"] == '"z"' and len(s["sha256"]) == 64 for s in recorded["years"]["2026"]["sources"])
    capsys.readouterr()
    main(["check", "--data-dir", str(tmp_path / "data")], services=svc)  # no outlines in this world: its finding is the only one
    assert "[legislative" not in capsys.readouterr().err


def test_the_president_files_and_manifest_are_the_same_with_and_without_legislative(services, tmp_path):
    svc, _, _ = services
    build(svc, tmp_path / "with")
    build(svc, tmp_path / "without", "--no-legislative")

    for name in ("cities.csv", "turnout.csv", "votes.csv", "candidates.csv", "centroids.csv", "manifest.json"):
        assert (tmp_path / "with" / "data" / name).read_bytes() == (tmp_path / "without" / "data" / name).read_bytes()
    assert not (tmp_path / "without" / "data" / "legislative").exists()


def test_a_second_build_changes_no_byte_and_parses_nothing(services, tmp_path, capsys):
    svc, _, _ = services
    build(svc, tmp_path)
    first = snapshot(tmp_path)
    capsys.readouterr()

    assert build(svc, tmp_path) == 0

    out = capsys.readouterr().out
    assert snapshot(tmp_path) == first
    assert out.count("unchanged, not parsed") == 3 and "extracted" not in out


def test_a_recently_changed_zip_is_revalidated_by_etag_and_only_that_year_is_extracted_again(services, tmp_path, capsys):
    svc, _, cdn = services
    now = [1_000_000.0]
    svc.clock = lambda: now[0]
    revising = RevisingCdn(cdn)
    svc.stream_transport = revising
    build(svc, tmp_path)
    before = snapshot(tmp_path)
    url = "https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip"
    candidates, detail = uf_rows(2022)
    candidates[0]["QT_VOTOS_NOMINAIS"] = candidates[0]["QT_VOTOS_NOMINAIS_VALIDOS"] = 150  # ANA, zone 1: 100 -> 150, and the detail file follows
    detail[0].update(QT_VOTOS_NOMINAIS_VALIDOS=200, QT_TOTAL_VOTOS_VALIDOS=200, QT_VOTOS=212)
    cdn.archives[url] = with_member(cdn.archives[url], "votacao_candidato_munzona_2022_PI.csv", candidate_csv(*candidates))
    cdn.archives[url.replace("votacao_candidato", "detalhe_votacao")] = with_member(
        cdn.archives[url.replace("votacao_candidato", "detalhe_votacao")], "detalhe_votacao_munzona_2022_PI.csv", detail_csv(*detail))
    revising.etags[url] = '"z2"'
    revising.etags[url.replace("votacao_candidato", "detalhe_votacao")] = '"z2"'
    revising.requests.clear()
    now[0] += 10_000  # past every max-age: everything is revalidated
    capsys.readouterr()

    code = build(svc, tmp_path)

    out = capsys.readouterr().out
    conditional = {u: h.get("If-None-Match") for u, h in revising.requests if "If-None-Match" in h}
    assert conditional[url] == '"z"'  # sent with the etag of the revision on disk, through the same cache as the president files
    assert "votacao_candidato_munzona_2022.zip: downloaded" in out
    assert "votacao_candidato_munzona_2018.zip: not_modified" in out
    assert "legislative 2022: extracted" in out and "legislative 2018: unchanged" in out and "legislative 2026: unchanged" in out
    after = snapshot(tmp_path)
    assert code == 0
    assert {name for name in after if after[name] != before[name]} == {
        "manifest.json", "senador-2022-votos.csv", "senador-2022-totais.csv"}


def test_offline_makes_no_request_and_needs_the_legislative_zips_in_the_cache(services, tmp_path):
    svc, _, cdn = services
    assert build(svc, tmp_path, "--offline") == 1
    build(svc, tmp_path)
    requests = len(cdn.requests)

    assert build(svc, tmp_path, "--offline") == 0
    assert len(cdn.requests) == requests
