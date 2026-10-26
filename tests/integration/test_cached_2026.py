import pytest

from voto_a_voto.tse_scrape import CachedFetcher, DEFAULT_ELECTIONS, list_municipalities, scrape_municipalities

pytestmark = pytest.mark.network_cache

# Independent counts: TSE config for election 6258 lists 5,571 cities and a `zz` block of 186 overseas posts.
CITIES_2026 = 5571
OVERSEAS_POSTS = 186


@pytest.fixture(scope="module")
def results(tse_cache_dir):
    fetcher = CachedFetcher(tse_cache_dir, offline=True)
    ufs = {state["cd"] for state in fetcher.get_payload(
        "https://resultados.tse.jus.br/oficial/ele2026/6258/config/mun-e006258-cm.jws")["abr"]}
    municipalities = list_municipalities(fetcher, "6258", ufs)
    return scrape_municipalities(fetcher, municipalities, DEFAULT_ELECTIONS, workers=4)


def test_every_round_has_all_cities_and_overseas_posts(results):
    for turno in (1, 2):
        present = [r for r in results if r["rounds"][turno] is not None]
        assert len(present) == CITIES_2026 + OVERSEAS_POSTS
        assert sum(r["uf"] == "zz" for r in present) == OVERSEAS_POSTS


def test_valid_blank_and_null_votes_add_up_to_turnout_in_every_city(results):
    offenders = [
        (r["uf"], r["code"], turno)
        for r in results
        for turno, p in r["rounds"].items()
        if p["valid_votes"] + p["blank"] + p["null"] != p["turnout"]
    ]

    assert offenders == []


def test_turnout_and_abstentions_add_up_to_electorate_except_uninstalled_overseas_posts(results):
    offenders = [
        (r["uf"], r["code"], turno)
        for r in results
        for turno, p in r["rounds"].items()
        if p["turnout"] + p["abstentions"] != p["voters"] and not (r["uf"] == "zz" and p["turnout"] == 0)
    ]

    assert offenders == []


def test_the_2026_files_have_no_votes_annulled_in_a_separate_tally(tse_cache_dir):
    from voto_a_voto.tse_scrape import decode_jws

    nonzero = []
    for path in tse_cache_dir.glob("*__dados__??__*.jws"):
        votes = decode_jws(path.read_text(encoding="utf-8"))["v"]
        if any(int(votes[key]) for key in ("van", "vansj", "vsan", "vscv")):
            nonzero.append(path.name)

    assert nonzero == []
