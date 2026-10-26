"""Scrape the TSE results site (resultados.tse.jus.br) municipality by municipality, with a disk cache.

Each municipality has one signed JSON file per election round (``<uf><cod>-c0001-e00<eleicao>-u.jws``).
The cache keeps the body and its validators next to it, so a rerun only downloads what changed:

- a result the TSE marked as final (``"and": "f"``) is served from disk without any request;
- a partial result is served from disk while the server's ``Cache-Control: max-age`` has not elapsed;
- after that it is revalidated with ``If-None-Match`` / ``If-Modified-Since`` and the server answers 304
  when that city has not moved.
"""
import argparse
import base64
import csv
import http.client
import json
import threading
import time
import urllib.parse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE_URL = "https://resultados.tse.jus.br/oficial"
CYCLE = "ele2026"
PRESIDENT = "0001"
DEFAULT_ELECTIONS = {1: "6257", 2: "6258"}
ALL_UFS = "ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to".split()
CSV_COLUMNS = [
    "turno", "uf", "codigo_municipio", "municipio", "situacao", "secoes_total", "secoes_apuradas",
    "eleitorado", "comparecimento", "votos_validos", "candidato_numero", "candidato", "votos",
]


def decode_jws(text: str) -> dict:
    payload = text.strip().split(".")[1]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)).decode("utf-8"))


def parse_municipality(payload: dict) -> dict:
    candidates = {}
    for group in payload["carg"][0].get("agr", []):
        for party in group.get("par", []):
            for candidate in party.get("cand", []):
                candidates[candidate["n"]] = (candidate["nmu"], int(candidate["vap"]))
    return {
        "status": payload["and"],
        "sections_total": int(payload["s"]["ts"]),
        "sections_counted": int(payload["s"]["st"]),
        "voters": int(payload["e"]["te"]),
        "turnout": int(payload["e"]["c"]),
        "valid_votes": int(payload["v"]["vvc"]),
        "candidates": candidates,
    }


_connections = threading.local()


def keepalive_transport(url: str, headers: dict) -> tuple[int, dict, str]:
    """One persistent HTTPS connection per thread, so a rerun does not pay a TLS handshake per city."""
    parts = urllib.parse.urlsplit(url)
    connection = getattr(_connections, "connection", None)
    if connection is None:
        connection = _connections.connection = http.client.HTTPSConnection(parts.netloc, timeout=60)
    path = parts.path + (f"?{parts.query}" if parts.query else "")
    try:
        connection.request("GET", path, headers={"User-Agent": "videoprep-tse-scrape", **headers})
        response = connection.getresponse()
        body = response.read().decode("utf-8")
    except (OSError, http.client.HTTPException):
        connection.close()
        _connections.connection = None
        raise
    return response.status, dict(response.getheaders()), body


def with_retries(transport, attempts: int = 4, sleep=time.sleep):
    """Retries a transport that raised a network error, waiting longer each time; the last error is re-raised."""

    def retrying(url: str, headers: dict):
        for attempt in range(1, attempts + 1):
            try:
                return transport(url, headers)
            except (OSError, http.client.HTTPException):
                if attempt == attempts:
                    raise
                sleep(2**attempt)

    return retrying


def max_age(headers: dict) -> int:
    """Seconds the server allows the copy to be reused, from ``Cache-Control: max-age=N`` (0 when absent)."""
    for name, value in headers.items():
        if name.lower() == "cache-control":
            for directive in value.split(","):
                key, _, number = directive.strip().partition("=")
                if key == "max-age" and number.isdigit():
                    return int(number)
    return 0


