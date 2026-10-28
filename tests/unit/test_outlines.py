import hashlib
import json

import pytest

from voto_a_voto import outlines
from voto_a_voto.opendata import DownloadError
from voto_a_voto.tse_scrape import OfflineCacheMissError

SQUARE = [[-44.0, -22.0], [-43.0, -22.0], [-43.0, -23.0], [-44.0, -23.0], [-44.0, -22.0]]
ISLET = [[-40.0, -20.0], [-39.99, -20.0], [-39.99, -20.01], [-40.0, -20.01], [-40.0, -20.0]]


def geojson(*polygons, kind="MultiPolygon"):
    """The shape of IBGE's `/malhas/estados/<code>`: one feature, a (Multi)Polygon of rings (each a list of [lon, lat])."""
    coordinates = [[ring] for ring in polygons] if kind == "MultiPolygon" else [polygons[0]]
    return json.dumps({"type": "FeatureCollection", "features": [{"type": "Feature", "geometry": {"type": kind, "coordinates": coordinates}}]})


def test_rings_are_the_outer_rings_of_a_multipolygon_or_a_polygon():
    assert outlines.rings_of(geojson(SQUARE, ISLET)) == [SQUARE, ISLET]
    assert outlines.rings_of(geojson(SQUARE, kind="Polygon")) == [SQUARE]


def test_a_payload_without_geometry_is_rejected():
    with pytest.raises(ValueError, match="33"):
        outlines.rings_of('{"features": []}', code="33")


def test_simplify_drops_points_closer_than_the_tolerance_and_keeps_the_ends():
    ring = [[0.0, 0.0], [0.5, 0.001], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]

    assert outlines.simplify(ring, 0.01) == [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]


def test_outline_keeps_big_rings_and_drops_specks_but_always_keeps_the_largest():
    assert outlines.outline([SQUARE, ISLET]) == [SQUARE]
    assert outlines.outline([ISLET]) == [ISLET]


def test_outline_rounds_to_three_decimals_and_closes_the_ring():
    ring = [[-44.00012, -22.00049], [-43.0, -22.0], [-43.0, -23.0], [-44.0, -23.0], [-44.00012, -22.00049]]

    (rounded,) = outlines.outline([ring])

    assert rounded[0] == [-44.0, -22.0] and rounded[0] == rounded[-1]


def test_build_is_sorted_by_ibge_code_and_deterministic():
    shapes = {"33": [SQUARE], "12": [SQUARE]}

    first, second = outlines.build(shapes), outlines.build(dict(reversed(shapes.items())))

    assert first == second
    assert [item["uf"] for item in json.loads(first)["ufs"]] == ["ac", "rj"]
    assert first.endswith(b"\n")


class FakeIbge:
    def __init__(self, status=200):
        self.status, self.requests = status, []

    def __call__(self, url, headers):
        self.requests.append(url)
        return self.status, {}, geojson(SQUARE)


def test_fetch_caches_each_state_and_a_second_run_asks_nothing(tmp_path):
    ibge = FakeIbge()

    first = outlines.fetch(["12", "33"], tmp_path, transport=ibge, clock=lambda: 5.0)
    second = outlines.fetch(["12", "33"], tmp_path, transport=ibge, clock=lambda: 9.0)

    assert len(ibge.requests) == 2
    assert second.rings == first.rings
    assert second.source == first.source  # the cached retrieval moment, not the clock of the second run
    assert (tmp_path / "ibge" / "uf-12.geojson").exists()


def test_fetch_refresh_downloads_again(tmp_path):
    ibge = FakeIbge()
    outlines.fetch(["12"], tmp_path, transport=ibge)
    outlines.fetch(["12"], tmp_path, transport=ibge, refresh=True)

    assert len(ibge.requests) == 2


def test_fetch_offline_needs_the_cache(tmp_path):
    with pytest.raises(OfflineCacheMissError):
        outlines.fetch(["12"], tmp_path, transport=FakeIbge(), offline=True)


def test_fetch_failure_is_a_download_error(tmp_path):
    with pytest.raises(DownloadError, match="HTTP 503"):
        outlines.fetch(["12"], tmp_path, transport=FakeIbge(status=503))


