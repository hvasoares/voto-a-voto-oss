"""The assembled dataset from the real TSE downloads in .cache/ (skipped when they are absent)."""
from collections import defaultdict
from pathlib import Path

import pytest

from voto_a_voto.cli import BuildOptions, Services, build, write_build
from voto_a_voto.reconcile import aggregate

pytestmark = pytest.mark.network_cache

REPO_ROOT = Path(__file__).parent.parent.parent
LULA, FLAVIO = 13, 22


@pytest.fixture(scope="module")
def built(tse_cache_dir, opendata_cache_dir):
    return build(BuildOptions(offline=True, cache_dir=REPO_ROOT / ".cache"), Services())


@pytest.fixture(scope="module")
def dataset(built):
    return built.dataset


def test_all_sources_were_available(built):
    assert built.failures == []


def test_reconciliation_is_clean(built):
    assert built.findings == []


def test_annulled_votes_in_a_separate_tally_exist_in_exactly_one_city_round(dataset):
    # TSE detalhe_votacao_munzona_2018, BA / SALVADOR (38490) / zona 18, turno 1: QT_COMPARECIMENTO 63,009 =
    # valid 51,969 + blank 1,789 + null 8,505 + 746 QT_VOTOS_ANULADOS_APU_SEP. No other cycle, round or city has any.
    nonzero = [(r.ano, r.turno, r.uf, r.cd_municipio, r.anulados_apu_sep) for r in dataset.turnout if r.anulados_apu_sep]

    assert nonzero == [(2018, 1, "ba", 38490, 746)]


def test_national_totals_including_overseas_equal_the_tse_published_numbers(built):
    # Includes 2026 (TSE national file: Lula 64,256,232, Flavio 59,826,041) and the 2018/2022 result pages.
    assert [f for f in built.findings if f.check == "national_totals"] == []
    assert built.manifest["reference"][(2026, 2)].candidates == {22: 59826041, 13: 64256232}


def city_votes(dataset, turno, ano=2026):
    votes = defaultdict(dict)
    for row in dataset.votes:
        if (row.ano, row.turno) == (ano, turno) and row.candidato_numero in (LULA, FLAVIO) and row.uf != "zz":
            votes[(row.uf, row.cd_municipio)][row.candidato_numero] = row.votos
    return votes


def test_runoff_highlights_note_reproduces_from_the_dataset(dataset):
    # Figures from thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md (Brazilian cities only).
    first, second = city_votes(dataset, 1), city_votes(dataset, 2)

    lula_won = sum(v[LULA] > v[FLAVIO] for v in second.values())
    flavio_won = sum(v[FLAVIO] > v[LULA] for v in second.values())
    lula_flips = sum(first[c][LULA] < first[c][FLAVIO] and second[c][LULA] > second[c][FLAVIO] for c in second)
    flavio_flips = sum(first[c][LULA] > first[c][FLAVIO] and second[c][LULA] < second[c][FLAVIO] for c in second)

    assert (lula_won, flavio_won, len(second) - lula_won - flavio_won) == (2875, 2695, 1)
    assert (lula_flips, flavio_flips) == (211, 1)
    assert sum(v[LULA] for v in second.values()) == 64056078  # note: city sums, overseas left out
    assert sum(v[FLAVIO] for v in second.values()) == 59654544


def test_minas_gerais_is_the_only_state_that_flips(dataset):
    def state_margin(turno):
        totals = defaultdict(lambda: [0, 0])
        for (uf, _), v in city_votes(dataset, turno).items():
            totals[uf][0] += v[LULA]
            totals[uf][1] += v[FLAVIO]
        return {uf: lula > flavio for uf, (lula, flavio) in totals.items()}

    first, second = state_margin(1), state_margin(2)

    assert [uf for uf in first if first[uf] != second[uf]] == ["mg"]


def test_region_valid_votes_match_the_note_and_leave_overseas_out(dataset):
    regions = aggregate(dataset, "regiao", ano=2026, turno=2)

    assert {name: round(totals["validos"] / 1e6, 2) for name, totals in regions.items()} == {
        "sudeste": 50.88, "nordeste": 35.25, "sul": 18.20, "norte": 10.05, "centro-oeste": 9.34,
    }
    assert "exterior" not in regions


def test_boa_esperanca_do_norte_exists_only_in_2026_and_an_overseas_post_in_all_cycles(dataset):
    cities = {(c.uf, c.cd_municipio): c for c in dataset.cities}

    assert cities[("mt", 73709)].ciclos == "2026"
    assert cities[("mt", 73709)].nome == "BOA ESPERANÇA DO NORTE"
    assert cities[("zz", 29254)].ciclos == "2018;2022;2026"


def test_every_overseas_post_slug_is_unique(dataset):
    slugs = [c.slug for c in dataset.cities if c.uf == "zz"]

    assert len(slugs) == len(set(slugs))


def test_writing_the_real_dataset_twice_gives_identical_bytes(built, tmp_path):
    write_build(built, tmp_path / "a")
    write_build(built, tmp_path / "b")

    for name in ("cities.csv", "turnout.csv", "votes.csv", "candidates.csv", "manifest.json"):
        assert (tmp_path / "a" / name).read_bytes() == (tmp_path / "b" / name).read_bytes()


def test_the_identity_remainder_of_each_round_is_the_electorate_of_uninstalled_sections(built):
    reported = {(i["ano"], i["turno"]): i for i in built.manifest["identity"]}

    for key in ((2018, 1), (2018, 2), (2022, 1), (2022, 2)):
        item = reported[key]
        assert item["aptos_menos_comparecimento_menos_abstencoes"] == item["eleitores_secoes_nao_instaladas_informado"]
    # Independent: TSE detalhe_votacao_munzona reports 470 (2018) and 657 (2022) voters in sections not installed; 84 of the 657 are in Brazil.
    assert reported[(2018, 2)]["eleitores_secoes_nao_instaladas_informado"] == 470
    assert reported[(2022, 2)]["eleitores_secoes_nao_instaladas_informado"] == 657
