import pytest

from voto_a_voto.dataset import CityRow, Dataset, TurnoutRow, VoteRow
from voto_a_voto.reconcile import (
    NationalTotals,
    aggregate,
    check_aggregates,
    check_cities,
    check_city_codes,
    check_national_totals,
    check_turnout_identity,
    check_vote_sums,
)


def city(uf, cd, cycles="2026"):
    return CityRow(uf, cd, "" if uf == "zz" else str(cd), f"CIDADE {cd}", f"cidade-{cd}", {"ac": "norte", "rj": "sudeste", "zz": "exterior"}[uf], cycles)


def turnout(turno, uf, cd, aptos=100, comparecimento=80, abstencoes=20, brancos=5, nulos=5, validos=70, ano=2026, anulados=0):
    return TurnoutRow(ano, turno, uf, cd, aptos, comparecimento, abstencoes, brancos, nulos, anulados, validos)


@pytest.fixture
def dataset():
    cities = [city("ac", 1), city("rj", 2), city("zz", 3)]
    rows = [turnout(turno, uf, cd) for turno in (1, 2) for uf, cd in (("ac", 1), ("rj", 2), ("zz", 3))]
    votes = [VoteRow(2026, turno, uf, cd, number, votes) for turno in (1, 2) for uf, cd in (("ac", 1), ("rj", 2), ("zz", 3)) for number, votes in ((13, 40), (22, 30))]
    return Dataset(cities=cities, turnout=rows, votes=votes, candidates=[])


def test_a_consistent_dataset_has_no_findings(dataset):
    assert check_turnout_identity(dataset) == []
    assert check_vote_sums(dataset) == []
    assert check_cities(dataset, brazilian_cities={2026: 2}) == []
    assert check_city_codes(dataset) == []
    assert check_aggregates(dataset) == []


def test_turnout_identity_names_the_city_and_the_gap(dataset):
    broken = TurnoutRow(2026, 2, "rj", 2, 100, 80, 20, 5, 5, 0, 60)
    dataset.turnout[dataset.turnout.index(turnout(2, "rj", 2))] = broken

    findings = check_turnout_identity(dataset)

    assert len(findings) == 1
    assert "2026" in findings[0].message and "rj/2" in findings[0].message and "10" in findings[0].message


def test_vote_sums_must_equal_valid_votes_in_every_round(dataset):
    dataset.votes[dataset.votes.index(VoteRow(2026, 1, "ac", 1, 22, 30))] = VoteRow(2026, 1, "ac", 1, 22, 31)

    findings = check_vote_sums(dataset)

    assert [f.check for f in findings] == ["vote_sums"]
    assert "ac/1" in findings[0].message


def test_a_city_with_turnout_but_no_votes_passes_only_if_it_had_no_valid_votes(dataset):
    dataset.turnout[dataset.turnout.index(turnout(1, "zz", 3))] = turnout(1, "zz", 3, comparecimento=10, brancos=5, nulos=5, validos=0, abstencoes=90)
    dataset.votes[:] = [v for v in dataset.votes if not (v.turno == 1 and v.cd_municipio == 3)]

    assert check_vote_sums(dataset) == []


def test_a_missing_city_in_one_round_is_reported(dataset):
    dataset.turnout[:] = [t for t in dataset.turnout if not (t.turno == 2 and t.cd_municipio == 1)]

    findings = check_cities(dataset, brazilian_cities={2026: 2})

    assert any("turno 2" in f.message and "ac/1" in f.message for f in findings)


def test_the_number_of_brazilian_cities_per_cycle_must_match_the_tse_count(dataset):
    findings = check_cities(dataset, brazilian_cities={2026: 5571})

    assert any("5571" in f.message and "2" in f.message for f in findings)


def test_a_turnout_city_absent_from_the_city_index_is_reported(dataset):
    dataset.cities[:] = dataset.cities[:2]

    findings = check_cities(dataset, brazilian_cities={2026: 2})

    assert any("zz/3" in f.message for f in findings)


def test_the_same_city_code_under_two_states_is_reported(dataset):
    dataset.turnout.append(turnout(1, "rj", 1))

    findings = check_city_codes(dataset)

    assert any("1" in f.message and "ac" in f.message and "rj" in f.message for f in findings)


def test_national_totals_include_overseas_votes(dataset):
    # Three cities, one of them overseas: leaving it out would give 80 votes for candidate 13, not 120.
    reference = {(2026, 2): NationalTotals(aptos=300, comparecimento=240, validos=210, brancos=15, nulos=15, candidates={13: 120, 22: 90}, source="test")}

    assert check_national_totals(dataset, reference) == []


def test_national_totals_report_every_field_that_differs(dataset):
    reference = {(2026, 2): NationalTotals(aptos=300, comparecimento=241, validos=210, brancos=15, nulos=15, candidates={13: 119, 22: 90}, source="TSE br file")}

    findings = check_national_totals(dataset, reference)

    assert len(findings) == 2
    assert any("comparecimento" in f.message and "240" in f.message and "241" in f.message for f in findings)
    assert any("13" in f.message and "120" in f.message and "119" in f.message for f in findings)


def test_a_reference_round_missing_from_the_data_is_reported(dataset):
    reference = {(2018, 2): NationalTotals(comparecimento=1, source="TSE")}

    assert len(check_national_totals(dataset, reference)) == 1


def test_aggregates_by_region_and_uf_leave_overseas_out(dataset):
    by_region = aggregate(dataset, "regiao", ano=2026, turno=2)
    by_uf = aggregate(dataset, "uf", ano=2026, turno=2)

    assert set(by_region) == {"norte", "sudeste"}
    assert set(by_uf) == {"ac", "rj"}
    assert by_region["norte"]["validos"] == 70


def test_aggregates_check_fails_when_a_city_is_in_the_wrong_region(dataset):
    dataset.cities[0] = CityRow("ac", 1, "1", "CIDADE 1", "cidade-1", "sul", "2026")

    findings = check_aggregates(dataset)

    assert any("ac" in f.message and "sul" in f.message for f in findings)


def test_votes_annulled_in_a_separate_tally_count_towards_the_turnout_identity(dataset):
    # Salvador 2018 R1 zone 18 shape: turnout = valid + blank + null + annulled in the separate tally.
    row = turnout(2, "rj", 2, comparecimento=80, validos=60, brancos=5, nulos=5, anulados=10)
    dataset.turnout[dataset.turnout.index(turnout(2, "rj", 2))] = row

    assert check_turnout_identity(dataset) == []


def test_the_identity_still_fails_when_the_gap_is_not_explained_by_annulled_votes(dataset):
    row = turnout(2, "rj", 2, comparecimento=80, validos=60, brancos=5, nulos=5, anulados=9)
    dataset.turnout[dataset.turnout.index(turnout(2, "rj", 2))] = row

    findings = check_turnout_identity(dataset)

    assert len(findings) == 1 and "anulados_apu_sep 9" in findings[0].message and "difference 1" in findings[0].message
