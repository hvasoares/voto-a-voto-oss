import hashlib
import json

import pytest

from voto_a_voto import centroids
from voto_a_voto.centroids import CentroidRow, check_centroids, parse_state_metadata
from voto_a_voto.dataset import CityRow, Dataset
from voto_a_voto.opendata import DownloadError
from voto_a_voto.tse_scrape import OfflineCacheMissError


def metadata(*items):
    """The shape of IBGE's `/malhas/estados/<uf>/metadados?intrarregiao=municipio`."""
    return json.dumps([{"id": i, "nivel-geografico": "município", "centroide": {"longitude": lon, "latitude": lat}} for i, lat, lon in items])


def city(ibge, uf="rj", cd=1):
    return CityRow(uf, cd, ibge, f"C{ibge}", f"c{ibge}", "sudeste", "2026")


def test_parse_reads_one_centroid_per_municipality_code():
    payload = json.loads(metadata(("3304557", -22.9255, -43.458), ("3303500", -22.5, -43.1)))

    assert parse_state_metadata(payload) == {"3304557": (-22.9255, -43.458), "3303500": (-22.5, -43.1)}


def test_parse_rejects_an_entry_without_a_centroid():
    with pytest.raises(ValueError, match="3304557"):
        parse_state_metadata([{"id": "3304557"}])


def test_rows_are_sorted_by_ibge_code_and_only_for_cities_of_the_dataset():
    by_code = {"3304557": (-22.9255, -43.458), "3300100": (-22.9, -44.4), "9999999": (0.0, 0.0)}

    rows = centroids.rows_for([city("3304557"), city("3300100", cd=2), city("", uf="zz", cd=3)], by_code)

    assert rows == [CentroidRow("3300100", -22.9, -44.4), CentroidRow("3304557", -22.9255, -43.458)]


def test_state_codes_come_from_the_ibge_codes_of_the_cities():
    assert centroids.state_codes([city("3304557"), city("3300100", cd=2), city("5101837", uf="mt", cd=3), city("", uf="zz", cd=4)]) == ["33", "51"]


class FakeIbge:
    def __init__(self, bodies, status=200):
        self.bodies, self.status, self.requests = bodies, status, []

    def __call__(self, url, headers):
        self.requests.append(url)
        code = url.split("/estados/")[1].split("/")[0]
        return self.status, {}, self.bodies.get(code, "[]")


def test_fetch_caches_each_state_and_a_second_run_asks_nothing(tmp_path):
    ibge = FakeIbge({"33": metadata(("3304557", -22.9255, -43.458))})

    first = centroids.fetch(["33"], tmp_path, transport=ibge, clock=lambda: 5.0)
    second = centroids.fetch(["33"], tmp_path, transport=ibge, clock=lambda: 9.0)

    assert len(ibge.requests) == 1
    assert first.by_code == second.by_code == {"3304557": (-22.9255, -43.458)}
    assert first.source == second.source  # the recorded retrieval time is the first download's


def test_fetch_source_describes_files_rows_and_a_digest_of_the_bytes(tmp_path):
    body = metadata(("3304557", -22.9255, -43.458))
    result = centroids.fetch(["33"], tmp_path, transport=FakeIbge({"33": body}), clock=lambda: 1_000_000.0)

    assert result.source["id"] == "ibge_malhas_metadados"
    assert (result.source["files"], result.source["rows"]) == (1, 1)
    line = f"estado-33.json {hashlib.sha256(body.encode()).hexdigest()}\n"
    assert result.source["digest"] == hashlib.sha256(line.encode()).hexdigest()
    assert result.source["retrieved_at"] == "1970-01-12T13:46:40Z"


def test_fetch_offline_without_the_cache_fails_naming_the_file(tmp_path):
    with pytest.raises(OfflineCacheMissError, match="estado-33"):
        centroids.fetch(["33"], tmp_path, transport=FakeIbge({}), offline=True)


def test_fetch_fails_when_ibge_refuses(tmp_path):
    with pytest.raises(DownloadError, match="HTTP 503"):
        centroids.fetch(["33"], tmp_path, transport=FakeIbge({}, status=503))


def dataset(cities, rows):
    return Dataset(cities=cities, turnout=[], votes=[], candidates=[], centroids=rows)


def test_check_passes_when_every_brazilian_city_has_its_centroid():
    assert check_centroids(dataset([city("3304557"), city("", uf="zz", cd=2)], [CentroidRow("3304557", -22.9, -43.4)])) == []


def test_check_names_a_city_without_a_centroid_and_a_centroid_without_a_city():
    findings = check_centroids(dataset([city("3304557")], [CentroidRow("3300100", -22.9, -43.4)]))

    assert sorted(f.message.split(":")[0] for f in findings) == ["3300100", "3304557"]


def test_check_allows_the_documented_exception_boa_esperanca_do_norte():
    assert check_centroids(dataset([city("5101837", uf="mt")], [])) == []


@pytest.mark.parametrize("lat,lon", [(10.0, -43.0), (-22.0, -20.0), (-40.0, -43.0), (-22.0, -80.0)])
def test_check_rejects_a_centroid_outside_brazil(lat, lon):
    findings = check_centroids(dataset([city("3304557")], [CentroidRow("3304557", lat, lon)]))

    assert len(findings) == 1 and "outside Brazil" in findings[0].message


def test_the_real_transport_unzips_what_ibge_zips_anyway(monkeypatch):
    import gzip

    body = gzip.compress(metadata(("3304557", -22.9, -43.4)).encode("utf-8"))

    class Response:
        status = 200

        def read(self):
            return body

        def getheaders(self):
            return [("Content-Encoding", "gzip")]

    class Connection:
        def __init__(self, *args, **kwargs): ...
        def request(self, *args, **kwargs): ...
        def getresponse(self):
            return Response()
        def close(self): ...

    monkeypatch.setattr(centroids.http.client, "HTTPSConnection", Connection)

    status, _, text = centroids.ibge_transport(centroids.URL.format(code="33"), {})

    assert status == 200 and json.loads(text)[0]["id"] == "3304557"
