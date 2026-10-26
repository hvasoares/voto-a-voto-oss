"""National totals published by the TSE itself, used as the independent oracle for the city sums.

2026 comes from the TSE national file (``dados/br/br-c0001-e00<eleicao>-u.jws``), read at build time and copied
into the manifest. 2018 and 2022 are the published national figures (Presidente, Brasil, with Exterior), copied
here by hand and cross-checked against TSE open data (see the final notes in the plan); they are not computed from
our tables. The TSE result pages of those cycles are no longer served as static files, so they could not be re-fetched.
"""
from voto_a_voto.reconcile import NationalTotals

SOURCE_2018 = "TSE published national totals, Eleições 2018, Presidente, Brasil (inclui Exterior)"
SOURCE_2022 = "TSE published national totals, Eleições 2022, Presidente, Brasil (inclui Exterior)"

PUBLISHED_2018_2022: dict[tuple[int, int], NationalTotals] = {
    (2018, 1): NationalTotals(
        comparecimento=117364654, validos=107050749, brancos=3106937, nulos=7206222, source=SOURCE_2018,
        candidates={17: 49277010, 13: 31342051, 12: 13344371, 45: 5096350},
    ),
    (2018, 2): NationalTotals(
        aptos=147306294, comparecimento=115933451, validos=104838753, brancos=2486593, nulos=8608105, source=SOURCE_2018,
        candidates={17: 57797847, 13: 47040906},
    ),
    (2022, 1): NationalTotals(
        aptos=156454011, comparecimento=123682372, validos=118229719, brancos=1964779, nulos=3487874, source=SOURCE_2022,
        candidates={13: 57259504, 22: 51072345, 15: 4915423, 12: 3599287},
    ),
    (2022, 2): NationalTotals(
        aptos=156454011, comparecimento=124252796, validos=118552353, brancos=1769678, nulos=3930765, source=SOURCE_2022,
        candidates={13: 60345999, 22: 58206354},
    ),
}


def parse_national(payload: dict, source: str = "") -> NationalTotals:
    """Totals of a decoded TSE national file. Null votes are ``tvn`` (total), which closes the identity with turnout."""
    parties = (party for group in payload["carg"][0]["agr"] for party in group["par"])
    candidates = {int(c["n"]): int(c["vap"]) for party in parties for c in party["cand"]}
    return NationalTotals(
        aptos=int(payload["e"]["te"]), comparecimento=int(payload["e"]["c"]), abstencoes=int(payload["e"]["a"]),
        validos=int(payload["v"]["vvc"]), brancos=int(payload["v"]["vb"]), nulos=int(payload["v"]["tvn"]),
        candidates=candidates, source=source or f"TSE national file e{payload['ele'].zfill(6)} ({payload['dg']} {payload['hg']})",
    )


def to_manifest(reference: dict[tuple[int, int], NationalTotals]) -> dict[str, dict]:
    return {
        f"{ano}-{turno}": {
            **{name: value for name, value in vars(totals).items() if name not in ("candidates",) and value is not None and value != ""},
            "candidates": {str(number): votes for number, votes in sorted(totals.candidates.items())},
        }
        for (ano, turno), totals in sorted(reference.items())
    }


def from_manifest(section: dict[str, dict]) -> dict[tuple[int, int], NationalTotals]:
    reference = {}
    for key, values in section.items():
        ano, turno = (int(part) for part in key.split("-"))
        candidates = {int(number): votes for number, votes in values.get("candidates", {}).items()}
        reference[(ano, turno)] = NationalTotals(**{**{k: v for k, v in values.items() if k != "candidates"}, "candidates": candidates})
    return reference
