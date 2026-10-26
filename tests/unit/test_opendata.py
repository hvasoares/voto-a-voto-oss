import hashlib
import io
import json
import zipfile

import pytest

from voto_a_voto.opendata import DownloadError, IntegrityError, OpenDataCache, OfflineCacheMissError, StreamResponse

URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/detalhe_votacao_munzona/detalhe_votacao_munzona_2022.zip"
MEMBER = "detalhe_votacao_munzona_2022_BR.csv"
CHUNK = 500


def make_zip(rows: int = 400) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_STORED) as archive:
        archive.writestr(MEMBER, "".join(f'"{n}";"linha {n}"\r\n' for n in range(rows)))
    return buffer.getvalue()


class FakeServer:
    """Plays the TSE CDN at the streaming transport seam: Range, ETag, 304, and failures on demand."""

    def __init__(self, body: bytes, etag='"v1"', max_age=100):
        self.body = body
        self.etag = etag
        self.max_age = max_age
        self.requests: list[dict] = []
        self.interrupt_first_after: int | None = None  # bytes delivered before the connection drops, first request only
        self.statuses: list[int] = []  # forced statuses for the next requests (consumed in order)
        self.ignore_range = False
        self.declared_length: int | None = None  # lie about Content-Length
        self.extra_bytes = b""  # sent after the body, beyond Content-Length

    def __call__(self, url, headers):
        self.requests.append(dict(headers))
        if self.statuses:
            status = self.statuses.pop(0)
            return StreamResponse(status, {}, iter(()))
        meta = {"etag": self.etag, "last-modified": "Tue, 29 Jul 2025 16:29:08 GMT", "cache-control": f"max-age={self.max_age}"}
        if headers.get("If-None-Match") == self.etag:
            return StreamResponse(304, meta, iter(()))
        start, status = 0, 200
        if "Range" in headers and not self.ignore_range:
            first, _, last = headers["Range"].removeprefix("bytes=").partition("-")
            start, end = int(first), int(last) if last else len(self.body) - 1
            status = 206
            meta["content-range"] = f"bytes {start}-{end}/{len(self.body)}"
        else:
            end = len(self.body) - 1
        payload = self.body[start: end + 1] + self.extra_bytes
        meta["content-length"] = str(self.declared_length if self.declared_length is not None else end + 1 - start)
        interrupt = self.interrupt_first_after if len(self.requests) == 1 else None
        return StreamResponse(status, meta, self._chunks(payload, interrupt))

    @staticmethod
    def _chunks(payload, interrupt):
        limit = len(payload) if interrupt is None else interrupt
        for offset in range(0, limit, CHUNK):
            yield payload[offset: min(offset + CHUNK, limit)]
        if interrupt is not None:
            raise ConnectionResetError("connection dropped")


class FakeClock:
    def __init__(self):
        self.now = 1_000_000.0

    def __call__(self):
        return self.now


@pytest.fixture
def clock():
    return FakeClock()


@pytest.fixture
def server():
    return FakeServer(make_zip())


def cache_for(tmp_path, server, clock, **kwargs):
    return OpenDataCache(tmp_path, transport=server, clock=clock, sleep=lambda seconds: None, **kwargs)


def test_full_download_stores_the_file_and_its_checksum(tmp_path, server, clock):
    cache = cache_for(tmp_path, server, clock)

    result = cache.fetch(URL, member=MEMBER)

    assert result.path.read_bytes() == server.body
    assert result.sha256 == hashlib.sha256(server.body).hexdigest()
    assert result.bytes == len(server.body)
    assert result.source == "downloaded"
    meta = json.loads((tmp_path / (result.path.name + ".meta.json")).read_text(encoding="utf-8"))
    assert (meta["etag"], meta["sha256"], meta["bytes"]) == ('"v1"', result.sha256, len(server.body))
    assert not list(tmp_path.glob("*.part"))


def test_interrupted_download_is_resumed_with_a_range_request(tmp_path, server, clock):
    server.interrupt_first_after = 1500
    cache = cache_for(tmp_path, server, clock)

    result = cache.fetch(URL, member=MEMBER)

    assert result.path.read_bytes() == server.body
    assert server.requests[1]["Range"] == "bytes=1500-"
    assert len(server.requests) == 2


def test_server_that_ignores_range_makes_the_cache_restart_from_scratch(tmp_path, server, clock):
    server.interrupt_first_after = 1500
    server.ignore_range = True
    cache = cache_for(tmp_path, server, clock)

    result = cache.fetch(URL, member=MEMBER)

    assert result.path.read_bytes() == server.body  # not 1500 bytes duplicated at the front


def test_body_longer_than_content_length_is_rejected_and_nothing_is_cached(tmp_path, server, clock):
    server.extra_bytes = b"garbage"
    cache = cache_for(tmp_path, server, clock)

    with pytest.raises(IntegrityError, match="size"):
        cache.fetch(URL, member=MEMBER)

    assert list(tmp_path.iterdir()) == []


def test_body_shorter_than_content_length_after_every_retry_is_rejected(tmp_path, server, clock):
    server.declared_length = len(server.body) + 100
    server.ignore_range = True
    cache = cache_for(tmp_path, server, clock)

    with pytest.raises(IntegrityError, match="size"):
        cache.fetch(URL, member=MEMBER)

    assert not (tmp_path / URL.rsplit("/", 1)[1]).exists()


