"""Automatic publishing at TSE finalization (ticket #60).

``run_gate`` takes a build of the data (online first, then once more from the cache) and publishes it as a new edition
only when every check passes: the 2026 results are final ("Final, não ao vivo"), the tables have the committed schema, the
national totals equal the TSE's own and the two builds are byte-identical. Any failure publishes nothing, leaves ``data/``
and ``editions/<id>/`` as they were and records the reason in ``editions/status.json``. A published edition records its
checks (``publication``), which the feed shows. Nothing here reads the clock: the same inputs give the same record.
"""
import json
import tempfile
from collections.abc import Callable
from dataclasses import asdict, dataclass, field
from pathlib import Path

from voto_a_voto import editions, reconcile
from voto_a_voto.cli import BuildOptions, BuildResult, Services, build, write_build
from voto_a_voto.dataset import TABLES
from voto_a_voto.tse_scrape import NonFinalResultsError

STATUS_FILE = "status.json"
CHECK_FINAL = "Dados finais, não ao vivo"
CHECK_SCHEMA = "Esquema das tabelas"
CHECK_NATIONAL = "Totais nacionais iguais aos do TSE"
CHECK_DETERMINISM = "Build determinístico"


@dataclass(frozen=True)
class Check:
    name: str
    ok: bool
    detail: str


@dataclass
class Outcome:
    result: str  # published | unchanged | rejected
    checks: list[Check] = field(default_factory=list)
    edition: str | None = None

    def record(self) -> dict:
        return {"result": self.result, "edition": self.edition, "checks": [asdict(check) for check in self.checks]}


Builder = Callable[[bool], BuildResult]  # offline? -> a build that writes nothing


def schema_check(directory: Path) -> Check:
    """Every table has exactly the committed columns and the manifest lists them all."""
    problems = []
    for name, (_, columns) in TABLES.items():
        path = directory / name
        header = path.read_text(encoding="utf-8").split("\n", 1)[0].split(",") if path.exists() else None
        if header != list(columns):
            problems.append(f"{name}: cabeçalho {header}")
    manifest = json.loads((directory / "manifest.json").read_text(encoding="utf-8"))
    problems += [f"manifest.json sem {name}" for name in TABLES if name not in manifest.get("outputs", {})]
    return Check(CHECK_SCHEMA, not problems, "; ".join(problems) or f"{len(TABLES)} tabelas com as colunas esperadas e o manifesto completo")


def stage(result: BuildResult, directory: Path) -> dict[str, bytes]:
    write_build(result, directory)
    return editions.read_files(directory)


def evaluate(builder: Builder, scratch: Path) -> tuple[list[Check], dict[str, bytes] | None]:
    """Runs the checks in order. The files are returned only when all of them passed."""
    try:
        first = builder(False)
    except NonFinalResultsError as error:
        return [Check(CHECK_FINAL, False, f"{len(error.args[0])} cidade(s) ou turno(s) sem resultado final do TSE; nada foi publicado")], None
    checks = [Check(CHECK_FINAL, True, "todos os resultados de 2026 estão marcados como finais pelo TSE")]
    if first.failures or first.dataset is None:
        return [*checks, Check("Fontes", False, "; ".join(first.failures) or "sem dados")], None
    national = reconcile.check_national_totals(first.dataset, first.manifest["reference"])
    other = [finding for finding in first.findings if finding.check != "national_totals"]
    schema_dir = scratch / "first"
    files = stage(first, schema_dir)
    checks.append(schema_check(schema_dir))
    checks.append(Check(
        CHECK_NATIONAL, not national and not other,
        "; ".join(str(finding) for finding in [*national, *other][:5]) or "os totais de 2018, 2022 e 2026, com o exterior, batem com os do TSE",
    ))
    second_files = stage(builder(True), scratch / "second")
    same = files == second_files
    checks.append(Check(CHECK_DETERMINISM, same, "duas montagens dos mesmos arquivos dão bytes idênticos" if same else "duas montagens dos mesmos arquivos deram bytes diferentes"))
    return checks, files if all(check.ok for check in checks) else None


def run_gate(builder: Builder, data_dir: Path, editions_dir: Path, cache_dir: Path) -> Outcome:
    editions_dir = Path(editions_dir)
    cache_dir = Path(cache_dir)
    cache_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=cache_dir) as scratch:
        checks, files = evaluate(builder, Path(scratch))
    if files is None:
        outcome = Outcome("rejected", checks)
    elif any(edition["fingerprint"] == editions.fingerprint(files) for edition in editions.load_editions(editions_dir).values()):
        return Outcome("unchanged", checks)  # already an edition: nothing new, and a rollback is not undone
    else:
        data_dir = Path(data_dir)
        data_dir.mkdir(parents=True, exist_ok=True)
        for name in (*(n for n in editions.DATA_FILES if n != "manifest.json"), "manifest.json"):
            (data_dir / name).write_bytes(files[name])
        published = editions.publish(data_dir, editions_dir, publication={"mode": "automatic", "checks": [asdict(check) for check in checks]})
        outcome = Outcome("published", checks, published.id)
    editions_dir.mkdir(parents=True, exist_ok=True)
    (editions_dir / STATUS_FILE).write_bytes(editions.dump_json(outcome.record()))
    return outcome


def options_builder(options: BuildOptions, services: Services) -> Builder:
    """The real builder: the first call may use the network, the second is offline from the cache the first filled."""
    from dataclasses import replace

    return lambda offline: build(replace(options, offline=offline or options.offline), services)
