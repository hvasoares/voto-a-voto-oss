"""The open dataset release of one edition (ticket #63): the normalized municipal results as CSV and NDJSON in a stable
schema, with a data dictionary, a README, a citation file and a SHA-256 manifest. A pure function of the edition's frozen
files, its id and its date: the same edition always gives the same bytes (``make data-check`` rebuilds and compares)."""
import csv
import hashlib
import io
import json
from dataclasses import fields

from voto_a_voto import dataset

SITE = "https://voto-a-voto.com"
LICENSE = "CC-BY-4.0"
LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/deed.pt-br"
# What the release carries: the normalized results (no centroids: those are IBGE geography, not results).
TABLES = ("cities.csv", "turnout.csv", "candidates.csv", "votes.csv")
SOURCE_2026 = "TSE, resultados oficiais assinados de 2026 (resultados.tse.jus.br), um arquivo por município"
SOURCE_OPEN = "TSE, dados abertos (votacao_candidato_munzona e detalhe_votacao_munzona), somados por município"
SOURCE_BOTH = "TSE: dados abertos de 2018 e 2022, resultados oficiais de 2026"
SOURCE_CALC = "calculado pelo projeto a partir dos arquivos do TSE"

# (arquivo, campo) -> (tipo, significado, fonte)
FIELDS: dict[tuple[str, str], tuple[str, str, str]] = {
    ("cities.csv", "uf"): ("texto", "Sigla do estado em minúsculas (rj, sp...). Os postos de votação no exterior têm uf zz.", SOURCE_BOTH),
    ("cities.csv", "cd_municipio"): ("inteiro", "Código TSE do município (sem zeros à esquerda). Com uf, identifica a cidade nas outras tabelas.", SOURCE_BOTH),
    ("cities.csv", "cd_ibge"): ("texto", "Código IBGE de 7 dígitos do município. Vazio (null no NDJSON) nos postos do exterior.", "IBGE, por correspondência com o código TSE"),
    ("cities.csv", "nome"): ("texto", "Nome do município, como o TSE o grafa.", SOURCE_BOTH),
    ("cities.csv", "slug"): ("texto", "Nome sem acentos, em minúsculas e com hífens; único dentro da uf. Usado nos endereços do site.", SOURCE_CALC),
    ("cities.csv", "regiao"): ("texto", "Região: norte, nordeste, centro-oeste, sudeste, sul ou exterior (postos fora do Brasil).", SOURCE_CALC),
    ("cities.csv", "ciclos"): ("lista", "Eleições com dados do município, separadas por ponto e vírgula no CSV (2018;2022;2026) e lista de inteiros no NDJSON. Um ciclo ausente significa sem dados, não zero.", SOURCE_CALC),
    ("turnout.csv", "ano"): ("inteiro", "Ano da eleição: 2018, 2022 ou 2026.", SOURCE_BOTH),
    ("turnout.csv", "turno"): ("inteiro", "Turno: 1 ou 2.", SOURCE_BOTH),
    ("turnout.csv", "uf"): ("texto", "Sigla do estado em minúsculas; zz para o exterior.", SOURCE_BOTH),
    ("turnout.csv", "cd_municipio"): ("inteiro", "Código TSE do município; chave com uf para cities.csv.", SOURCE_BOTH),
    ("turnout.csv", "aptos"): ("inteiro", "Eleitorado apto a votar no município e turno.", SOURCE_BOTH),
    ("turnout.csv", "comparecimento"): ("inteiro", "Eleitores que compareceram.", SOURCE_BOTH),
    ("turnout.csv", "abstencoes"): ("inteiro", "Eleitores que não compareceram, como o TSE informa.", SOURCE_BOTH),
    ("turnout.csv", "brancos"): ("inteiro", "Votos em branco.", SOURCE_BOTH),
    ("turnout.csv", "nulos"): ("inteiro", "Votos nulos. Em 2026 é o total de nulos do TSE, técnicos incluídos.", SOURCE_BOTH),
    ("turnout.csv", "anulados_apu_sep"): ("inteiro", "Votos anulados em apuração separada (QT_VOTOS_ANULADOS_APU_SEP): contam no comparecimento e não são válidos, brancos nem nulos. É 0 em tudo, exceto 2018 turno 1 em Salvador/BA (746).", SOURCE_OPEN),
    ("turnout.csv", "validos"): ("inteiro", "Votos válidos (nos candidatos). Vale validos + brancos + nulos + anulados_apu_sep = comparecimento.", SOURCE_BOTH),
    ("candidates.csv", "ano"): ("inteiro", "Ano da eleição.", SOURCE_BOTH),
    ("candidates.csv", "turno"): ("inteiro", "Turno: 1 ou 2.", SOURCE_BOTH),
    ("candidates.csv", "candidato_numero"): ("inteiro", "Número do candidato na urna. Números se repetem entre ciclos: use sempre com ano.", SOURCE_BOTH),
    ("candidates.csv", "nome_urna"): ("texto", "Nome de urna do candidato.", SOURCE_BOTH),
    ("candidates.csv", "partido"): ("texto", "Sigla do partido do candidato.", SOURCE_BOTH),
    ("votes.csv", "ano"): ("inteiro", "Ano da eleição.", SOURCE_BOTH),
    ("votes.csv", "turno"): ("inteiro", "Turno: 1 ou 2.", SOURCE_BOTH),
    ("votes.csv", "uf"): ("texto", "Sigla do estado em minúsculas; zz para o exterior.", SOURCE_BOTH),
    ("votes.csv", "cd_municipio"): ("inteiro", "Código TSE do município; chave com uf para cities.csv.", SOURCE_BOTH),
    ("votes.csv", "candidato_numero"): ("inteiro", "Número do candidato; chave com ano e turno para candidates.csv.", SOURCE_BOTH),
    ("votes.csv", "votos"): ("inteiro", "Votos do candidato no município e turno.", SOURCE_BOTH),
}