def test_a_file_that_is_not_a_zip_is_rejected(tmp_path, clock):
    server = FakeServer(b"<html>maintenance page</html>")
    cache = cache_for(tmp_path, server, clock)

    with pytest.raises(IntegrityError, match="zip"):
        cache.fetch(URL, member=MEMBER)

    assert list(tmp_path.iterdir()) == []


def test_a_zip_without_the_expected_member_is_rejected(tmp_path, server, clock):
    cache = cache_for(tmp_path, server, clock)

    with pytest.raises(IntegrityError, match="other_BR.csv"):
        cache.fetch(URL, member="other_BR.csv")

    assert list(tmp_path.iterdir()) == []


def test_server_errors_are_retried_and_client_errors_fail_at_once(tmp_path, server, clock):
    server.statuses = [503, 500]
    result = cache_for(tmp_path, server, clock).fetch(URL, member=MEMBER)
    assert result.path.read_bytes() == server.body
    assert len(server.requests) == 3

    missing = FakeServer(b"")
    missing.statuses = [404]
    with pytest.raises(DownloadError, match="404"):
        cache_for(tmp_path / "other", missing, clock).fetch(URL, member=MEMBER)
    assert len(missing.requests) == 1


def test_gives_up_after_the_last_attempt_on_persistent_server_errors(tmp_path, server, clock):
    server.statuses = [503] * 10
    cache = cache_for(tmp_path, server, clock, attempts=3)

    with pytest.raises(DownloadError, match="503"):
        cache.fetch(URL, member=MEMBER)

    assert len(server.requests) == 3


def test_unchanged_second_call_makes_zero_requests_while_max_age_has_not_elapsed(tmp_path, server, clock):
    cache = cache_for(tmp_path, server, clock)
    cache.fetch(URL, member=MEMBER)
    clock.now += 99

    result = cache.fetch(URL, member=MEMBER)

    assert len(server.requests) == 1
    assert result.source == "from_cache"


def test_after_max_age_the_cache_revalidates_and_does_not_download_again(tmp_path, server, clock):
    cache = cache_for(tmp_path, server, clock)
    cache.fetch(URL, member=MEMBER)
    clock.now += 101

    result = cache.fetch(URL, member=MEMBER)

    assert len(server.requests) == 2
    assert server.requests[1]["If-None-Match"] == '"v1"'
    assert result.source == "not_modified"
    assert result.path.read_bytes() == server.body


def test_changed_file_is_downloaded_again_after_max_age(tmp_path, server, clock):
    cache_for(tmp_path, server, clock).fetch(URL, member=MEMBER)
    clock.now += 101
    reissued = FakeServer(make_zip(rows=450), etag='"v2"')

    result = cache_for(tmp_path, reissued, clock).fetch(URL, member=MEMBER)

    assert result.source == "downloaded"
    assert result.path.read_bytes() == reissued.body
    assert result.sha256 == hashlib.sha256(reissued.body).hexdigest()


def test_a_corrupted_cached_file_is_reported_not_silently_used(tmp_path, server, clock):
    cache = cache_for(tmp_path, server, clock)
    result = cache.fetch(URL, member=MEMBER)
    with open(result.path, "r+b") as handle:
        handle.write(b"XXXX")

    with pytest.raises(IntegrityError, match="sha256"):
        cache.fetch(URL, member=MEMBER)


def test_existing_file_without_metadata_is_adopted_after_a_one_byte_probe(tmp_path, server, clock):
    (tmp_path / URL.rsplit("/", 1)[1]).write_bytes(server.body)
    cache = cache_for(tmp_path, server, clock)

    result = cache.fetch(URL, member=MEMBER)

    assert result.source == "adopted"
    assert server.requests == [{"Range": "bytes=0-0"}]
    assert result.sha256 == hashlib.sha256(server.body).hexdigest()


def test_existing_file_of_the_wrong_size_is_replaced_not_adopted(tmp_path, server, clock):
    (tmp_path / URL.rsplit("/", 1)[1]).write_bytes(b"truncated")
    cache = cache_for(tmp_path, server, clock)

    result = cache.fetch(URL, member=MEMBER)

    assert result.source == "downloaded"
    assert result.path.read_bytes() == server.body


def test_offline_uses_the_cached_file_and_never_calls_the_server(tmp_path, server, clock):
    cache_for(tmp_path, server, clock).fetch(URL, member=MEMBER)
    clock.now += 10_000
    offline = cache_for(tmp_path, server, clock, offline=True)

    result = offline.fetch(URL, member=MEMBER)

    assert result.source == "from_cache"
    assert len(server.requests) == 1


def test_offline_without_a_cached_file_fails_loudly(tmp_path, server, clock):
    offline = cache_for(tmp_path, server, clock, offline=True)

    with pytest.raises(OfflineCacheMissError):
        offline.fetch(URL, member=MEMBER)

    assert server.requests == []


def test_the_cache_directory_is_created_when_it_does_not_exist(tmp_path, server, clock):
    cache = cache_for(tmp_path / "not" / "yet", server, clock)

    result = cache.fetch(URL, member=MEMBER)

    assert result.path.read_bytes() == server.body