def test_write_records_the_source_and_the_hash_and_a_second_write_changes_no_bytes(tmp_path):
    fetched = outlines.fetch(list(outlines.UF_BY_CODE)[:2], tmp_path / "cache", transport=FakeIbge(), clock=lambda: 1_700_000_000.0)

    outlines.write(tmp_path / "geo", fetched)
    before = {p.name: p.read_bytes() for p in (tmp_path / "geo").iterdir()}
    outlines.write(tmp_path / "geo", outlines.fetch(list(outlines.UF_BY_CODE)[:2], tmp_path / "cache", transport=FakeIbge(), clock=lambda: 1_800_000_000.0))
    after = {p.name: p.read_bytes() for p in (tmp_path / "geo").iterdir()}

    assert before == after
    manifest = json.loads(before["manifest.json"])
    body = before["uf-outlines.json"]
    assert manifest["outputs"]["uf-outlines.json"] == {"bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(), "ufs": 2}
    assert manifest["sources"][0]["retrieved_at"] == "2023-11-14T22:13:20Z"
    assert manifest["sources"][0]["url"].startswith("https://servicodados.ibge.gov.br/")


def full(tmp_path):
    codes = list(outlines.UF_BY_CODE)
    outlines.write(tmp_path, outlines.fetch(codes, tmp_path / "cache", transport=FakeIbge(), clock=lambda: 1.0))
    return tmp_path


def test_check_passes_for_a_complete_written_set(tmp_path):
    assert outlines.check(full(tmp_path)) == []


def test_check_finds_a_missing_manifest(tmp_path):
    assert [f.check for f in outlines.check(tmp_path)] == ["outlines"]


def test_check_finds_a_changed_file(tmp_path):
    directory = full(tmp_path)
    path = directory / "uf-outlines.json"
    path.write_bytes(path.read_bytes().replace(b"-22.0", b"-22.1", 1))

    assert any("sha256" in finding.message for finding in outlines.check(directory))


def rewrite(directory, change):
    """Edits the shapes AND the manifest hash, so only the content rules can fail."""
    path = directory / "uf-outlines.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    change(data)
    body = (json.dumps(data, separators=(",", ":")) + "\n").encode("utf-8")
    path.write_bytes(body)
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    manifest["outputs"]["uf-outlines.json"].update(bytes=len(body), sha256=hashlib.sha256(body).hexdigest())
    (directory / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")


def test_check_finds_a_missing_shape(tmp_path):
    directory = full(tmp_path)
    rewrite(directory, lambda data: data["ufs"].pop())

    assert any(f.message == "df: shape missing" for f in outlines.check(directory))


def test_check_finds_an_extra_shape_such_as_the_overseas_posts(tmp_path):
    directory = full(tmp_path)
    rewrite(directory, lambda data: data["ufs"].append({"uf": "zz", "code": "99", "rings": [SQUARE]}))

    assert any("zz" in f.message for f in outlines.check(directory))


def test_check_finds_an_open_ring_and_a_point_outside_brazil(tmp_path):
    directory = full(tmp_path)

    def damage(data):
        data["ufs"][0]["rings"][0][-1] = [-44.0, -23.5]
        data["ufs"][1]["rings"][0][1] = [10.0, 50.0]

    rewrite(directory, damage)

    messages = " ".join(f.message for f in outlines.check(directory))
    assert "not closed" in messages and "outside Brazil" in messages


def test_write_commits_the_region_membership_and_lists_it_in_the_manifest(tmp_path):
    directory = full(tmp_path)
    body = (directory / "regions.json").read_bytes()
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))

    assert manifest["outputs"]["regions.json"] == {"bytes": len(body), "regioes": 5, "sha256": hashlib.sha256(body).hexdigest()}
    regioes = json.loads(body)["regioes"]
    assert sorted(regioes) == ["centro-oeste", "nordeste", "norte", "sudeste", "sul"]
    assert sorted(uf for ufs in regioes.values() for uf in ufs) == sorted(outlines.UF_BY_CODE.values())  # 27, each exactly once


def test_check_finds_a_state_in_two_regions_a_missing_one_and_a_changed_file(tmp_path):
    directory = full(tmp_path)
    path = directory / "regions.json"
    original = path.read_bytes()
    manifest_path = directory / "manifest.json"

    def rewrite_regions(change):
        data = json.loads(original)
        change(data["regioes"])
        body = json.dumps(data, separators=(",", ":")).encode("utf-8")
        path.write_bytes(body)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["outputs"]["regions.json"].update(bytes=len(body), sha256=hashlib.sha256(body).hexdigest())
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    rewrite_regions(lambda r: r["sul"].append("sp"))
    assert any("sp: belongs to more than one region" in f.message for f in outlines.check(directory))
    rewrite_regions(lambda r: r["sul"].remove("rs"))
    assert any("rs: belongs to no region" in f.message for f in outlines.check(directory))
    path.write_bytes(original + b" ")
    assert any("differs" in f.message for f in outlines.check(directory))
