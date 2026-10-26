"""Resumable, verified download cache for the TSE open-data zips (imperative shell).

``OpenDataCache.fetch(url, member)`` returns a zip on disk that is known good:

- streamed to ``<name>.part`` and resumed with ``Range`` after a dropped connection (a server that answers 200
  instead of 206 makes the partial file be discarded and the download restart);
- the size is checked against ``Content-Length``, the zip must open and contain ``member``, and its SHA-256 is recorded;
- only then is it renamed atomically into place, next to ``<name>.meta.json`` (etag, last-modified, sha256, bytes);
- while the server's ``Cache-Control: max-age`` has not elapsed a second call makes no request; afterwards the file is
  revalidated with ``If-None-Match`` and a 304 downloads nothing;
- 5xx and network errors are retried with backoff, any other 4xx fails at once.
"""
import hashlib
import http.client
import json
import os
import time
import urllib.parse
import zipfile
from collections import Counter
from collections.abc import Callable, Iterable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from voto_a_voto.tse_scrape import OfflineCacheMissError

__all__ = [
    "CachedFile", "DownloadError", "IntegrityError", "OfflineCacheMissError", "OpenDataCache", "StreamResponse",
    "https_stream",
]

READ_SIZE = 1 << 20


class DownloadError(RuntimeError):
    """The server refused (4xx) or kept failing (5xx, network) until the attempts ran out."""


class IntegrityError(DownloadError):
    """The bytes on disk or on the wire do not match what the server promised or what we expect."""


@dataclass
class StreamResponse:
    """What the transport hands back: status, lower-cased headers and a lazily read body."""

    status: int
    headers: dict[str, str]
    body: Iterable[bytes]
    close: Callable[[], None] = field(default=lambda: None)


Transport = Callable[[str, dict], StreamResponse]


@dataclass(frozen=True)
class CachedFile:
    url: str
    path: Path
    sha256: str
    bytes: int
    etag: str | None
    last_modified: str | None
    retrieved_at: str  # ISO 8601 UTC, when the bytes were last downloaded or adopted
    source: str  # downloaded | not_modified | from_cache | adopted


def https_stream(url: str, headers: dict) -> StreamResponse:
    """Real transport: one HTTPS connection per request, body read in 1 MiB chunks."""
    parts = urllib.parse.urlsplit(url)
    connection = http.client.HTTPSConnection(parts.netloc, timeout=60)
    path = parts.path + (f"?{parts.query}" if parts.query else "")
    try:
        connection.request("GET", path, headers={"User-Agent": "voto-a-voto-data", **headers})
        response = connection.getresponse()
    except BaseException:
        connection.close()
        raise

    def chunks():
        while chunk := response.read(READ_SIZE):
            yield chunk

    return StreamResponse(
        response.status, {name.lower(): value for name, value in response.getheaders()}, chunks(), connection.close
    )


def _sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        while chunk := handle.read(READ_SIZE):
            digest.update(chunk)
    return digest.hexdigest()


def _max_age(headers: dict[str, str]) -> int:
    for directive in headers.get("cache-control", "").split(","):
        key, _, number = directive.strip().partition("=")
        if key == "max-age" and number.isdigit():
            return int(number)
    return 0


def _total_size(headers: dict[str, str]) -> int | None:
    """Full size of the file, from ``Content-Range: bytes a-b/total`` (206) or ``Content-Length`` (200)."""
    content_range = headers.get("content-range")
    if content_range:
        total = content_range.rpartition("/")[2]
        return int(total) if total.isdigit() else None
    length = headers.get("content-length")
    return int(length) if length and length.isdigit() else None


