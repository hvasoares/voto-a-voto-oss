"""The numbers in docs/nonvoters-vs-margin.md are exactly what `voto-data nonvoters` prints over the committed data/."""
from pathlib import Path

import pytest

from voto_a_voto.dataset import read_dataset
from voto_a_voto.nonvoters import measure, render

ROOT = Path(__file__).resolve().parents[2]


def test_the_note_holds_the_tables_the_command_prints():
    if not (ROOT / "data" / "turnout.csv").exists():
        pytest.skip("data/ is not present")
    tables = render(measure(read_dataset(ROOT / "data")))
    note = (ROOT / "docs" / "nonvoters-vs-margin.md").read_text(encoding="utf-8")
    assert tables.rstrip() in note, "regenerate the tables of docs/nonvoters-vs-margin.md with `make nonvoters`"


def test_the_headline_figures_quoted_in_the_note_are_the_national_rows():
    if not (ROOT / "data" / "turnout.csv").exists():
        pytest.skip("data/ is not present")
    groups = {(g.ano, g.turno): g for g in measure(read_dataset(ROOT / "data")) if g.uf == "br"}
    note = (ROOT / "docs" / "nonvoters-vs-margin.md").read_text(encoding="utf-8")
    for (ano, turno), g in groups.items():
        row = f"| {ano}, {turno}º | {g.cities_share * 100:.1f}% | {g.voters_share * 100:.1f}% |".replace(".", ",")
        assert row in note
