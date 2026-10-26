import json

import pytest

from voto_a_voto.tse_scrape import (
    CSV_COLUMNS,
    CachedFetcher,
    Municipality,
    NonFinalResultsError,
    OfflineCacheMissError,
    check_final,
    decode_jws,
    list_municipalities,
    parse_municipality,
    scrape_municipalities,
    to_rows,
    with_retries,
)

URL = "https://resultados.tse.jus.br/oficial/ele2026/6258/dados/ro/ro00310-c0001-e006258-u.jws"


def municipality_payload(status="p", sections_done=3, valid=1000, lula=600, flavio=400) -> dict:
    return {
        "and": status,
        "s": {"ts": "10", "st": str(sections_done)},
        "e": {"te": "2000", "c": "1100", "a": "900"},
        "v": {"vvc": str(valid), "vb": "60", "vn": "30", "tvn": "40", "vnt": "10"},
        "carg": [
            {
                "agr": [
                    {"par": [{"sg": "PL", "cand": [{"n": "22", "nmu": "FLAVIO BOLSONARO", "vap": str(flavio)}]}]},
                    {"par": [{"sg": "PT", "cand": [{"n": "13", "nmu": "LULA", "vap": str(lula)}]}]},
                ]
            }
        ],
    }


class FakeTransport:
    """Plays the TSE server: serves one body, honours If-None-Match, and counts the calls."""

    def __init__(self, body: str, etag: str = '"v1"', cache_control: str | None = None):
        self.body = body
        self.etag = etag
        self.cache_control = cache_control
        self.calls = []

    def __call__(self, url, headers):
        self.calls.append(dict(headers))
        extra = {"Cache-Control": self.cache_control} if self.cache_control else {}
        if headers.get("If-None-Match") == self.etag:
            return 304, {"ETag": self.etag, **extra}, ""
        return 200, {"ETag": self.etag, "Last-Modified": "Sun, 25 Oct 2026 22:42:30 GMT", **extra}, self.body


@pytest.fixture
def partial_transport(make_jws):
    return FakeTransport(make_jws(municipality_payload(status="p")))


def test_decode_jws_returns_the_payload_dict(make_jws):
    payload = municipality_payload()

    assert decode_jws(make_jws(payload)) == payload


def test_parse_municipality_reads_totals_and_candidate_votes():
    parsed = parse_municipality(municipality_payload(sections_done=3, valid=1000, lula=600, flavio=400))

    assert parsed["sections_total"] == 10
    assert parsed["sections_counted"] == 3
    assert parsed["voters"] == 2000
    assert parsed["turnout"] == 1100
    assert parsed["valid_votes"] == 1000
    assert parsed["candidates"] == {"13": ("LULA", 600), "22": ("FLAVIO BOLSONARO", 400)}


def test_first_request_downloads_and_stores_the_body(tmp_path, partial_transport):
    fetcher = CachedFetcher(tmp_path, transport=partial_transport)

    payload = fetcher.get_payload(URL)

    assert payload["and"] == "p"
    assert len(partial_transport.calls) == 1
    assert "If-None-Match" not in partial_transport.calls[0]


def test_unchanged_partial_result_is_revalidated_and_not_downloaded_again(tmp_path, partial_transport):
    fetcher = CachedFetcher(tmp_path, transport=partial_transport)
    fetcher.get_payload(URL)

    payload = fetcher.get_payload(URL)

    assert payload["and"] == "p"
    assert partial_transport.calls[1]["If-None-Match"] == '"v1"'
    assert fetcher.stats == {"downloaded": 1, "not_modified": 1, "final_from_cache": 0, "fresh_from_cache": 0}


def test_changed_result_replaces_the_cached_body(tmp_path, make_jws):
    first = FakeTransport(make_jws(municipality_payload(valid=1000)), etag='"v1"')
    CachedFetcher(tmp_path, transport=first).get_payload(URL)
    second = FakeTransport(make_jws(municipality_payload(valid=1500)), etag='"v2"')
    fetcher = CachedFetcher(tmp_path, transport=second)

    payload = fetcher.get_payload(URL)

    assert payload["v"]["vvc"] == "1500"
    assert fetcher.stats["downloaded"] == 1