class OpenDataCache:
    def __init__(self, cache_dir, transport: Transport = https_stream, clock=time.time, sleep=time.sleep,
                 attempts: int = 4, offline: bool = False):
        self.cache_dir = Path(cache_dir)
        self.transport = transport
        self.clock = clock
        self.sleep = sleep
        self.attempts = attempts
        self.offline = offline
        self.stats = Counter(downloaded=0, not_modified=0, from_cache=0, adopted=0)

    # -- public ---------------------------------------------------------------------------------

    def fetch(self, url: str, member: str) -> CachedFile:
        path, meta_path = self._paths(url)
        if path.exists() and meta_path.exists():
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            self._verify_on_disk(path, meta)
            if self.offline or self.clock() - meta["fetched_at"] < meta.get("max_age", 0):
                return self._result(url, path, meta, "from_cache")
            return self._revalidate(url, member, path, meta_path, meta)
        if self.offline:
            raise OfflineCacheMissError(f"not in cache (offline run): {url}")
        if path.exists():
            adopted = self._adopt(url, member, path, meta_path)
            if adopted is not None:
                return adopted
            path.unlink()
        return self._download(url, member, path, meta_path)

    # -- internals ------------------------------------------------------------------------------

    def _paths(self, url: str) -> tuple[Path, Path]:
        name = url.rsplit("/", 1)[1].split("?")[0]
        return self.cache_dir / name, self.cache_dir / (name + ".meta.json")

    def _result(self, url: str, path: Path, meta: dict, source: str) -> CachedFile:
        self.stats[source] += 1
        return CachedFile(
            url=url, path=path, sha256=meta["sha256"], bytes=meta["bytes"], etag=meta.get("etag"),
            last_modified=meta.get("last_modified"), retrieved_at=meta["retrieved_at"], source=source,
        )

    @staticmethod
    def _verify_on_disk(path: Path, meta: dict) -> None:
        if path.stat().st_size != meta["bytes"] or _sha256_of(path) != meta["sha256"]:
            raise IntegrityError(f"{path} does not match the sha256/size recorded when it was downloaded; delete it (and its .meta.json) to fetch it again")

    @staticmethod
    def _write_meta(meta_path: Path, meta: dict) -> None:
        temporary = meta_path.with_name(meta_path.name + ".tmp")
        temporary.write_text(json.dumps(meta, sort_keys=True), encoding="utf-8")
        os.replace(temporary, meta_path)

    def _iso_now(self) -> str:
        return datetime.fromtimestamp(self.clock(), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    def _revalidate(self, url: str, member: str, path: Path, meta_path: Path, meta: dict) -> CachedFile:
        headers = {}
        if meta.get("etag"):
            headers["If-None-Match"] = meta["etag"]
        if meta.get("last_modified"):
            headers["If-Modified-Since"] = meta["last_modified"]
        return self._download(url, member, path, meta_path, conditional=headers, meta=meta)

    def _adopt(self, url: str, member: str, path: Path, meta_path: Path) -> CachedFile | None:
        """A file already on disk without metadata (e.g. copied from another checkout): probe 1 byte for size and validators."""
        response = self._request(url, {"Range": "bytes=0-0"})
        response.close()
        if _total_size(response.headers) != path.stat().st_size:
            return None
        try:
            self._check_zip(path, member)
        except IntegrityError:
            return None
        meta = {
            "etag": response.headers.get("etag"), "last_modified": response.headers.get("last-modified"),
            "sha256": _sha256_of(path), "bytes": path.stat().st_size, "fetched_at": self.clock(),
            "max_age": _max_age(response.headers), "retrieved_at": self._iso_now(),
        }
        self._write_meta(meta_path, meta)
        return self._result(url, path, meta, "adopted")

    def _request(self, url: str, headers: dict) -> StreamResponse:
        """One request, retried on network errors and 5xx; other statuses (including 304/416) are returned to the caller."""
        last = "no attempt made"
        for attempt in range(1, self.attempts + 1):
            try:
                response = self.transport(url, headers)
            except (OSError, http.client.HTTPException) as error:
                last = f"{type(error).__name__}: {error}"
            else:
                if response.status < 500:
                    if response.status >= 400 and response.status != 416:
                        response.close()
                        raise DownloadError(f"HTTP {response.status} for {url}")
                    return response
                response.close()
                last = f"HTTP {response.status}"
            if attempt < self.attempts:
                self.sleep(2**attempt)
        raise DownloadError(f"{last} for {url} after {self.attempts} attempts")

    def _download(self, url, member, path: Path, meta_path: Path, conditional: dict | None = None, meta: dict | None = None) -> CachedFile:
        path.parent.mkdir(parents=True, exist_ok=True)
        part = path.with_name(path.name + ".part")
        last = "no attempt made"
        for attempt in range(1, self.attempts + 1):
            start = part.stat().st_size if part.exists() else 0
            headers = {"Range": f"bytes={start}-"} if start else dict(conditional or {})
            response = self._request(url, headers)
            try:
                if response.status == 304:
                    new_meta = {**meta, "fetched_at": self.clock(), "max_age": _max_age(response.headers)}
                    self._write_meta(meta_path, new_meta)
                    return self._result(url, path, new_meta, "not_modified")
                if response.status == 416:
                    part.unlink(missing_ok=True)
                    continue
                total = _total_size(response.headers)
                if response.status == 206:
                    mode = "ab"
                else:
                    mode = "wb"  # 200: the server ignored Range (or there was none), start over
                try:
                    with open(part, mode) as handle:
                        for chunk in response.body:
                            handle.write(chunk)
                except (OSError, http.client.HTTPException) as error:
                    last = f"connection dropped at {part.stat().st_size} bytes ({type(error).__name__})"
                    self.sleep(2**attempt)
                    continue
            finally:
                response.close()
            size = part.stat().st_size
            if total is not None and size > total:
                part.unlink()
                raise IntegrityError(f"size mismatch for {url}: got {size} bytes, server promised {total}")
            if total is not None and size < total:
                last = f"size mismatch: got {size} of {total} bytes"
                self.sleep(2**attempt)
                continue
            return self._finish(url, member, part, path, meta_path, response)
        if "size mismatch" in last:
            part.unlink(missing_ok=True)
            raise IntegrityError(f"{last} for {url} after {self.attempts} attempts")
        raise DownloadError(f"{last} for {url} after {self.attempts} attempts")

    def _finish(self, url, member, part: Path, path: Path, meta_path: Path, response: StreamResponse) -> CachedFile:
        try:
            self._check_zip(part, member)
        except IntegrityError:
            part.unlink(missing_ok=True)
            raise
        meta = {
            "etag": response.headers.get("etag"), "last_modified": response.headers.get("last-modified"),
            "sha256": _sha256_of(part), "bytes": part.stat().st_size, "fetched_at": self.clock(),
            "max_age": _max_age(response.headers), "retrieved_at": self._iso_now(),
        }
        os.replace(part, path)
        self._write_meta(meta_path, meta)
        return self._result(url, path, meta, "downloaded")

    @staticmethod
    def _check_zip(path: Path, member: str) -> None:
        try:
            with zipfile.ZipFile(path) as archive:
                if member not in archive.namelist():
                    raise IntegrityError(f"{path.name} has no member {member}")
                bad = archive.testzip()
                if bad is not None:
                    raise IntegrityError(f"{path.name}: member {bad} fails its CRC check")
        except zipfile.BadZipFile as error:
            raise IntegrityError(f"{path.name} is not a valid zip ({error})") from error
