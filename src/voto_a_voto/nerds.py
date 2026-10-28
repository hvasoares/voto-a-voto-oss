"""Level shards of the dashboard "Dados para nerds" (ticket #72; pure functions around one imperative ``write``).

One JSON shard per level x cycle x round, pre-aggregated from the six files of the dataset so that no panel joins or queries in the browser:

* ``brasil/<ano>-<turno>.json``: Brasil, its five regioes (plus the overseas posts as ``exterior``) and its 27 UFs (plus ``zz``);
* ``regiao/<regiao>/<ano>-<turno>.json``: the regiao and its UFs;
* ``uf/<uf>/<ano>-<turno>.json``: the UF and all its municipios.

A round that did not happen is an absent file / an absent row, never zeros. Columns are the printed measures only: ``eleitorado`` (aptos), ``comparecimento``,
``abstencao``, ``brancos_nulos`` (brancos + nulos + anulados e apurados em separado, so that candidates + brancos_nulos = comparecimento), ``validos`` and
``nao_instalados`` (eleitores de secoes nao instaladas = eleitorado - comparecimento - abstencao, which the TSE reports apart), then one ``votos`` entry per candidate of
the cycle and round in BALLOT-NUMBER order (never sorted by result). Secoes apuradas are not part of the dataset, so the shards do not carry them.

Every shard header names the edition (id and fingerprint = content hash of the six files) it was made from; ``data/nerds/manifest.json`` lists every shard with its size and
SHA-256. Same inputs, same bytes: a second run changes nothing. ``check`` rebuilds everything from the dataset and compares bytes, then verifies the reconciliations on the
shards themselves (sums across levels; candidates + brancos + nulos = votantes).
"""
import hashlib
import json
from pathlib import Path

from voto_a_voto import editions
from voto_a_voto.reconcile import Finding

SCHEMA_VERSION = 1
DIRECTORY = "nerds"
MANIFEST_FILE = "manifest.json"
CARGO = "presidente"
OVERSEAS_UF, OVERSEAS_REGION = "zz", "exterior"
REGION_ORDER = ("norte", "nordeste", "centro-oeste", "sudeste", "sul")
METRICS = ("eleitorado", "comparecimento", "abstencao", "brancos_nulos", "validos", "nao_instalados")


class NerdsError(Exception):
    """The shards cannot be made (the dataset is not a published edition)."""


def edition_of(files: dict[str, bytes], editions_dir: Path) -> dict:
    """The published edition whose fingerprint is this dataset: the shards are pinned to it."""
    fingerprint = editions.fingerprint(files)
    found = editions.load_editions(Path(editions_dir)) if Path(editions_dir).is_dir() else {}
    for edition_id, record in found.items():
        if record["fingerprint"] == fingerprint:
            return {"id": edition_id, "hash": fingerprint}
    raise NerdsError(f"the dataset (fingerprint {fingerprint}) is not a published edition in {editions_dir}: run `make publish-edition`")


def _zero() -> dict[str, int]:
    return {name: 0 for name in METRICS}


def load(files: dict[str, bytes]) -> dict:
    """The dataset as {(ano, turno): {cd: row}}, the candidates per round (ballot order) and the municipality identities."""
    cities = {row["cd_municipio"]: row for row in editions.rows_of(files["cities.csv"])}
    rounds: dict[tuple[int, int], dict[str, dict]] = {}
    for row in editions.rows_of(files["turnout.csv"]):
        key = (int(row["ano"]), int(row["turno"]))
        eleitorado, comparecimento, abstencao = int(row["aptos"]), int(row["comparecimento"]), int(row["abstencoes"])
        rounds.setdefault(key, {})[row["cd_municipio"]] = {
            "eleitorado": eleitorado,
            "comparecimento": comparecimento,
            "abstencao": abstencao,
            "brancos_nulos": int(row["brancos"]) + int(row["nulos"]) + int(row["anulados_apu_sep"]),
            "validos": int(row["validos"]),
            "nao_instalados": eleitorado - comparecimento - abstencao,
            "votos": {},
        }
    candidates: dict[tuple[int, int], list[dict]] = {}
    for row in editions.rows_of(files["candidates.csv"]):
        candidates.setdefault((int(row["ano"]), int(row["turno"])), []).append(
            {"numero": int(row["candidato_numero"]), "nome": row["nome_urna"], "partido": row["partido"]}
        )
    for key in candidates:
        candidates[key].sort(key=lambda c: c["numero"])
    for row in editions.rows_of(files["votes.csv"]):
        rounds[(int(row["ano"]), int(row["turno"]))][row["cd_municipio"]]["votos"][int(row["candidato_numero"])] = int(row["votos"])
    return {"cities": cities, "rounds": dict(sorted(rounds.items())), "candidates": candidates}


def _sum(rows: list[dict], numbers: list[int]) -> dict:
    total = _zero()
    votos = {number: 0 for number in numbers}
    for row in rows:
        for name in METRICS:
            total[name] += row[name]
        for number in numbers:
            votos[number] += row["votos"].get(number, 0)
    total["votos"] = votos
    return total


