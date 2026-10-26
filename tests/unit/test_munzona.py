import io
import zipfile

import pytest

from voto_a_voto.munzona import (
    Candidate,
    CandidateConflictError,
    MissingColumnError,
    Turnout,
    parse_candidates,
    parse_city_names,
    parse_turnout,
    parse_votes,
    read_rows,
)

# Expected numbers below are read off the real TSE rows (fixtures are trimmed copies), never summed by our code.


def test_votes_sum_the_zones_of_a_city(munzona_rows):
    votes = parse_votes(munzona_rows("votacao_candidato_munzona", 2022))

    # City PI/10430 has zones 96 and 7: Lula 9,690 + 11,383, Bolsonaro 3,418 + 3,616 in round 2.
    assert votes[(2022, 2, "pi", 10430, 13)] == 9690 + 11383
    assert votes[(2022, 2, "pi", 10430, 22)] == 3418 + 3616


def test_votes_keep_overseas_rows_with_uf_zz(munzona_rows):
    votes = parse_votes(munzona_rows("votacao_candidato_munzona", 2022))

    assert votes[(2022, 2, "zz", 29254, 13)] == 26
    assert votes[(2022, 2, "zz", 29254, 22)] == 15


def test_votes_ignore_non_presidential_rows(munzona_rows):
    rows = munzona_rows("votacao_candidato_munzona", 2022)
    other_office = {**rows[0], "CD_CARGO": "3", "NR_CANDIDATO": "99", "QT_VOTOS_NOMINAIS": "123456"}

    votes = parse_votes([*rows, other_office])

    assert not any(key[4] == 99 for key in votes)


def test_the_same_candidate_number_is_a_different_candidate_in_each_cycle(munzona_rows):
    candidates = {
        **parse_candidates(munzona_rows("votacao_candidato_munzona", 2018)),
        **parse_candidates(munzona_rows("votacao_candidato_munzona", 2022)),
    }

    assert candidates[(2018, 2, 13)] == Candidate(nome_urna="FERNANDO HADDAD", partido="PT")
    assert candidates[(2022, 2, 13)] == Candidate(nome_urna="LULA", partido="PT")
    assert candidates[(2018, 2, 17)] == Candidate(nome_urna="JAIR BOLSONARO", partido="PSL")
    assert candidates[(2022, 2, 22)] == Candidate(nome_urna="JAIR BOLSONARO", partido="PL")


def test_candidate_with_two_different_names_in_one_round_is_rejected(munzona_rows):
    rows = munzona_rows("votacao_candidato_munzona", 2022)
    clash = {**rows[0], "NM_URNA_CANDIDATO": "OUTRA PESSOA"}

    with pytest.raises(CandidateConflictError, match="OUTRA PESSOA"):
        parse_candidates([*rows, clash])


def test_turnout_sums_two_zones_in_one_city(munzona_rows):
    turnout = parse_turnout(munzona_rows("detalhe_votacao_munzona", 2022))

    # Round 2, PI/10430: zone 96 + zone 7 (aptos 16,193 + 18,509; blank 102 + 116; null 358 + 367; valid 13,108 + 14,999).
    assert turnout[(2022, 2, "pi", 10430)] == Turnout(
        aptos=16193 + 18509, comparecimento=13568 + 15482, abstencoes=2625 + 3027,
        brancos=102 + 116, nulos=358 + 367, anulados_apu_sep=0, validos=13108 + 14999, nao_instalados=0,
    )


def test_turnout_keeps_an_overseas_post_whose_only_votes_are_null(munzona_rows):
    turnout = parse_turnout(munzona_rows("detalhe_votacao_munzona", 2022))

    caracas = turnout[(2022, 1, "zz", 29505)]
    assert (caracas.comparecimento, caracas.nulos, caracas.validos, caracas.brancos) == (5, 5, 0, 0)


def test_turnout_is_keyed_by_cycle_and_round(munzona_rows):
    turnout = parse_turnout(munzona_rows("detalhe_votacao_munzona", 2018))

    assert {key[:2] for key in turnout} == {(2018, 1), (2018, 2)}


def test_a_missing_column_fails_loudly_with_its_name(munzona_rows):
    rows = [{k: v for k, v in row.items() if k != "QT_VOTOS_BRANCOS"} for row in munzona_rows("detalhe_votacao_munzona", 2022)]

    with pytest.raises(MissingColumnError, match="QT_VOTOS_BRANCOS"):
        parse_turnout(rows)


def test_read_rows_decodes_latin_1_semicolon_csv_from_a_zip_member(tmp_path):
    archive = tmp_path / "x.zip"
    text = '"CD_CARGO";"NM_MUNICIPIO"\r\n"1";"SÃO LUÍS"\r\n'
    with zipfile.ZipFile(archive, "w") as handle:
        handle.writestr("member_BR.csv", text.encode("latin-1"))

    rows = list(read_rows(archive, "member_BR.csv"))

    assert rows == [{"CD_CARGO": "1", "NM_MUNICIPIO": "SÃO LUÍS"}]


def test_city_names_come_from_the_municipality_column_for_brazil_and_overseas(munzona_rows):
    names = parse_city_names(munzona_rows("detalhe_votacao_munzona", 2022))

    assert names[("zz", 29505)] == "CARACAS"
    assert names[("pi", 10430)] == "CAMPO MAIOR"


def test_salvador_zone_18_round_1_2018_closes_with_the_votes_annulled_in_a_separate_tally(fixtures_dir):
    # Real TSE row: comparecimento 63,009 = 51,969 valid + 1,789 blank + 8,505 null + 746 QT_VOTOS_ANULADOS_APU_SEP.
    import csv

    path = fixtures_dir / "munzona" / "detalhe_votacao_munzona_2018_BR_salvador_zona18.csv"
    with open(path, encoding="latin-1", newline="") as handle:
        rows = list(csv.DictReader(handle, delimiter=";"))

    turnout = parse_turnout(rows)[(2018, 1, "ba", 38490)]

    zone_18 = next(r for r in rows if r["NR_ZONA"] == "18")
    assert (zone_18["QT_COMPARECIMENTO"], zone_18["QT_VOTOS_ANULADOS_APU_SEP"]) == ("63009", "746")
    assert turnout.anulados_apu_sep == 746
    assert turnout.validos + turnout.brancos + turnout.nulos + turnout.anulados_apu_sep == turnout.comparecimento
    assert turnout.validos + turnout.brancos + turnout.nulos != turnout.comparecimento