def release_name(edition_id: str) -> str:
    return f"voto-a-voto-{edition_id}"


def release_url(edition_id: str) -> str:
    return f"{SITE}/edicoes/{edition_id}/dados/"


def columns_of(table: str) -> tuple[str, ...]:
    return dataset.TABLES[table][1]


def field_types(table: str) -> dict[str, type]:
    return {f.name: f.type for f in fields(dataset.TABLES[table][0])}


def ndjson(table: str, content: bytes) -> bytes:
    """One JSON object per row, keys in column order. Integers are integers, an empty cell is null, ``ciclos`` is a list."""
    types = field_types(table)
    lines = []
    for row in csv.DictReader(io.StringIO(content.decode("utf-8"), newline="")):
        record = {}
        for name in columns_of(table):
            cell = row[name]
            if cell == "":
                record[name] = None
            elif name == "ciclos":
                record[name] = [int(year) for year in cell.split(";")]
            elif types[name] is int:
                record[name] = int(cell)
            else:
                record[name] = cell
        lines.append(json.dumps(record, ensure_ascii=False, separators=(",", ":")))
    return ("\n".join(lines) + "\n").encode("utf-8")


def dictionary() -> bytes:
    out = io.StringIO(newline="")
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(["arquivo", "campo", "tipo", "significado", "fonte"])
    for table in TABLES:
        for name in columns_of(table):
            kind, meaning, source = FIELDS[(table, name)]
            writer.writerow([table, name, kind, meaning, source])
    return out.getvalue().encode("utf-8")


