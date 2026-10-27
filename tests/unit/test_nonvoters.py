from voto_a_voto.dataset import Dataset, TurnoutRow, VoteRow
from voto_a_voto.nonvoters import BRAZIL, measure, render


def city(uf, cd, aptos, votes, *, ano=2026, turno=1, comparecimento=None):
    """One city and round: the candidates' votes are the valid votes; the rest of the electorate did not vote."""
    validos = sum(votes)
    row = TurnoutRow(ano, turno, uf, cd, aptos, comparecimento if comparecimento is not None else validos, 0, 0, 0, 0, validos)
    return row, [VoteRow(ano, turno, uf, cd, number, v) for number, v in enumerate(votes, start=10)]


def dataset(*cities):
    return Dataset(cities=[], turnout=[c[0] for c in cities], votes=[v for c in cities for v in c[1]], candidates=[])


def group(groups, uf, ano=2026, turno=1):
    return next(g for g in groups if (g.ano, g.turno, g.uf) == (ano, turno, uf))


def test_a_city_counts_when_the_people_who_did_not_vote_outnumber_the_margin():
    # 1000 voters, 700 valid votes: 300 did not vote; margin 400 - 300 = 100
    groups = measure(dataset(city("ac", 1, 1000, [400, 300])))
    assert (group(groups, "ac").cities, group(groups, "ac").exceeding) == (1, 1)


def test_a_larger_margin_does_not_count():
    # 300 did not vote, margin 650 - 50 = 600
    groups = measure(dataset(city("ac", 1, 1000, [650, 50])))
    assert group(groups, "ac").exceeding == 0


def test_equal_is_not_larger():
    # 300 did not vote, margin 500 - 200 = 300
    groups = measure(dataset(city("ac", 1, 1000, [500, 200])))
    assert group(groups, "ac").exceeding == 0


def test_the_margin_is_first_minus_second_whatever_the_number_of_candidates_and_their_order():
    # 100 did not vote; 400, 300, 200 valid: margin 100 -> equal, not larger; with 399 the margin is 99 -> larger
    assert measure(dataset(city("ac", 1, 1000, [200, 400, 300])))[0].exceeding == 0
    assert measure(dataset(city("ac", 1, 1000, [200, 399, 300], comparecimento=899)))[0].exceeding == 1


def test_a_single_candidate_has_the_whole_valid_vote_as_margin():
    assert measure(dataset(city("ac", 1, 1000, [900])))[0].exceeding == 0  # 100 did not vote < margin 900
    assert measure(dataset(city("ac", 1, 1000, [100])))[0].exceeding == 1  # 900 did not vote > margin 100


def test_blank_null_and_abstention_all_count_as_not_voting():
    # comparecimento (people who showed up) is not what matters: 1000 - validos
    row, votes = city("ac", 1, 1000, [300, 250], comparecimento=900)  # 100 blank/null + 100 abstentions
    assert measure(dataset((row, votes)))[0].exceeding == 1  # 450 did not vote > margin 50


def test_share_of_cities_and_share_of_voters_are_counted_apart():
    groups = measure(dataset(city("ac", 1, 1000, [400, 300]), city("ac", 2, 9000, [8000, 500]), city("ac", 3, 100, [30, 30])))
    ac = group(groups, "ac")
    assert (ac.cities, ac.exceeding) == (3, 2)  # city 2: 500 did not vote < margin 7500
    assert ac.cities_share == 2 / 3
    assert (ac.aptos, ac.aptos_exceeding) == (10100, 1100)
    assert ac.voters_share == 1100 / 10100


def test_every_cycle_round_and_state_has_its_own_numbers_and_the_country_adds_them_up():
    groups = measure(
        dataset(
            city("ac", 1, 1000, [400, 300]),
            city("rj", 2, 1000, [650, 50]),
            city("ac", 1, 1000, [400, 300], ano=2022, turno=2),
        )
    )
    assert (group(groups, "ac").exceeding, group(groups, "rj").exceeding) == (1, 0)
    assert (group(groups, BRAZIL).cities, group(groups, BRAZIL).exceeding) == (2, 1)
    assert group(groups, "ac", 2022, 2).exceeding == 1
    assert {(g.ano, g.turno) for g in groups} == {(2026, 1), (2022, 2)}


def test_overseas_posts_are_never_counted():
    groups = measure(dataset(city("ac", 1, 1000, [400, 300]), city("zz", 9, 1000, [400, 300])))
    assert {g.uf for g in groups} == {"ac", BRAZIL}
    assert group(groups, BRAZIL).cities == 1


def test_a_city_with_no_electorate_or_no_valid_votes_has_no_winner_and_is_left_out_of_the_base():
    groups = measure(dataset(city("ac", 1, 1000, [400, 300]), city("ac", 2, 400, [0, 0], comparecimento=0), city("ac", 3, 0, [])))
    ac = group(groups, "ac")
    assert (ac.cities, ac.left_out) == (1, 2)


def test_the_tables_are_in_portuguese_with_the_states_by_uf_then_the_country():
    text = render(measure(dataset(city("ac", 1, 1000, [400, 300]), city("rj", 2, 1000, [650, 50]))))
    assert text.startswith("### 2026, 1º turno\n")
    rows = [line.split(" | ")[0].removeprefix("| ") for line in text.splitlines() if line.startswith("| ") and not line.startswith("| UF")]
    assert rows == ["AC", "RJ", "Brasil (sem exterior)"]
    assert "| AC | 1 | 1 | 100,0% | 1.000 | 100,0% |" in text
    assert "Estados em que mais da metade das cidades tem não-votantes > margem: 1 de 2." in text
