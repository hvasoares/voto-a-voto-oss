"""``voto-data``: download, cache, normalize and verify the TSE data behind the site (imperative shell).

    voto-data build [--cycles 2018,2022,2026] [--offline] [--allow-partial]
    voto-data check

``build`` fetches only what is missing or changed, reconciles everything against the TSE's own totals and writes
``data/`` last, so a failed run never leaves a half-written dataset. ``check`` re-validates ``data/`` with no network.
"""
import argparse
import json
import sys
import time
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

from voto_a_voto import nonvoters, reconcile
from voto_a_voto.cities import City, parse_cities
from voto_a_voto.dataset import CycleData, Dataset, assemble, cycle_from_munzona, cycle_from_results, read_dataset, write_dataset, write_manifest
from voto_a_voto.manifest import build_manifest, check_manifest, summarize_results_files, turnout_identity
from voto_a_voto.munzona import parse_candidates, parse_city_names, parse_turnout, parse_votes, read_rows
from voto_a_voto.opendata import DownloadError, OpenDataCache, https_stream
from voto_a_voto.reconcile import Finding, NationalTotals
from voto_a_voto.reference import PUBLISHED_2018_2022, from_manifest, parse_national
from voto_a_voto.tse_scrape import (
    BASE_URL,
    CYCLE,
    DEFAULT_ELECTIONS,
    CachedFetcher,
    NonFinalResultsError,
    OfflineCacheMissError,
    check_final,
    list_municipalities,
    scrape_municipalities,
)

ALL_CYCLES = (2018, 2022, 2026)
OPEN_DATA_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/{kind}/{kind}_{year}.zip"
OPEN_DATA_KINDS = ("votacao_candidato_munzona", "detalhe_votacao_munzona")
# Municipalities in the TSE files: 5,570 in 2018 and 2022, plus Boa Esperança do Norte/MT (code 73709) in 2026.
BRAZILIAN_CITIES = {2018: 5570, 2022: 5570, 2026: 5571}


@dataclass
class Services:
    """The seams of the shell: HTTP transports and the reference numbers, replaceable in tests."""

    fetch_transport: object = None  # (url, headers) -> (status, headers, text); None = real HTTPS with retries
    stream_transport: object = https_stream
    published: dict[tuple[int, int], NationalTotals] = field(default_factory=lambda: dict(PUBLISHED_2018_2022))
    brazilian_cities: dict[int, int] = field(default_factory=lambda: dict(BRAZILIAN_CITIES))
    clock: object = time.time
    sleep: object = time.sleep


@dataclass(frozen=True)
class BuildOptions:
    cycles: tuple[int, ...] = ALL_CYCLES
    offline: bool = False
    allow_partial: bool = False
    data_dir: Path = Path("data")
    cache_dir: Path = Path(".cache")


@dataclass
class BuildResult:
    dataset: Dataset | None = None
    manifest: dict | None = None
    findings: list[Finding] = field(default_factory=list)
    failures: list[str] = field(default_factory=list)
    summary: list[str] = field(default_factory=list)


def load_2026(options: BuildOptions, services: Services, result: BuildResult):
    online = 2026 in options.cycles and not options.offline
    fetcher = CachedFetcher(options.cache_dir / "tse", transport=services.fetch_transport, offline=not online, clock=services.clock)
    config_url = f"{BASE_URL}/{CYCLE}/{DEFAULT_ELECTIONS[2]}/config/mun-e00{DEFAULT_ELECTIONS[2]}-cm.jws"
    config = fetcher.get_payload(config_url)
    cities = parse_cities(config)
    municipalities = list_municipalities(fetcher, DEFAULT_ELECTIONS[2], {state["cd"] for state in config["abr"]})
    results = scrape_municipalities(fetcher, municipalities, DEFAULT_ELECTIONS)
    check_final(results, options.allow_partial)
    reference = {}
    for turno, election in DEFAULT_ELECTIONS.items():
        url = f"{BASE_URL}/{CYCLE}/{election}/dados/br/br-c0001-e00{election}-u.jws"
        payload = fetcher.get_payload(url)
        if payload is None:
            raise DownloadError(f"TSE national file not available: {url}")
        reference[(2026, turno)] = parse_national(payload, source=f"TSE national file br-c0001-e00{election}-u.jws")
    source = {
        "id": "tse_results_2026", "kind": "results_site", "base_url": f"{BASE_URL}/{CYCLE}",
        "elections": {str(turno): election for turno, election in DEFAULT_ELECTIONS.items()},
        "cities": len(results), **summarize_results_files(fetcher.used),
    }
    stats = dict(fetcher.stats)
    served = ", ".join(f"{n} {name.replace('_', ' ')}" for name, n in stats.items() if n)
    result.summary.append(f"2026 results site: {len(fetcher.used)} files; {served}")
    return cycle_from_results(2026, results), cities, reference, source


