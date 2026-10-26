import base64
import json
from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES


@pytest.fixture
def make_jws():
    """Builds an unsigned TSE-shaped ``.jws`` text from a payload dict."""

    def build(payload: dict) -> str:
        body = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).rstrip(b"=").decode()
        return f"eyJhbGciOiJub25lIn0.{body}.assinatura"

    return build


@pytest.fixture
def sao_paulo_round_two(fixtures_dir) -> str:
    """Real TSE file for São Paulo/SP, 2026 round 2 (final)."""
    return (fixtures_dir / "tse" / "sp71072-c0001-e006258-u.jws").read_text(encoding="utf-8")


@pytest.fixture
def config_jws(fixtures_dir) -> str:
    """Real TSE city config trimmed to a few cities, one overseas block and Boa Esperança do Norte/MT."""
    return (fixtures_dir / "tse" / "config-mun-e006258-cm.jws").read_text(encoding="utf-8")


REPO_ROOT = Path(__file__).parent.parent


@pytest.fixture(scope="session")
def tse_cache_dir() -> Path:
    path = REPO_ROOT / ".cache" / "tse"
    if not any(path.glob("*__config__mun-*.jws")):
        pytest.skip("real TSE cache not present in .cache/tse")
    return path


@pytest.fixture(scope="session")
def opendata_cache_dir() -> Path:
    path = REPO_ROOT / ".cache" / "tse-opendata"
    if not path.is_dir():
        pytest.skip("real TSE open-data cache not present in .cache/tse-opendata")
    return path


def read_semicolon_csv(path: Path) -> list[dict]:
    """Reads a TSE open-data fixture the way the TSE ships it: latin-1, ``;`` separated."""
    import csv

    with open(path, encoding="latin-1", newline="") as handle:
        return list(csv.DictReader(handle, delimiter=";"))


@pytest.fixture
def munzona_rows(fixtures_dir):
    """``munzona_rows("detalhe_votacao_munzona", 2022)`` -> trimmed real rows of that TSE member."""

    def load(kind: str, year: int) -> list[dict]:
        return read_semicolon_csv(fixtures_dir / "munzona" / f"{kind}_{year}_BR_sample.csv")

    return load
