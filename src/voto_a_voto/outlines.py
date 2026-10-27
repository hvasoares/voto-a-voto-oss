"""The 27 federative-unit outlines for the site's SVG state map (ticket #53; imperative shell around pure functions).

IBGE's mesh service publishes the boundary of a state as one dissolved (Multi)Polygon:
``/api/v3/malhas/estados/<code>`` with ``qualidade=intermediaria`` -- the same service and quality the municipality maps
(#16, #17) are cut from. 27 small files are fetched once into ``<cache>/ibge/`` (``refresh=True`` downloads again), the
outer rings are simplified (Douglas-Peucker), specks are dropped and the result is ONE static file,
``data/geo/uf-outlines.json``, next to ``data/geo/manifest.json`` which records the source, the retrieval date, the
processing parameters and the size and SHA-256 of the file. Same inputs, same bytes: a second run changes nothing.

The file is geography, not results, so it lives outside the six files of an edition (``editions.DATA_FILES``): an
outline refresh never forces a new edition. The overseas posts have no outline (they are not a state).
"""
import gzip
import hashlib
import http.client
import json
import time
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from voto_a_voto.opendata import DownloadError
from voto_a_voto.reconcile import Finding
from voto_a_voto.tse_scrape import OfflineCacheMissError, with_retries

URL = "https://servicodados.ibge.gov.br/api/v3/malhas/estados/{code}?formato=application/vnd.geo%2Bjson&qualidade=intermediaria"
OUTLINES_FILE, MANIFEST_FILE = "uf-outlines.json", "manifest.json"
SCHEMA_VERSION = 1
# IBGE state code -> the dataset's lower-case UF (no overseas: "zz" is not a state).
UF_BY_CODE = {
    "11": "ro", "12": "ac", "13": "am", "14": "rr", "15": "pa", "16": "ap", "17": "to",
    "21": "ma", "22": "pi", "23": "ce", "24": "rn", "25": "pb", "26": "pe", "27": "al", "28": "se", "29": "ba",
    "31": "mg", "32": "es", "33": "rj", "35": "sp", "41": "pr", "42": "sc", "43": "rs", "50": "ms", "51": "mt", "52": "go", "53": "df",
}
# Processing (recorded in the manifest): the map is drawn about 14 px per degree, so 0.06 degrees is under a pixel; the file
# is inlined in the Home page as SVG, so every point costs the phone too (0.015 gave 124 KB, 0.06 gives about 35 KB).
TOLERANCE_DEGREES = 0.06
MIN_RING_AREA_DEG2 = 0.06  # about 700 km2: drops islets, keeps Marajo and Florianopolis' island
DECIMALS = 3  # about 110 m
# Brazil's bounding box (Chui to Oiapoque, Cabo Branco to the Acre border), with a margin.
LAT_RANGE, LON_RANGE = (-34.0, 5.5), (-74.5, -28.0)

Point = list[float]
Ring = list[Point]


def rings_of(text: str, code: str = "?") -> list[Ring]:
    """The outer rings of the (Multi)Polygon of an IBGE state mesh payload (holes are ignored: none changes the picture)."""
    try:
        geometry = json.loads(text)["features"][0]["geometry"]
        polygons = geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]]
        return [polygon[0] for polygon in polygons]
    except (KeyError, IndexError, TypeError, ValueError) as error:
        raise ValueError(f"IBGE state {code}: no usable geometry") from error


def ring_area(ring: Ring) -> float:
    """Absolute shoelace area in square degrees."""
    total = sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(ring, ring[1:]))
    return abs(total) / 2


def _distance(point: Point, start: Point, end: Point) -> float:
    (px, py), (sx, sy), (ex, ey) = point, start, end
    dx, dy = ex - sx, ey - sy
    if dx == dy == 0:
        return ((px - sx) ** 2 + (py - sy) ** 2) ** 0.5
    return abs(dy * px - dx * py + ex * sy - ey * sx) / (dx * dx + dy * dy) ** 0.5


def simplify(ring: Ring, tolerance: float) -> Ring:
    """Douglas-Peucker over an explicit stack (no recursion limit); keeps the first and last point."""
    keep = [False] * len(ring)
    keep[0] = keep[-1] = True
    stack = [(0, len(ring) - 1)]
    while stack:
        first, last = stack.pop()
        far, index = 0.0, None
        for i in range(first + 1, last):
            d = _distance(ring[i], ring[first], ring[last])
            if d > far:
                far, index = d, i
        if index is not None and far > tolerance:
            keep[index] = True
            stack += [(first, index), (index, last)]
    return [point for point, kept in zip(ring, keep) if kept]


def outline(rings: list[Ring]) -> list[Ring]:
    """The rings that are big enough (the largest always), simplified, rounded and closed, biggest first."""
    ranked = sorted(rings, key=lambda ring: (-ring_area(ring), ring[0]))
    kept = [ring for i, ring in enumerate(ranked) if i == 0 or ring_area(ring) >= MIN_RING_AREA_DEG2]
    result = []
    for ring in kept:
        simple = simplify(ring, TOLERANCE_DEGREES)
        if len(simple) < 4:  # a ring smaller than the tolerance collapses: keep it as it is
            simple = ring
        rounded: Ring = []
        for lon, lat in simple:
            point = [round(lon, DECIMALS), round(lat, DECIMALS)]
            if not rounded or rounded[-1] != point:
                rounded.append(point)
        if rounded[0] != rounded[-1]:
            rounded.append(list(rounded[0]))
        result.append(rounded)
    return result