def load_open_data(year: int, options: BuildOptions, services: Services, result: BuildResult):
    online = year in options.cycles and not options.offline
    cache = OpenDataCache(options.cache_dir / "tse-opendata", transport=services.stream_transport, offline=not online,
                          clock=services.clock, sleep=services.sleep)
    rows, sources = {}, []
    for kind in OPEN_DATA_KINDS:
        url = OPEN_DATA_URL.format(kind=kind, year=year)
        member = f"{kind}_{year}_BR.csv"
        cached = cache.fetch(url, member=member)
        rows[kind] = list(read_rows(cached.path, member))
        sources.append({
            "id": f"{kind}_{year}", "kind": "opendata", "url": url, "member": member, "retrieved_at": cached.retrieved_at,
            "bytes": cached.bytes, "sha256": cached.sha256, "rows": sum(row["CD_CARGO"] == "1" for row in rows[kind]),
        })
        result.summary.append(f"{kind}_{year}.zip: {cached.source} ({cached.bytes:,} bytes)")
    turnout = parse_turnout(rows["detalhe_votacao_munzona"])
    not_installed = Counter()
    for (ano, turno, _, _), counts in turnout.items():
        not_installed[(ano, turno)] += counts.nao_instalados
    cycle = cycle_from_munzona(
        year, turnout, parse_votes(rows["votacao_candidato_munzona"]), parse_candidates(rows["votacao_candidato_munzona"]),
        parse_city_names(rows["detalhe_votacao_munzona"]),
    )
    return cycle, sources, dict(not_installed)


def all_findings(dataset: Dataset, reference: dict, brazilian_cities: dict[int, int]) -> list[Finding]:
    return [
        *reconcile.check_cities(dataset, brazilian_cities),
        *reconcile.check_city_codes(dataset),
        *reconcile.check_turnout_identity(dataset),
        *reconcile.check_vote_sums(dataset),
        *reconcile.check_national_totals(dataset, reference),
        *reconcile.check_aggregates(dataset),
    ]


def build(options: BuildOptions, services: Services) -> BuildResult:
    """Fetch, parse, assemble and reconcile. Writes nothing."""
    result = BuildResult()
    cycles: list[CycleData] = []
    sources: list[dict] = []
    reported: dict[tuple[int, int], int] = {}
    reference = dict(services.published)
    config_cities: list[City] = []
    for year in sorted(set(ALL_CYCLES)):
        try:
            if year == 2026:
                cycle, config_cities, reference_2026, source = load_2026(options, services, result)
                reference.update(reference_2026)
                sources.append(source)
            else:
                cycle, year_sources, year_reported = load_open_data(year, options, services, result)
                sources.extend(year_sources)
                reported.update(year_reported)
        except NonFinalResultsError:
            raise
        except (DownloadError, OfflineCacheMissError, OSError) as error:
            result.failures.append(f"{year}: {error}")
            continue
        cycles.append(cycle)
    if result.failures:
        return result
    dataset = assemble(cycles, config_cities)
    result.dataset = dataset
    result.findings = all_findings(dataset, reference, services.brazilian_cities)
    result.manifest = {"sources": sources, "reference": reference, "identity": turnout_identity(dataset, reported)}
    return result


def write_build(result: BuildResult, data_dir: Path) -> dict:
    """Writes the tables, then the manifest last."""
    outputs = write_dataset(result.dataset, data_dir)
    manifest = build_manifest(result.manifest["sources"], outputs, result.manifest["reference"], result.manifest["identity"])
    write_manifest(manifest, Path(data_dir) / "manifest.json")
    return manifest


