from voto_a_voto.reconcile import NationalTotals
from voto_a_voto.reference import PUBLISHED_2018_2022, from_manifest, parse_national, to_manifest
from voto_a_voto.tse_scrape import decode_jws


def test_parse_national_reads_the_tse_national_runoff_file(fixtures_dir):
    # TSE national file, 2026 round 2 (the only independent source for overseas-inclusive totals).
    payload = decode_jws((fixtures_dir / "tse" / "br-c0001-e006258-u.jws").read_text(encoding="utf-8"))

    totals = parse_national(payload)

    assert totals.candidates == {13: 64256232, 22: 59826041}
    assert (totals.aptos, totals.comparecimento, totals.abstencoes) == (158745502, 128236074, 30509005)
    assert (totals.validos, totals.brancos, totals.nulos) == (124082273, 1430496, 2723305)
    assert "e006258" in totals.source


def test_parse_national_uses_total_nulls_for_round_one(fixtures_dir):
    payload = decode_jws((fixtures_dir / "tse" / "br-c0001-e006257-u.jws").read_text(encoding="utf-8"))

    totals = parse_national(payload)

    assert totals.nulos == 3674249  # tvn = vn 3,669,003 + technical 5,246
    assert totals.candidates[22] == 56104503 and totals.candidates[13] == 53879538


def test_published_totals_cover_both_rounds_of_2018_and_2022():
    assert set(PUBLISHED_2018_2022) == {(2018, 1), (2018, 2), (2022, 1), (2022, 2)}
    assert PUBLISHED_2018_2022[(2022, 2)].candidates == {13: 60345999, 22: 58206354}
    assert PUBLISHED_2018_2022[(2018, 2)].candidates == {13: 47040906, 17: 57797847}


def test_manifest_form_round_trips():
    reference = {(2026, 2): NationalTotals(aptos=10, comparecimento=8, candidates={13: 5, 22: 3}, source="x")}

    assert from_manifest(to_manifest(reference)) == reference
    assert list(to_manifest(reference)) == ["2026-2"]