def build(shapes: dict[str, list[Ring]]) -> bytes:
    """The committed file: ``{"ufs": [{"uf", "code", "rings"}...]}`` sorted by IBGE code, compact, one trailing newline."""
    ufs = [{"uf": UF_BY_CODE[code], "code": code, "rings": outline(shapes[code])} for code in sorted(shapes)]
    return (json.dumps({"ufs": ufs}, separators=(",", ":")) + "\n").encode("utf-8")


def ibge_transport(url: str, headers: dict) -> tuple[int, dict, str]:
    """Real transport: one HTTPS request, body decoded as UTF-8."""
    parts = urllib.parse.urlsplit(url)
    connection = http.client.HTTPSConnection(parts.netloc, timeout=60)
    try:
        connection.request("GET", parts.path + f"?{parts.query}", headers={"User-Agent": "voto-a-voto-data", **headers})
        response = connection.getresponse()
        body = response.read()
        if body[:2] == b"\x1f\x8b":
            body = gzip.decompress(body)
        return response.status, dict(response.getheaders()), body.decode("utf-8")
    finally:
        connection.close()


@dataclass(frozen=True)
class Fetched:
    rings: dict[str, list[Ring]]
    source: dict  # the manifest entry


def fetch(codes, cache_dir, transport=None, offline: bool = False, refresh: bool = False, clock=None, sleep=None) -> Fetched:
    """The raw rings of every given state, from the cache or IBGE."""
    transport = transport or with_retries(ibge_transport, sleep=sleep or time.sleep)
    clock = clock or time.time
    directory = Path(cache_dir) / "ibge"
    rings, lines, retrieved = {}, [], []
    for code in sorted(codes):
        name = f"uf-{code}.geojson"
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
        rings[code] = rings_of(text, code)
        lines.append(f"{name} {hashlib.sha256(text.encode('utf-8')).hexdigest()}\n")
    source = {
        "id": "ibge_malhas_uf", "kind": "ibge_api", "url": URL, "files": len(lines),
        "retrieved_at": max(retrieved, default=None), "digest": hashlib.sha256("".join(lines).encode("utf-8")).hexdigest(),
    }
    return Fetched(rings, source)


def manifest_for(body: bytes, fetched: Fetched) -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "sources": [fetched.source],
        "processing": {"decimals": DECIMALS, "min_ring_area_deg2": MIN_RING_AREA_DEG2, "tolerance_degrees": TOLERANCE_DEGREES, "rings": "outer rings only, largest first"},
        "outputs": {OUTLINES_FILE: {"bytes": len(body), "sha256": hashlib.sha256(body).hexdigest(), "ufs": len(fetched.rings)}},
    }


def write(directory, fetched: Fetched) -> bool:
    """Writes the file and then its manifest; returns False (and touches nothing) when both are already these bytes."""
    directory = Path(directory)
    body = build(fetched.rings)
    manifest = (json.dumps(manifest_for(body, fetched), indent=2, sort_keys=True) + "\n").encode("utf-8")
    current = {name: (directory / name).read_bytes() if (directory / name).exists() else None for name in (OUTLINES_FILE, MANIFEST_FILE)}
    if current == {OUTLINES_FILE: body, MANIFEST_FILE: manifest}:
        return False
    directory.mkdir(parents=True, exist_ok=True)
    (directory / OUTLINES_FILE).write_bytes(body)
    (directory / MANIFEST_FILE).write_bytes(manifest)
    return True


def check(directory) -> list[Finding]:
    """Offline validation: the file is the one the manifest hashes, and it holds exactly the 27 states, as closed rings inside Brazil."""
    directory = Path(directory)
    manifest_path, body_path = directory / MANIFEST_FILE, directory / OUTLINES_FILE
    if not manifest_path.exists() or not body_path.exists():
        return [Finding("outlines", f"{directory} has no {MANIFEST_FILE}/{OUTLINES_FILE}; run `make data`")]
    recorded = json.loads(manifest_path.read_text(encoding="utf-8"))["outputs"][OUTLINES_FILE]
    body = body_path.read_bytes()
    findings = []
    if hashlib.sha256(body).hexdigest() != recorded["sha256"]:
        findings.append(Finding("outlines", f"{OUTLINES_FILE}: sha256 differs from {MANIFEST_FILE}"))
    if len(body) != recorded["bytes"]:
        findings.append(Finding("outlines", f"{OUTLINES_FILE}: {len(body)} bytes, {MANIFEST_FILE} says {recorded['bytes']}"))
    ufs = json.loads(body.decode("utf-8"))["ufs"]
    have = [item["uf"] for item in ufs]
    expected = set(UF_BY_CODE.values())
    findings += [Finding("outlines", f"{uf}: shape missing") for uf in sorted(expected - set(have))]
    findings += [Finding("outlines", f"{uf}: shape that is not one of the 27 states") for uf in sorted(set(have) - expected)]
    findings += [Finding("outlines", f"{uf}: drawn more than once") for uf in sorted({uf for uf in have if have.count(uf) > 1})]
    for item in ufs:
        if not item["rings"]:
            findings.append(Finding("outlines", f"{item['uf']}: no ring"))
        for ring in item["rings"]:
            if ring[0] != ring[-1] or len(ring) < 4:
                findings.append(Finding("outlines", f"{item['uf']}: ring not closed"))
            if any(not (LAT_RANGE[0] <= lat <= LAT_RANGE[1] and LON_RANGE[0] <= lon <= LON_RANGE[1]) for lon, lat in ring):
                findings.append(Finding("outlines", f"{item['uf']}: point outside Brazil"))
    return findings