def test_final_result_is_never_requested_again(tmp_path, make_jws):
    transport = FakeTransport(make_jws(municipality_payload(status="f")))
    fetcher = CachedFetcher(tmp_path, transport=transport)
    fetcher.get_payload(URL)

    fetcher.get_payload(URL)

    assert len(transport.calls) == 1
    assert fetcher.stats == {"downloaded": 1, "not_modified": 0, "final_from_cache": 1, "fresh_from_cache": 0}


def test_refresh_ignores_the_cache_for_final_results_too(tmp_path, make_jws):
    transport = FakeTransport(make_jws(municipality_payload(status="f")))
    CachedFetcher(tmp_path, transport=transport).get_payload(URL)
    fetcher = CachedFetcher(tmp_path, transport=transport, refresh=True)

    fetcher.get_payload(URL)

    assert len(transport.calls) == 2


def test_a_missing_municipality_file_is_reported_as_none(tmp_path):
    fetcher = CachedFetcher(tmp_path, transport=lambda url, headers: (404, {}, ""))

    assert fetcher.get_payload(URL) is None


def test_scrape_municipalities_builds_one_row_per_candidate_and_round(tmp_path, make_jws):
    transport = FakeTransport(make_jws(municipality_payload(sections_done=3, lula=600, flavio=400)))
    fetcher = CachedFetcher(tmp_path, transport=transport)
    municipalities = [Municipality(uf="ro", code="00310", name="ALTA FLORESTA D'OESTE", ibge="1100015")]

    results = scrape_municipalities(fetcher, municipalities, elections={1: "6257", 2: "6258"}, workers=1)
    rows = to_rows(results)

    assert len(rows) == 4  # 2 rounds x 2 candidates
    lula_round_two = next(r for r in rows if r["turno"] == 2 and r["candidato_numero"] == "13")
    assert lula_round_two["votos"] == 600
    assert lula_round_two["municipio"] == "ALTA FLORESTA D'OESTE"
    assert lula_round_two["secoes_apuradas"] == 3
    assert lula_round_two["codigo_ibge"] == "1100015"


def test_with_retries_survives_transient_network_errors():
    attempts = []

    def flaky(url, headers):
        attempts.append(url)
        if len(attempts) < 3:
            raise TimeoutError("read timed out")
        return 200, {}, "ok"

    transport = with_retries(flaky, attempts=4, sleep=lambda seconds: None)

    assert transport(URL, {}) == (200, {}, "ok")
    assert len(attempts) == 3


def test_with_retries_gives_up_and_raises_after_the_last_attempt():
    def always_down(url, headers):
        raise TimeoutError("read timed out")

    transport = with_retries(always_down, attempts=2, sleep=lambda seconds: None)

    with pytest.raises(TimeoutError):
        transport(URL, {})


class FakeClock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_result_is_served_without_a_request_while_max_age_has_not_elapsed(tmp_path, make_jws):
    transport = FakeTransport(make_jws(municipality_payload()), cache_control="max-age=30")
    clock = FakeClock()
    fetcher = CachedFetcher(tmp_path, transport=transport, clock=clock)
    fetcher.get_payload(URL)
    clock.now += 29

    fetcher.get_payload(URL)

    assert len(transport.calls) == 1
    assert fetcher.stats["fresh_from_cache"] == 1


def test_result_is_revalidated_once_max_age_has_elapsed(tmp_path, make_jws):
    transport = FakeTransport(make_jws(municipality_payload()), cache_control="max-age=30")
    clock = FakeClock()
    fetcher = CachedFetcher(tmp_path, transport=transport, clock=clock)
    fetcher.get_payload(URL)
    clock.now += 31

    fetcher.get_payload(URL)

    assert len(transport.calls) == 2
    assert transport.calls[1]["If-None-Match"] == '"v1"'
    assert fetcher.stats["not_modified"] == 1


def test_a_304_renews_the_freshness_window(tmp_path, make_jws):
    transport = FakeTransport(make_jws(municipality_payload()), cache_control="max-age=30")
    clock = FakeClock()
    fetcher = CachedFetcher(tmp_path, transport=transport, clock=clock)
    fetcher.get_payload(URL)
    clock.now += 31
    fetcher.get_payload(URL)
    clock.now += 10

    fetcher.get_payload(URL)

    assert len(transport.calls) == 2
    assert fetcher.stats["fresh_from_cache"] == 1