def check(data_dir: Path, services: Services) -> list[Finding]:
    """Offline validation of the committed ``data/``."""
    data_dir = Path(data_dir)
    manifest_path = data_dir / "manifest.json"
    if not manifest_path.exists():
        return [Finding("manifest", f"{manifest_path} is missing; run `make data`")]
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    findings = check_manifest(manifest, data_dir)
    try:
        dataset = read_dataset(data_dir)
    except (OSError, ValueError) as error:
        return [*findings, Finding("tables", str(error))]
    reference = from_manifest(manifest["national_reference"])
    findings += all_findings(dataset, reference, services.brazilian_cities)
    recorded = {(item["ano"], item["turno"]): item for item in manifest["turnout_identity"]}
    for item in turnout_identity(dataset, {}):
        key = (item["ano"], item["turno"])
        saved = recorded.get(key)
        name = "aptos_menos_comparecimento_menos_abstencoes"
        if saved is None or saved[name] != item[name]:
            findings.append(Finding("turnout_identity", f"{key[0]} turno {key[1]}: remainder {item[name]} does not match manifest.json"))
        elif saved["eleitores_secoes_nao_instaladas_informado"] not in (None, item[name]):
            findings.append(Finding("turnout_identity", f"{key[0]} turno {key[1]}: remainder {item[name]} != electorate of sections not installed reported by the TSE ({saved['eleitores_secoes_nao_instaladas_informado']})"))
    return findings


def print_findings(findings: list[Finding], limit: int = 30) -> None:
    for finding in findings[:limit]:
        print(f"  {finding}", file=sys.stderr)
    if len(findings) > limit:
        print(f"  ... and {len(findings) - limit} more", file=sys.stderr)


def main(argv=None, services: Services | None = None) -> int:
    services = services or Services()
    parser = argparse.ArgumentParser(prog="voto-data", description="Baixa, normaliza e valida os dados do TSE usados pelo site.")
    commands = parser.add_subparsers(dest="command", required=True)
    build_parser = commands.add_parser("build", help="baixa o que falta ou mudou e escreve data/")
    build_parser.add_argument("--cycles", default=",".join(map(str, ALL_CYCLES)), help="ciclos a baixar (os demais vêm do cache); padrão: todos")
    build_parser.add_argument("--offline", action="store_true", help="não usa a rede; falha se algo não estiver no cache")
    build_parser.add_argument("--allow-partial", action="store_true", help="aceita cidades sem resultado final em 2026")
    build_parser.add_argument("--data-dir", default="data")
    build_parser.add_argument("--cache-dir", default=".cache")
    check_parser = commands.add_parser("check", help="valida data/ sem rede")
    check_parser.add_argument("--data-dir", default="data")
    nonvoters_parser = commands.add_parser("nonvoters", help="imprime a medida do ticket #24: não-votantes maiores que a margem, por ciclo, turno e estado")
    nonvoters_parser.add_argument("--data-dir", default="data")
    args = parser.parse_args(argv)

    if args.command == "nonvoters":
        print(nonvoters.render(nonvoters.measure(read_dataset(args.data_dir))), end="")
        return 0

    if args.command == "check":
        findings = check(Path(args.data_dir), services)
        if findings:
            print(f"data-check FAILED: {len(findings)} finding(s)", file=sys.stderr)
            print_findings(findings)
            return 1
        print(f"data-check OK: {args.data_dir}")
        return 0

    cycles = tuple(int(year) for year in args.cycles.split(","))
    options = BuildOptions(cycles, args.offline, args.allow_partial, Path(args.data_dir), Path(args.cache_dir))
    try:
        result = build(options, services)
    except NonFinalResultsError as error:
        print(f"build FAILED: {error}", file=sys.stderr)
        print("  use --allow-partial to build from results the TSE has not marked final", file=sys.stderr)
        return 1
    for line in result.summary:
        print(line)
    if result.failures:
        print("build FAILED: sources failed", file=sys.stderr)
        for failure in result.failures:
            print(f"  {failure}", file=sys.stderr)
        return 1
    if result.findings:
        print(f"build FAILED: {len(result.findings)} reconciliation finding(s); {options.data_dir} was not written", file=sys.stderr)
        print_findings(result.findings)
        return 1
    manifest = write_build(result, options.data_dir)
    for name, output in manifest["outputs"].items():
        print(f"{options.data_dir}/{name}: {output['rows']:,} rows, {output['bytes']:,} bytes")
    print(f"{options.data_dir}/manifest.json written")
    return 0


if __name__ == "__main__":
    sys.exit(main())
