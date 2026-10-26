import hashlib
import random
from dataclasses import replace

import pytest

from voto_a_voto.cities import DuplicateSlugError, parse_cities
from voto_a_voto.dataset import (
    CITY_COLUMNS,
    TURNOUT_COLUMNS,
    CandidateRow,
    CityRow,
    Dataset,
    TurnoutRow,
    VoteRow,
    assemble,
    cycle_from_munzona,
    cycle_from_results,
    read_dataset,
    write_dataset,
)
from voto_a_voto.munzona import parse_candidates, parse_city_names, parse_turnout, parse_votes
from voto_a_voto.tse_scrape import decode_jws, parse_municipality


@pytest.fixture
def config_cities(config_jws):
    return parse_cities(decode_jws(config_jws))


@pytest.fixture
def cycle_2026(sao_paulo_round_two, config_cities):
    parsed = parse_municipality(decode_jws(sao_paulo_round_two))
    results = [
        {"uf": "sp", "code": "71072", "name": "SÃO PAULO", "ibge": "3550308", "rounds": {2: parsed}},
        {"uf": "mt", "code": "73709", "name": "BOA ESPERANÇA DO NORTE", "ibge": "5101837", "rounds": {2: parsed}},
    ]
    return cycle_from_results(2026, results)


@pytest.fixture
def cycle_2022(munzona_rows):
    return cycle_from_munzona(
        2022,
        turnout=parse_turnout(munzona_rows("detalhe_votacao_munzona", 2022)),
        votes=parse_votes(munzona_rows("votacao_candidato_munzona", 2022)),
        candidates=parse_candidates(munzona_rows("votacao_candidato_munzona", 2022)),
        names=parse_city_names(munzona_rows("detalhe_votacao_munzona", 2022)),
    )


def test_2026_results_become_turnout_vote_and_candidate_rows(cycle_2026):
    # Real TSE file: São Paulo/SP, round 2: electorate 9,145,969; turnout 7,284,071 = 6,962,277 + 104,890 + 216,904.
    assert TurnoutRow(2026, 2, "sp", 71072, 9145969, 7284071, 1861898, 104890, 216904, 0, 6962277) in cycle_2026.turnout
    assert VoteRow(2026, 2, "sp", 71072, 13, 3864354) in cycle_2026.votes
    assert VoteRow(2026, 2, "sp", 71072, 22, 3097923) in cycle_2026.votes
    assert CandidateRow(2026, 2, 13, "LULA", "PT") in cycle_2026.candidates
    assert CandidateRow(2026, 2, 22, "FLAVIO BOLSONARO", "PL") in cycle_2026.candidates


def test_open_data_becomes_the_same_row_types(cycle_2022):
    assert TurnoutRow(2022, 2, "pi", 10430, 34702, 29050, 5652, 218, 725, 0, 28107) in cycle_2022.turnout
    assert VoteRow(2022, 2, "pi", 10430, 13, 9690 + 11383) in cycle_2022.votes
    assert CandidateRow(2022, 2, 13, "LULA", "PT") in cycle_2022.candidates


def test_a_city_that_exists_only_in_2026_lists_only_that_cycle(cycle_2026, cycle_2022, config_cities):
    dataset = assemble([cycle_2022, cycle_2026], config_cities)

    by_code = {city.cd_municipio: city for city in dataset.cities}
    assert by_code[73709].ciclos == "2026"
    assert by_code[73709].cd_ibge == "5101837"
    assert by_code[71072].ciclos == "2026"
    assert by_code[10430].ciclos == "2022"


def test_cities_present_in_several_cycles_list_them_in_order(cycle_2026, cycle_2022, config_cities, munzona_rows):
    cycle_2018 = cycle_from_munzona(
        2018,
        turnout=parse_turnout(munzona_rows("detalhe_votacao_munzona", 2018)),
        votes=parse_votes(munzona_rows("votacao_candidato_munzona", 2018)),
        candidates=parse_candidates(munzona_rows("votacao_candidato_munzona", 2018)),
        names=parse_city_names(munzona_rows("detalhe_votacao_munzona", 2018)),
    )

    dataset = assemble([cycle_2026, cycle_2022, cycle_2018], config_cities)

    assert {c.cd_municipio: c.ciclos for c in dataset.cities}[29254] == "2018;2022"


