import io
import json
import zipfile

import pytest

from synthetic_tse import legislative_zip_pair, tse_zip
from voto_a_voto.cli import Services
from voto_a_voto.opendata import StreamResponse
from voto_a_voto.tse_scrape import decode_jws

CDN = "https://cdn.tse.jus.br/estatistica/sead/odsele/{kind}/{kind}_{year}.zip"
SITE = "https://resultados.tse.jus.br/oficial/ele2026/"


class FakeSite:
    """Plays the TSE results site: the config, one signed file per city and round, and the national file."""

    def __init__(self, files: dict[str, str]):
        self.files = files  # path after .../ele2026/ -> body
        self.requests: list[str] = []

    def __call__(self, url, headers):
        self.requests.append(url)
        body = self.files.get(url.removeprefix(SITE))
        if body is None:
            return 404, {}, ""
        return 200, {"ETag": '"1"', "Cache-Control": "max-age=0"}, body


class FakeCdn:
    """Plays the TSE open-data CDN at the streaming seam."""

    def __init__(self, archives: dict[str, bytes]):
        self.archives = archives
        self.requests: list[str] = []

    def __call__(self, url, headers):
        self.requests.append(url)
        body = self.archives[url]
        if "Range" in headers:
            first, _, last = headers["Range"].removeprefix("bytes=").partition("-")
            start, end = int(first), int(last) if last else len(body) - 1
            return StreamResponse(206, {"etag": '"z"', "content-range": f"bytes {start}-{end}/{len(body)}", "cache-control": "max-age=1000"}, iter([body[start:end + 1]]))
        return StreamResponse(200, {"etag": '"z"', "content-length": str(len(body)), "cache-control": "max-age=1000"}, iter([body]))


class FakeIbge:
    """Plays IBGE's mesh metadata service: one list per state code, a centroid for every IBGE city code it is given."""

    def __init__(self, centroids: dict[str, tuple[float, float]]):
        self.centroids = centroids  # 7-digit IBGE code -> (lat, lon)
        self.requests: list[str] = []

    def __call__(self, url, headers):
        self.requests.append(url)
        state = url.split("/estados/")[1].split("/")[0]
        items = [
            {"id": code, "nivel-geografico": "município", "centroide": {"latitude": lat, "longitude": lon}}
            for code, (lat, lon) in sorted(self.centroids.items()) if code.startswith(state)
        ]
        return 200, {}, json.dumps(items)


def scaled_national(payload: dict, factor: int) -> dict:
    """A national file that is `factor` times the city file: valid for a world where every city file is the same."""
    scaled = json.loads(json.dumps(payload))
    for key in ("te", "c", "a"):
        scaled["e"][key] = str(int(payload["e"][key]) * factor)
    for key in ("vvc", "vb", "tvn"):
        scaled["v"][key] = str(int(payload["v"][key]) * factor)
    for group in scaled["carg"][0]["agr"]:
        for party in group["par"]:
            for candidate in party["cand"]:
                candidate["vap"] = str(int(candidate["vap"]) * factor)
    return scaled


@pytest.fixture
def make_site(fixtures_dir, make_jws, config_jws, sao_paulo_round_two):
    def build(status="f") -> tuple[FakeSite, int]:
        config = decode_jws(config_jws)
        city_payload = decode_jws(sao_paulo_round_two)
        city_payload["and"] = status
        files = {"6258/config/mun-e006258-cm.jws": config_jws}
        count = 0
        for state in config["abr"]:
            for city in state["mu"]:
                count += 1
                for election in ("6257", "6258"):
                    uf, code = state["cd"], city["cd"]
                    files[f"{election}/dados/{uf}/{uf}{code}-c0001-e00{election}-u.jws"] = make_jws(city_payload)
        national = scaled_national(decode_jws(sao_paulo_round_two), count)
        for election in ("6257", "6258"):
            files[f"{election}/dados/br/br-c0001-e00{election}-u.jws"] = make_jws(national)
        return FakeSite(files), count

    return build


@pytest.fixture
def fake_cdn(munzona_rows, fixtures_dir):
    """The three zips of each cycle. 2018 and 2022 also carry the trimmed real president rows (``_BR``) next to the synthetic UF member."""
    archives = {}
    for year in (2018, 2022, 2026):
        candidate_zip, detail_zip = legislative_zip_pair(year)
        for kind, built in (("votacao_candidato_munzona", candidate_zip), ("detalhe_votacao_munzona", detail_zip)):
            members = {name: zipfile.ZipFile(io.BytesIO(built)).read(name) for name in zipfile.ZipFile(io.BytesIO(built)).namelist()}
            if year != 2026:
                members[f"{kind}_{year}_BR.csv"] = (fixtures_dir / "munzona" / f"{kind}_{year}_BR_sample.csv").read_bytes()
            archives[CDN.format(kind=kind, year=year)] = tse_zip(members)
        archives[CDN.format(kind="consulta_cand", year=year)] = tse_zip({f"consulta_cand_{year}_BR.csv": b'"X"\r\n'})
    return FakeCdn(archives)


@pytest.fixture
def fake_ibge(config_jws):
    codes = sorted(city["cdi"] for state in decode_jws(config_jws)["abr"] for city in state["mu"] if city.get("cdi"))
    return FakeIbge({code: (-10.0 - index, -50.0 + index) for index, code in enumerate(codes)})


@pytest.fixture
def services(make_site, fake_cdn, fake_ibge):
    """A tiny world: 2026 has 5 Brazilian cities + 3 overseas posts in the config; 2018/2022 come from trimmed real rows."""
    site, _ = make_site()
    return Services(
        fetch_transport=site, stream_transport=fake_cdn, ibge_transport=fake_ibge, published={}, brazilian_cities={2018: 1, 2022: 1, 2026: 5},
        clock=lambda: 1_000_000.0, sleep=lambda seconds: None,
    ), site, fake_cdn