def test_parse_municipality_reads_abstentions_blank_and_total_null_votes(make_jws):
    parsed = parse_municipality(municipality_payload())

    assert parsed["abstentions"] == 900
    assert parsed["blank"] == 60
    # tvn (total nulos) = vn + vnt (technical nulls); only tvn closes the identity with turnout
    assert parsed["null"] == 40


def test_parse_municipality_matches_the_real_sao_paulo_round_two_file(sao_paulo_round_two):
    # Independent source: the TSE file itself (turnout 7,284,071 = valid + blank + null).
    parsed = parse_municipality(decode_jws(sao_paulo_round_two))

    assert (parsed["turnout"], parsed["valid_votes"], parsed["blank"], parsed["null"]) == (7284071, 6962277, 104890, 216904)
    assert (parsed["voters"], parsed["abstentions"]) == (9145969, 1861898)
    assert parsed["status"] == "f"


def test_rows_carry_the_new_count_columns_in_the_declared_order(make_jws):
    result = {
        "uf": "ro", "code": "00310", "name": "X", "ibge": "1100015",
        "rounds": {2: parse_municipality(municipality_payload())},
    }

    row = to_rows([result])[0]

    assert list(row) == CSV_COLUMNS
    assert (row["abstencoes"], row["brancos"], row["nulos"]) == (900, 60, 40)


def test_list_municipalities_includes_overseas_posts_with_empty_ibge_code(tmp_path, make_jws, config_jws):
    transport = FakeTransport(config_jws)
    fetcher = CachedFetcher(tmp_path, transport=transport)

    municipalities = list_municipalities(fetcher, "6258", {"zz", "mt"})

    assert Municipality(uf="mt", code="73709", name="BOA ESPERANÇA DO NORTE", ibge="5101837") in municipalities
    assert Municipality(uf="zz", code="29254", name="ABIDJÃ", ibge="") in municipalities
    assert sum(m.uf == "zz" for m in municipalities) == 3


def final_result(status="f", rounds=(1, 2)):
    parsed = parse_municipality(municipality_payload(status=status))
    return {"uf": "sp", "code": "71072", "name": "SÃO PAULO", "ibge": "3550308", "rounds": {r: parsed for r in rounds}}


def test_check_final_accepts_results_that_are_all_final():
    check_final([final_result()], allow_partial=False)


def test_check_final_lists_every_city_that_is_not_final():
    results = [final_result(), final_result(status="p")]
    results[1]["name"] = "OUTRA"

    with pytest.raises(NonFinalResultsError, match="OUTRA") as error:
        check_final(results, allow_partial=False)

    assert error.value.cities == [("sp", "71072", "OUTRA", 1), ("sp", "71072", "OUTRA", 2)]


def test_check_final_fails_for_a_city_whose_file_is_missing():
    result = final_result()
    result["rounds"][2] = None

    with pytest.raises(NonFinalResultsError):
        check_final([result], allow_partial=False)


def test_check_final_allows_partial_results_when_asked():
    check_final([final_result(status="p")], allow_partial=True)


def test_offline_fetcher_serves_even_a_partial_result_without_any_request(tmp_path, partial_transport):
    CachedFetcher(tmp_path, transport=partial_transport).get_payload(URL)
    offline = CachedFetcher(tmp_path, transport=partial_transport, offline=True)

    payload = offline.get_payload(URL)

    assert payload["and"] == "p"
    assert len(partial_transport.calls) == 1
    assert offline.stats["offline_from_cache"] == 1


def test_offline_fetcher_fails_loudly_when_the_file_is_not_cached(tmp_path, partial_transport):
    offline = CachedFetcher(tmp_path, transport=partial_transport, offline=True)

    with pytest.raises(OfflineCacheMissError, match=URL):
        offline.get_payload(URL)

    assert partial_transport.calls == []


def test_parse_municipality_reads_the_party_of_each_candidate():
    parsed = parse_municipality(municipality_payload())

    assert parsed["parties"] == {"13": "PT", "22": "PL"}


def test_fetcher_remembers_every_file_it_served_for_the_manifest(tmp_path, partial_transport):
    fetcher = CachedFetcher(tmp_path, transport=partial_transport)
    fetcher.get_payload(URL)
    fetcher.get_payload(URL)

    assert fetcher.used == [tmp_path / "ele2026__6258__dados__ro__ro00310-c0001-e006258-u.jws"]