def _cells(row: dict, numbers: list[int]) -> list[int]:
    return [row[name] for name in METRICS] + [row["votos"].get(number, 0) for number in numbers]


def _encode(shard: dict) -> bytes:
    return (json.dumps(shard, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf-8")


def shard_name(level: str, key: str | None, ano: int, turno: int) -> str:
    return f"{level}/{key + '/' if key else ''}{ano}-{turno}.json"


def build(files: dict[str, bytes], edition: dict) -> dict[str, bytes]:
    """Every shard by its path under ``nerds/``, as bytes."""
    data = load(files)
    out: dict[str, bytes] = {}
    for (ano, turno), by_cd in data["rounds"].items():
        candidates = data["candidates"].get((ano, turno), [])
        numbers = [c["numero"] for c in candidates]
        # group the municipality rows (a municipality with no row in this round is simply absent)
        by_uf: dict[str, list[tuple[str, dict]]] = {}
        for cd, row in by_cd.items():
            by_uf.setdefault(data["cities"][cd]["uf"], []).append((cd, row))
        uf_rows = {uf: [row for _, row in members] for uf, members in by_uf.items()}
        region_of = {uf: data["cities"][members[0][0]]["regiao"] for uf, members in by_uf.items()}
        uf_totals = {uf: _sum(rows, numbers) for uf, rows in uf_rows.items()}
        regions: dict[str, list[str]] = {}
        for uf in sorted(uf_totals):
            regions.setdefault(region_of[uf], []).append(uf)
        region_totals = {region: _sum([uf_totals[uf] for uf in ufs], numbers) for region, ufs in regions.items()}
        brasil = _sum(list(uf_totals.values()), numbers)

        def header(level: str, key: str | None, columns: list[str]) -> dict:
            return {
                "schema": SCHEMA_VERSION, "edition": edition["id"], "hash": edition["hash"], "level": level, "id": key,
                "cargo": CARGO, "ano": ano, "turno": turno, "columns": columns,
                "candidatos": candidates,
            }

        def pack(rows: list[tuple[str, dict]]) -> list[list]:
            return [[key, *_cells(row, numbers)] for key, row in rows]

        ordered_regions = [r for r in (*REGION_ORDER, OVERSEAS_REGION) if r in region_totals]
        out[shard_name("brasil", None, ano, turno)] = _encode({
            **header("brasil", None, ["id", *METRICS, "votos"]),
            "total": [None, *_cells(brasil, numbers)],
            "regioes": pack([(r, region_totals[r]) for r in ordered_regions]),
            "ufs": pack([(uf, uf_totals[uf]) for uf in sorted(uf_totals)]),
        })
        for region in ordered_regions:
            if region == OVERSEAS_REGION:
                continue
            out[shard_name("regiao", region, ano, turno)] = _encode({
                **header("regiao", region, ["id", *METRICS, "votos"]),
                "total": [region, *_cells(region_totals[region], numbers)],
                "ufs": pack([(uf, uf_totals[uf]) for uf in regions[region]]),
            })
        for uf in sorted(uf_totals):
            if uf == OVERSEAS_UF:
                continue
            municipios = sorted(by_uf[uf], key=lambda item: data["cities"][item[0]]["slug"])
            out[shard_name("uf", uf, ano, turno)] = _encode({
                **header("uf", uf, ["id", "nome", *METRICS, "votos"]),
                "regiao": region_of[uf],
                "total": [uf, None, *_cells(uf_totals[uf], numbers)],
                "municipios": [[data["cities"][cd]["slug"], data["cities"][cd]["nome"], *_cells(row, numbers)] for cd, row in municipios],
            })
    return out


def manifest_for(shards: dict[str, bytes], edition: dict) -> bytes:
    listed = {}
    for name in sorted(shards):
        header = json.loads(shards[name])
        listed[name] = {
            "ano": header["ano"], "bytes": len(shards[name]), "level": header["level"], "sha256": hashlib.sha256(shards[name]).hexdigest(), "turno": header["turno"],
        }
    body = {"schema_version": SCHEMA_VERSION, "edition": edition["id"], "hash": edition["hash"], "cargo": CARGO, "shards": listed}
    return (json.dumps(body, indent=2, sort_keys=True) + "\n").encode("utf-8")


def write(data_dir: Path, editions_dir: Path) -> tuple[int, bool]:
    """(number of shards, changed). Removes shards of an older dataset; a second run changes nothing."""
    data_dir = Path(data_dir)
    files = editions.read_files(data_dir)
    edition = edition_of(files, editions_dir)
    shards = build(files, edition)
    wanted = {**shards, MANIFEST_FILE: manifest_for(shards, edition)}
    root = data_dir / DIRECTORY
    present = {str(p.relative_to(root)) for p in root.rglob("*.json")} if root.is_dir() else set()
    changed = False
    for name in sorted(present - set(wanted)):
        (root / name).unlink()
        changed = True
    for name, body in wanted.items():
        path = root / name
        if path.exists() and path.read_bytes() == body:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        changed = True
    return len(shards), changed


def decode(body: bytes) -> dict:
    return json.loads(body.decode("utf-8"))


def _row(columns: list[str], cells: list) -> dict:
    metric_start = columns.index("eleitorado")
    named = dict(zip(columns[:metric_start], cells[:metric_start]))
    values = cells[metric_start:]
    named.update(zip(METRICS, values[: len(METRICS)]))
    named["votos"] = values[len(METRICS):]
    return named


def _numbers(row: dict) -> dict:
    return {name: row[name] for name in (*METRICS, "votos")}


def reconcile(shards: dict[str, dict]) -> list[Finding]:
    """The sums of the levels and the candidate identity, on the shards as decoded JSON."""
    findings: list[Finding] = []

    def add(message: str) -> None:
        findings.append(Finding("nerds", message))

    def parts(shard: dict, cells: list) -> dict:
        return _row(shard["columns"], cells)

    def compare(label: str, total: dict, rows: list[dict]) -> None:
        for name in METRICS:
            if total[name] != sum(row[name] for row in rows):
                add(f"{label}: {name} {total[name]} != sum of its rows {sum(row[name] for row in rows)}")
        for i, number in enumerate(total["votos"]):
            if number != sum(row["votos"][i] for row in rows):
                add(f"{label}: candidate column {i} {number} != sum of its rows")

    def identity(label: str, row: dict) -> None:
        if row["votos"] and sum(row["votos"]) + row["brancos_nulos"] != row["comparecimento"]:
            add(f"{label}: candidates {sum(row['votos'])} + brancos/nulos {row['brancos_nulos']} != comparecimento {row['comparecimento']}")
        if row["votos"] and sum(row["votos"]) != row["validos"]:
            add(f"{label}: candidates {sum(row['votos'])} != validos {row['validos']}")
        if row["comparecimento"] + row["abstencao"] + row["nao_instalados"] != row["eleitorado"]:
            add(f"{label}: comparecimento + abstencao + nao instalados != eleitorado")

    for name, shard in sorted(shards.items()):
        label = f"{name}"
        total = parts(shard, shard["total"])
        identity(f"{label} total", total)
        if shard["level"] == "brasil":
            for group in ("regioes", "ufs"):
                rows = [parts(shard, cells) for cells in shard[group]]
                compare(f"{label} {group}", total, rows)
                for row in rows:
                    identity(f"{label} {group}/{row['id']}", row)
        elif shard["level"] == "regiao":
            rows = [parts(shard, cells) for cells in shard["ufs"]]
            compare(label, total, rows)
            brasil = shards.get(shard_name("brasil", None, shard["ano"], shard["turno"]))
            row = next((parts(brasil, c) for c in brasil["regioes"] if c[0] == shard["id"]), None) if brasil else None
            if row is None or _numbers(row) != _numbers(total):
                add(f"{label}: total differs from its row in the Brasil shard")
        else:
            rows = [parts(shard, cells) for cells in shard["municipios"]]
            compare(label, total, rows)
            for row in rows:
                identity(f"{label} {row['id']}", row)
            brasil = shards.get(shard_name("brasil", None, shard["ano"], shard["turno"]))
            row = next((parts(brasil, c) for c in brasil["ufs"] if c[0] == shard["id"]), None) if brasil else None
            if row is None or _numbers(row) != _numbers(total):
                add(f"{label}: total differs from its row in the Brasil shard")
    return findings


def check(data_dir: Path, editions_dir: Path) -> list[Finding]:
    """The shards on disk are exactly what the dataset makes (bytes), the manifest lists them with their hashes, and the reconciliations hold."""
    data_dir, root = Path(data_dir), Path(data_dir) / DIRECTORY
    if not (root / MANIFEST_FILE).exists():
        return [Finding("nerds", f"{root} has no {MANIFEST_FILE}; run `make data-nerds`")]
    try:
        files = editions.read_files(data_dir)
        edition = edition_of(files, editions_dir)
    except (editions.EditionError, NerdsError) as error:
        return [Finding("nerds", str(error))]
    expected = build(files, edition)
    expected[MANIFEST_FILE] = manifest_for({n: b for n, b in expected.items() if n != MANIFEST_FILE}, edition)
    present = {str(p.relative_to(root)) for p in root.rglob("*.json")}
    findings = [Finding("nerds", f"{name}: missing") for name in sorted(set(expected) - present)]
    findings += [Finding("nerds", f"{name}: not made from this dataset") for name in sorted(present - set(expected))]
    findings += [Finding("nerds", f"{name}: differs from what the dataset makes (stale or edited)") for name in sorted(present & set(expected)) if (root / name).read_bytes() != expected[name]]
    decoded = {name: decode((root / name).read_bytes()) for name in present if name != MANIFEST_FILE and name in expected}
    findings += [Finding("nerds", f"{name}: header names edition {s['edition']}/{s['hash']}, not {edition['id']}/{edition['hash']}") for name, s in sorted(decoded.items()) if (s["edition"], s["hash"]) != (edition["id"], edition["hash"])]
    return findings + reconcile(decoded)

