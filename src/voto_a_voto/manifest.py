"""The hashed manifest of ``data/``: where every number came from, and a self-check of the committed files."""
import hashlib
from collections import defaultdict
from collections.abc import Iterable
from datetime import datetime
from pathlib import Path

from voto_a_voto.dataset import TABLES, Dataset
from voto_a_voto.reconcile import Finding, NationalTotals
from voto_a_voto.reference import to_manifest
from voto_a_voto.tse_scrape import decode_jws

SCHEMA_VERSION = 1


def summarize_results_files(paths: Iterable[Path]) -> dict:
    """Count, final count, newest TSE generation timestamp and a digest of the sorted per-file hashes for the 2026 files."""
    lines, final, newest = [], 0, None
    for path in sorted(paths, key=lambda p: p.name):
        content = path.read_bytes()
        lines.append(f"{path.name} {hashlib.sha256(content).hexdigest()}\n")
        payload = decode_jws(content.decode("utf-8"))
        final += payload.get("and") == "f"
        if "dg" in payload and "hg" in payload:
            generated = datetime.strptime(f"{payload['dg']} {payload['hg']}", "%d/%m/%Y %H:%M:%S")
            newest = max(newest, generated) if newest else generated
    return {
        "files": len(lines),
        "final": final,
        "newest_generation": newest.isoformat() if newest else None,
        "digest": hashlib.sha256("".join(lines).encode("utf-8")).hexdigest(),
    }


def turnout_identity(dataset: Dataset, reported: dict[tuple[int, int], int]) -> list[dict]:
    """Per cycle and round: ``aptos - comparecimento - abstencoes`` over the whole country, next to the electorate of
    sections not installed as reported by the source (``None`` when the source does not report it)."""
    remainder: dict[tuple[int, int], int] = defaultdict(int)
    for row in dataset.turnout:
        remainder[(row.ano, row.turno)] += row.aptos - row.comparecimento - row.abstencoes
    return [
        {
            "ano": ano, "turno": turno, "aptos_menos_comparecimento_menos_abstencoes": value,
            "eleitores_secoes_nao_instaladas_informado": reported.get((ano, turno)),
        }
        for (ano, turno), value in sorted(remainder.items())
    ]


def build_manifest(sources: list[dict], outputs: dict[str, dict], reference: dict[tuple[int, int], NationalTotals], identity: list[dict]) -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "sources": sources,
        "outputs": dict(sorted(outputs.items())),
        "national_reference": to_manifest(reference),
        "turnout_identity": identity,
    }


def check_manifest(manifest: dict, data_dir) -> list[Finding]:
    """Every output exists and matches the recorded size, row count and SHA-256."""
    findings = []
    for name in TABLES:
        recorded = manifest["outputs"].get(name)
        path = Path(data_dir) / name
        if recorded is None:
            findings.append(Finding("manifest", f"{name} is not listed in manifest.json"))
        elif not path.exists():
            findings.append(Finding("manifest", f"{name} is missing"))
        else:
            content = path.read_bytes()
            if hashlib.sha256(content).hexdigest() != recorded["sha256"]:
                findings.append(Finding("manifest", f"{name}: sha256 differs from manifest.json"))
            if len(content) != recorded["bytes"]:
                findings.append(Finding("manifest", f"{name}: {len(content)} bytes, manifest.json says {recorded['bytes']}"))
            rows = max(content.count(b"\n") - 1, 0)
            if rows != recorded["rows"]:
                findings.append(Finding("manifest", f"{name}: {rows} rows, manifest.json says {recorded['rows']}"))
    return findings
