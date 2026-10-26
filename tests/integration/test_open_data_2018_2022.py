"""Real TSE open-data zips in .cache/tse-opendata against the old repo's committed regression oracle."""
import csv
from collections import Counter

import pytest

from voto_a_voto.munzona import parse_candidates, parse_turnout, parse_votes, read_rows

pytestmark = pytest.mark.network_cache

# Independent count: the TSE has 5,570 municipalities in 2018 and 2022 (the 2026 Boa Esperança do Norte/MT did not exist).
BRAZILIAN_CITIES = 5570


def zip_path(cache_dir, kind, year):
    path = cache_dir / f"{kind}_{year}.zip"
    if not path.exists():
        pytest.skip(f"{path.name} not cached")
    return path


@pytest.fixture(scope="module", params=[2018, 2022])
def year(request):
    return request.param


@pytest.fixture(scope="module")
def parsed_votes(opendata_cache_dir, year):
    path = zip_path(opendata_cache_dir, "votacao_candidato_munzona", year)
    rows = list(read_rows(path, f"votacao_candidato_munzona_{year}_BR.csv"))
    return parse_votes(rows), parse_candidates(rows), rows


@pytest.fixture(scope="module")
def parsed_turnout(opendata_cache_dir, year):
    path = zip_path(opendata_cache_dir, "detalhe_votacao_munzona", year)
    return parse_turnout(read_rows(path, f"detalhe_votacao_munzona_{year}_BR.csv"))


def test_votes_reproduce_the_old_repos_municipality_oracle_for_every_brazilian_city(opendata_cache_dir, year, parsed_votes):
    oracle_path = opendata_cache_dir / f"presidente_{year}_municipios.csv"
    if not oracle_path.exists():
        pytest.skip("regression oracle not cached")
    with open(oracle_path, encoding="utf-8", newline="") as handle:
        oracle = {(year, int(r["turno"]), r["uf"], int(r["cd_municipio"]), int(r["candidato_numero"])): int(r["votos"])
                  for r in csv.DictReader(handle)}
    votes, _, _ = parsed_votes

    brazilian = {key: value for key, value in votes.items() if key[2] != "zz"}

    assert brazilian == oracle


def test_every_round_has_5570_brazilian_cities_in_votes_and_turnout(parsed_votes, parsed_turnout, year):
    votes, _, _ = parsed_votes

    for source in (votes, parsed_turnout):
        cities = Counter(key[1] for key in {key[:4] for key in source if key[2] != "zz"})
        assert cities == {1: BRAZILIAN_CITIES, 2: BRAZILIAN_CITIES}


def test_raw_vote_rows_have_no_duplicate_zone_candidate_keys(parsed_votes):
    *_, rows = parsed_votes

    keys = Counter(
        (r["NR_TURNO"], r["SG_UF"], r["CD_MUNICIPIO"], r["NR_ZONA"], r["NR_CANDIDATO"]) for r in rows if r["CD_CARGO"] == "1"
    )

    assert [key for key, count in keys.items() if count > 1] == []


def test_runoff_valid_votes_equal_the_two_candidates_sum_in_every_city(parsed_votes, parsed_turnout):
    votes, _, _ = parsed_votes
    runoff = Counter()
    for (ano, turno, uf, city, _), value in votes.items():
        if turno == 2:
            runoff[(ano, turno, uf, city)] += value

    offenders = [key for key, turnout in parsed_turnout.items() if key[1] == 2 and runoff[key] != turnout.validos]

    assert offenders == []
