"""Municipality centroids from IBGE (imperative shell around a pure parser), for the site's "Usar minha localização".

IBGE's mesh service publishes, per state, the metadata of every municipality of its mesh, centroid included:
``/api/v3/malhas/estados/<code>/metadados?intrarregiao=municipio``. 27 small files are fetched once into
``<cache>/ibge/`` (this data does not change from one run to the next; ``refresh=True`` downloads again) and the
rows go to ``data/centroids.csv``, keyed by the 7-digit IBGE city code the other tables carry as ``cd_ibge``.

Boa Esperança do Norte/MT (5101837), created after the mesh IBGE serves, has no centroid there: it is the one
documented exception (``NO_CENTROID``), so the site never offers it as the nearest city.
"""
import gzip
import hashlib
import http.client
import json
import time
import urllib.parse
from collections.abc import Iterable, Mapping
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from voto_a_voto.dataset import CentroidRow, CityRow, Dataset
from voto_a_voto.opendata import DownloadError
from voto_a_voto.reconcile import Finding
from voto_a_voto.tse_scrape import OfflineCacheMissError, with_retries

__all__ = ["CentroidRow", "check_centroids", "fetch", "parse_state_metadata", "rows_for", "state_codes"]

URL = "https://servicodados.ibge.gov.br/api/v3/malhas/estados/{code}/metadados?intrarregiao=municipio"
NO_CENTROID = {"5101837": "Boa Esperança do Norte/MT was created after the mesh IBGE serves"}
# A centroid must fall inside Brazil's bounding box (Chuí to Oiapoque, Cabo Branco to the Acre border), with a margin.
LAT_RANGE, LON_RANGE = (-34.0, 5.5), (-74.5, -28.0)


def parse_state_metadata(payload: list[dict]) -> dict[str, tuple[float, float]]:
    """``{"3304557": (lat, lon)}`` from one state's metadata list."""
    parsed = {}
    for item in payload:
        try:
            centre = item["centroide"]
            parsed[item["id"]] = (float(centre["latitude"]), float(centre["longitude"]))
        except (KeyError, TypeError, ValueError) as error:
            raise ValueError(f"IBGE metadata {item.get('id', '?')}: no usable centroid") from error
    return parsed


def state_codes(cities: Iterable[CityRow]) -> list[str]:
    """The 2-digit IBGE state codes of the cities that have an IBGE code (overseas posts have none)."""
    return sorted({city.cd_ibge[:2] for city in cities if city.cd_ibge})


def rows_for(cities: Iterable[CityRow], by_code: Mapping[str, tuple[float, float]]) -> list[CentroidRow]:
    """One sorted row per city of the dataset that IBGE has a centroid for."""
    return sorted(CentroidRow(city.cd_ibge, *by_code[city.cd_ibge]) for city in cities if city.cd_ibge in by_code)


def check_centroids(dataset: Dataset) -> list[Finding]:
    """Every city with an IBGE code has a centroid (but the documented exception), and every centroid is a city inside Brazil."""
    codes = {city.cd_ibge for city in dataset.cities if city.cd_ibge}
    have = {row.cd_ibge for row in dataset.centroids}
    findings = [Finding("centroids", f"{code}: city without a centroid") for code in sorted(codes - have - NO_CENTROID.keys())]
    findings += [Finding("centroids", f"{code}: centroid of a city that is not in cities.csv") for code in sorted(have - codes)]
    findings += [
        Finding("centroids", f"{row.cd_ibge}: centroid ({row.lat}, {row.lon}) outside Brazil")
        for row in dataset.centroids
        if not (LAT_RANGE[0] <= row.lat <= LAT_RANGE[1] and LON_RANGE[0] <= row.lon <= LON_RANGE[1])
    ]
    return findings


def ibge_transport(url: str, headers: dict) -> tuple[int, dict, str]:
    """Real transport: one HTTPS request, body decoded as UTF-8."""
    parts = urllib.parse.urlsplit(url)
    connection = http.client.HTTPSConnection(parts.netloc, timeout=60)
    try:
        connection.request("GET", parts.path + f"?{parts.query}", headers={"User-Agent": "voto-a-voto-data", **headers})
        response = connection.getresponse()
        body = response.read()
        if body[:2] == b"\x1f\x8b":  # IBGE gzips even when the request did not ask for it
            body = gzip.decompress(body)
        return response.status, dict(response.getheaders()), body.decode("utf-8")
    finally:
        connection.close()


@dataclass(frozen=True)
class Fetched:
    by_code: dict[str, tuple[float, float]]
    source: dict  # the manifest entry


def fetch(codes: Iterable[str], cache_dir, transport=None, offline: bool = False, refresh: bool = False, clock=None, sleep=None) -> Fetched:
    """The centroids of every municipality of the given states, from the cache or IBGE."""
    transport = transport or with_retries(ibge_transport, sleep=sleep or time.sleep)
    clock = clock or time.time
    directory = Path(cache_dir) / "ibge"
    by_code, lines, retrieved = {}, [], []
    for code in sorted(codes):
        name = f"estado-{code}.json"
        body_path, meta_path = directory / name, directory / (name + ".meta.json")
        if body_path.exists() and meta_path.exists() and not refresh:
            text = body_path.read_text(encoding="utf-8")
            retrieved.append(json.loads(meta_path.read_text(encoding="utf-8"))["retrieved_at"])
        elif offline:
            raise OfflineCacheMissError(f"not in cache (offline run): {name}")
        else:
            status, _, text = transport(URL.format(code=code), {})
            if status != 200:
                raise DownloadError(f"IBGE {URL.format(code=code)}: HTTP {status}")
            moment = datetime.fromtimestamp(clock(), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            directory.mkdir(parents=True, exist_ok=True)
            body_path.write_text(text, encoding="utf-8")
            meta_path.write_text(json.dumps({"retrieved_at": moment}), encoding="utf-8")
            retrieved.append(moment)
        by_code.update(parse_state_metadata(json.loads(text)))
        lines.append(f"{name} {hashlib.sha256(text.encode('utf-8')).hexdigest()}\n")
    source = {
        "id": "ibge_malhas_metadados", "kind": "ibge_api", "url": URL, "files": len(lines), "rows": len(by_code),
        "retrieved_at": max(retrieved, default=None), "digest": hashlib.sha256("".join(lines).encode("utf-8")).hexdigest(),
    }
    return Fetched(by_code, source)