class CachedFetcher:
    """Downloads signed TSE files, reusing a copy on disk whenever the server says it is still current."""

    def __init__(self, cache_dir, transport=None, refresh=False, clock=time.time):
        self.cache_dir = Path(cache_dir)
        self.transport = transport or with_retries(keepalive_transport)
        self.refresh = refresh
        self.clock = clock
        self.stats = Counter(downloaded=0, not_modified=0, final_from_cache=0, fresh_from_cache=0)

    def _paths(self, url: str) -> tuple[Path, Path]:
        name = url.removeprefix(BASE_URL + "/").replace("/", "__").split("?")[0]
        return self.cache_dir / name, self.cache_dir / (name + ".meta.json")

    def get_text(self, url: str) -> str | None:
        body_path, meta_path = self._paths(url)
        cached = body_path.exists() and meta_path.exists() and not self.refresh
        meta = json.loads(meta_path.read_text(encoding="utf-8")) if cached else {}
        if cached and meta.get("final"):
            self.stats["final_from_cache"] += 1
            return body_path.read_text(encoding="utf-8")
        if cached and self.clock() - meta.get("fetched_at", 0) < meta.get("max_age", 0):
            self.stats["fresh_from_cache"] += 1
            return body_path.read_text(encoding="utf-8")
        headers = {}
        if cached and meta.get("etag"):
            headers["If-None-Match"] = meta["etag"]
        if cached and meta.get("last_modified"):
            headers["If-Modified-Since"] = meta["last_modified"]
        status, response_headers, text = self.transport(url, headers)
        if status == 304 and cached:
            self.stats["not_modified"] += 1
            self._write_meta(meta_path, {**meta, "fetched_at": self.clock(), "max_age": max_age(response_headers)})
            return body_path.read_text(encoding="utf-8")
        if status != 200:
            return None
        self.stats["downloaded"] += 1
        body_path.parent.mkdir(parents=True, exist_ok=True)
        body_path.write_text(text, encoding="utf-8")
        self._write_meta(meta_path, {
            "etag": response_headers.get("ETag"),
            "last_modified": response_headers.get("Last-Modified"),
            "final": decode_jws(text).get("and") == "f",
            "fetched_at": self.clock(),
            "max_age": max_age(response_headers),
        })
        return text

    @staticmethod
    def _write_meta(meta_path: Path, meta: dict) -> None:
        meta_path.write_text(json.dumps(meta), encoding="utf-8")

    def get_payload(self, url: str) -> dict | None:
        text = self.get_text(url)
        return None if text is None else decode_jws(text)


def municipality_url(election: str, uf: str, code: str) -> str:
    return f"{BASE_URL}/{CYCLE}/{election}/dados/{uf}/{uf}{code}-c{PRESIDENT}-e00{election}-u.jws"


def list_municipalities(fetcher: CachedFetcher, election: str, ufs) -> list[tuple[str, str, str]]:
    payload = fetcher.get_payload(f"{BASE_URL}/{CYCLE}/{election}/config/mun-e00{election}-cm.jws")
    return [(state["cd"], city["cd"], city["nm"]) for state in payload["abr"] if state["cd"] in ufs for city in state["mu"]]


def scrape_municipalities(fetcher: CachedFetcher, municipalities, elections: dict, workers: int = 8) -> list[dict]:
    """One result per municipality: ``{"uf", "code", "name", "rounds": {turno: parsed or None}}``."""

    def one(municipality):
        uf, code, name = municipality
        rounds = {}
        for turno, election in elections.items():
            payload = fetcher.get_payload(municipality_url(election, uf, code))
            rounds[turno] = None if payload is None else parse_municipality(payload)
        return {"uf": uf, "code": code, "name": name, "rounds": rounds}

    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(one, municipalities))


def to_rows(results: list[dict]) -> list[dict]:
    rows = []
    for result in results:
        for turno, parsed in result["rounds"].items():
            if parsed is None:
                continue
            for number, (name, votes) in parsed["candidates"].items():
                rows.append({
                    "turno": turno, "uf": result["uf"], "codigo_municipio": result["code"], "municipio": result["name"],
                    "situacao": parsed["status"], "secoes_total": parsed["sections_total"],
                    "secoes_apuradas": parsed["sections_counted"], "eleitorado": parsed["voters"],
                    "comparecimento": parsed["turnout"], "votos_validos": parsed["valid_votes"],
                    "candidato_numero": number, "candidato": name, "votos": votes,
                })
    return rows


def write_csv(rows: list[dict], path) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Baixa o resultado de Presidente por município no TSE, com cache.")
    parser.add_argument("--out", default="outbox/tse/presidente_municipios.csv")
    parser.add_argument("--cache-dir", default=".cache/tse")
    parser.add_argument("--ufs", default=",".join(ALL_UFS), help="siglas separadas por vírgula (padrão: todos)")
    parser.add_argument("--turno1", default=DEFAULT_ELECTIONS[1], help="código da eleição do 1º turno")
    parser.add_argument("--turno2", default=DEFAULT_ELECTIONS[2], help="código da eleição do 2º turno")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--refresh", action="store_true", help="ignora o cache, inclusive resultados finais")
    args = parser.parse_args(argv)

    elections = {1: args.turno1, 2: args.turno2}
    fetcher = CachedFetcher(args.cache_dir, refresh=args.refresh)
    municipalities = list_municipalities(fetcher, args.turno2, set(args.ufs.split(",")))
    results = scrape_municipalities(fetcher, municipalities, elections, workers=args.workers)
    rows = to_rows(results)
    write_csv(rows, args.out)
    print(f"{len(municipalities)} municípios, {len(rows)} linhas em {args.out}")
    print(f"cache: {dict(fetcher.stats)}")
    return 0