def test_an_overseas_post_missing_from_the_2026_config_is_named_from_open_data(cycle_2022, config_cities):
    dataset = assemble([cycle_2022], [city for city in config_cities if city.uf != "zz"])

    caracas = next(c for c in dataset.cities if c.cd_municipio == 29505)
    assert (caracas.uf, caracas.nome, caracas.slug, caracas.regiao, caracas.cd_ibge) == ("zz", "CARACAS", "caracas", "exterior", "")


def test_city_slugs_must_stay_unique_within_a_state_across_all_cycles(cycle_2022, config_cities):
    base = [city for city in config_cities if city.uf != "zz"]
    post = next(city for city in config_cities if city.uf == "zz")
    twins = [replace(post, code="29505", name="CARACAS", slug="caracas"), replace(post, code="29254", name="Caracas", slug="caracas")]

    with pytest.raises(DuplicateSlugError, match="zz/caracas"):
        assemble([cycle_2022], [*base, *twins])


def build(cycle_2026, cycle_2022, config_cities) -> Dataset:
    return assemble([cycle_2026, cycle_2022], config_cities)


def test_rows_are_sorted_by_key_whatever_the_input_order(cycle_2026, cycle_2022, config_cities):
    shuffled = random.Random(7)
    reordered = replace(cycle_2022, votes=shuffled.sample(cycle_2022.votes, len(cycle_2022.votes)), turnout=shuffled.sample(cycle_2022.turnout, len(cycle_2022.turnout)))

    dataset = assemble([cycle_2026, reordered], list(reversed(config_cities)))

    assert dataset == build(cycle_2026, cycle_2022, config_cities)
    assert dataset.votes == sorted(dataset.votes)
    assert [(c.uf, c.cd_municipio) for c in dataset.cities] == sorted((c.uf, c.cd_municipio) for c in dataset.cities)


def test_written_files_are_utf8_lf_with_fixed_columns_and_byte_identical_on_rerun(tmp_path, cycle_2026, cycle_2022, config_cities):
    dataset = build(cycle_2026, cycle_2022, config_cities)

    first = write_dataset(dataset, tmp_path / "a")
    second = write_dataset(dataset, tmp_path / "b")

    for name in ("cities.csv", "turnout.csv", "votes.csv", "candidates.csv"):
        content = (tmp_path / "a" / name).read_bytes()
        assert content == (tmp_path / "b" / name).read_bytes()
        assert b"\r" not in content and content.endswith(b"\n")
        content.decode("utf-8")
    assert first == second
    header = (tmp_path / "a" / "turnout.csv").read_text(encoding="utf-8").splitlines()[0]
    assert header == ",".join(TURNOUT_COLUMNS) == "ano,turno,uf,cd_municipio,aptos,comparecimento,abstencoes,brancos,nulos,anulados_apu_sep,validos"
    assert (tmp_path / "a" / "cities.csv").read_text(encoding="utf-8").splitlines()[0] == ",".join(CITY_COLUMNS) == "uf,cd_municipio,cd_ibge,nome,slug,regiao,ciclos"


def test_write_reports_rows_bytes_and_sha256_of_each_file(tmp_path, cycle_2026, cycle_2022, config_cities):
    dataset = build(cycle_2026, cycle_2022, config_cities)

    files = write_dataset(dataset, tmp_path)

    content = (tmp_path / "votes.csv").read_bytes()
    assert files["votes.csv"] == {"rows": len(dataset.votes), "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()}


def test_a_written_dataset_reads_back_identically(tmp_path, cycle_2026, cycle_2022, config_cities):
    dataset = build(cycle_2026, cycle_2022, config_cities)
    write_dataset(dataset, tmp_path)

    assert read_dataset(tmp_path) == dataset


def test_reading_a_file_with_the_wrong_header_fails_loudly(tmp_path, cycle_2026, cycle_2022, config_cities):
    write_dataset(build(cycle_2026, cycle_2022, config_cities), tmp_path)
    path = tmp_path / "turnout.csv"
    path.write_text(path.read_text(encoding="utf-8").replace("aptos,", "eleitorado,", 1), encoding="utf-8", newline="")

    with pytest.raises(ValueError, match="turnout.csv"):
        read_dataset(tmp_path)