def readme(edition: dict) -> bytes:
    counts = edition["counts"]
    rows = counts["rows"]
    edition_id = edition["id"]
    text = f"""# Voto a Voto: resultados por município, edição {edition_id}

Resultados da eleição presidencial de 2018, 2022 e 2026 por município, normalizados e conferidos, na edição de {edition["date"]} (id `{edition_id}`).
Endereço permanente: {release_url(edition_id)}

## Arquivos

| Arquivo | O que tem | Linhas |
|---|---|---|
| `cities.csv`, `cities.ndjson` | um município (ou posto no exterior) por linha | {rows["cities.csv"]} |
| `turnout.csv`, `turnout.ndjson` | comparecimento, abstenção, brancos, nulos e válidos por ano, turno e município | {rows["turnout.csv"]} |
| `candidates.csv`, `candidates.ndjson` | os candidatos de cada ano e turno | {rows["candidates.csv"]} |
| `votes.csv`, `votes.ndjson` | votos de cada candidato por ano, turno e município | {rows["votes.csv"]} |
| `dicionario.csv` | cada campo de cada arquivo: tipo, significado e fonte | |
| `CITATION.cff` | como citar esta edição | |
| `SHA256SUMS` | SHA-256 de todos os outros arquivos | |

O CSV é UTF-8, com quebra de linha LF, colunas em ordem fixa e linhas ordenadas pela chave. O NDJSON tem um objeto JSON por linha, com as mesmas colunas, na mesma ordem e na mesma ordem de linhas: números são inteiros, uma célula vazia vira `null` e `ciclos` é uma lista de inteiros. O esquema (nomes e ordem das colunas) não muda entre edições; um campo novo só entra com um aviso aqui.

## Como as tabelas se ligam

`turnout` e `votes` ligam a `cities` por `uf` + `cd_municipio`; `votes` liga a `candidates` por `ano` + `turno` + `candidato_numero`. Números de candidato se repetem entre ciclos: sempre use o ano.

## Cuidados

- **Empates.** Não há campo de vencedor nem de margem. Um empate entre candidatos aparece apenas como dois candidatos com o mesmo número em `votos`; quem calcula vencedores precisa decidir o que fazer com ele.
- **Exterior.** Os postos de votação fora do Brasil têm `uf` = `zz`, `regiao` = `exterior` e `cd_ibge` vazio. Entram nos totais nacionais e não em totais por região ou estado. Em 2026, {counts["overseas_posts"]} postos constam em `cities`; alguns não foram instalados e têm eleitorado declarado e comparecimento zero.
- **Sem dados não é zero.** Um município ausente de um ciclo (Boa Esperança do Norte/MT existe só em 2026) não tem linhas nesse ciclo; `ciclos` diz em quais há dados.
- **Votos anulados em apuração separada.** `anulados_apu_sep` conta no comparecimento e não é válido, branco nem nulo (2018, turno 1, Salvador/BA, 746 votos). Em todas as linhas vale `validos + brancos + nulos + anulados_apu_sep = comparecimento`.
- **Totais nacionais.** A soma de todas as linhas, com o exterior, é igual aos totais que o próprio TSE publica para cada ciclo e turno; isso é conferido antes de cada edição.

## Origem

Resultados de 2026: arquivos oficiais assinados do site de resultados do TSE. Resultados de 2018 e 2022: dados abertos do TSE por município e zona, somados por município. As fontes, datas de coleta e hashes estão em `manifest.json` do repositório (https://github.com/hvasoares/voto-a-voto-oss) e na página https://voto-a-voto.com/sobre-os-dados/. O pipeline é determinístico: os mesmos arquivos de origem geram exatamente os mesmos bytes.

## Licença

Os arquivos desta edição (a compilação e a normalização feitas pelo projeto) são distribuídos sob Creative Commons Atribuição 4.0 ({LICENSE_URL}). Os resultados em si são publicações oficiais do TSE; atribua a fonte (TSE) e o projeto.

## Como citar

Voto a Voto. Resultados da eleição presidencial por município, edição {edition_id}. {release_url(edition_id)}

Identificador: `{release_name(edition_id)}`. O endereço e os arquivos desta edição nunca mudam; uma edição nova tem outro endereço. Não há DOI. Veja também `CITATION.cff`.

## Conferir os arquivos

Na pasta dos arquivos: `shasum -a 256 -c SHA256SUMS` (ou `sha256sum -c SHA256SUMS`).
"""
    return text.encode("utf-8")


def citation_cff(edition: dict) -> bytes:
    edition_id = edition["id"]
    text = f"""cff-version: 1.2.0
message: "Se usar estes dados, cite esta edição."
title: "Voto a Voto: resultados da eleição presidencial por município, edição {edition_id}"
version: "{edition_id}"
date-released: "{edition["date"]}"
license: {LICENSE}
url: "{release_url(edition_id)}"
repository-code: "https://github.com/hvasoares/voto-a-voto-oss"
identifiers:
  - type: other
    value: "{release_name(edition_id)}"
    description: "Identificador da edição"
  - type: url
    value: "{release_url(edition_id)}"
    description: "Endereço permanente"
authors:
  - name: "Voto a Voto"
"""
    return text.encode("utf-8")


def sha256sums(files: dict[str, bytes]) -> bytes:
    return "".join(f"{hashlib.sha256(files[name]).hexdigest()}  {name}\n" for name in sorted(files)).encode("utf-8")


def build(data_files: dict[str, bytes], edition: dict) -> dict[str, bytes]:
    """Every file of the release, by name. ``edition`` needs ``id``, ``date`` and ``counts``."""
    files = {name: data_files[name] for name in TABLES}
    files.update({name.replace(".csv", ".ndjson"): ndjson(name, data_files[name]) for name in TABLES})
    files["dicionario.csv"] = dictionary()
    files["LEIAME.md"] = readme(edition)
    files["CITATION.cff"] = citation_cff(edition)
    files["SHA256SUMS"] = sha256sums(files)
    return dict(sorted(files.items()))


def describe(files: dict[str, bytes], edition_id: str) -> dict:
    return {
        "identifier": release_name(edition_id), "license": LICENSE, "url": release_url(edition_id),
        "files": {name: {"bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()} for name, content in files.items()},
    }
