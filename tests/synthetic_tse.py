"""Synthetic TSE open-data zips for the legislative tests: latin-1, ``;``, every field quoted, like the real files."""
import io
import zipfile

import pytest

CANDIDATE_COLUMNS = (
    "ANO_ELEICAO", "CD_TIPO_ELEICAO", "NR_TURNO", "SG_UF", "CD_MUNICIPIO", "NM_MUNICIPIO", "NR_ZONA", "CD_CARGO", "DS_CARGO", "SQ_CANDIDATO",
    "NR_CANDIDATO", "NM_CANDIDATO", "NM_URNA_CANDIDATO", "SG_PARTIDO", "SG_FEDERACAO", "DS_SIT_TOT_TURNO", "ST_VOTO_EM_TRANSITO",
    "QT_VOTOS_NOMINAIS", "QT_VOTOS_NOMINAIS_VALIDOS",
)
DETAIL_COLUMNS = (
    "ANO_ELEICAO", "CD_TIPO_ELEICAO", "NR_TURNO", "SG_UF", "CD_MUNICIPIO", "NM_MUNICIPIO", "NR_ZONA", "CD_CARGO", "DS_CARGO", "QT_APTOS",
    "QT_COMPARECIMENTO", "QT_ABSTENCOES", "QT_VOTOS", "QT_TOTAL_VOTOS_VALIDOS", "QT_VOTOS_NOMINAIS_VALIDOS",
    "QT_TOTAL_VOTOS_LEG_VALIDOS", "QT_VOTOS_BRANCOS", "QT_TOTAL_VOTOS_NULOS", "QT_TOTAL_VOTOS_ANULADOS", "QT_TOTAL_VOTOS_ANUL_SUBJUD", "QT_VOTOS_ANULADOS_APU_SEP",
    "HH_ULTIMA_TOTALIZACAO", "DT_ULTIMA_TOTALIZACAO",
)
CANDIDATE_DEFAULTS = {
    "ANO_ELEICAO": "2022", "CD_TIPO_ELEICAO": "2", "NR_TURNO": "1", "SG_UF": "PI", "CD_MUNICIPIO": "10430", "NM_MUNICIPIO": "CAMPO MAIOR", "NR_ZONA": "1",
    "CD_CARGO": "5", "DS_CARGO": "Senador", "SQ_CANDIDATO": "1", "NR_CANDIDATO": "111", "NM_CANDIDATO": "ANA SOUZA", "NM_URNA_CANDIDATO": "ANA",
    "SG_PARTIDO": "PX", "SG_FEDERACAO": "#NULO#", "DS_SIT_TOT_TURNO": "ELEITO", "ST_VOTO_EM_TRANSITO": "N", "QT_VOTOS_NOMINAIS": "0",
    "QT_VOTOS_NOMINAIS_VALIDOS": "0",
}
DETAIL_DEFAULTS = {
    "ANO_ELEICAO": "2022", "CD_TIPO_ELEICAO": "2", "NR_TURNO": "1", "SG_UF": "PI", "CD_MUNICIPIO": "10430", "NM_MUNICIPIO": "CAMPO MAIOR", "NR_ZONA": "1",
    "CD_CARGO": "5", "DS_CARGO": "Senador", "QT_APTOS": "0", "QT_COMPARECIMENTO": "0", "QT_ABSTENCOES": "0", "QT_VOTOS": "0",
    "QT_TOTAL_VOTOS_VALIDOS": "0", "QT_VOTOS_NOMINAIS_VALIDOS": "0", "QT_TOTAL_VOTOS_LEG_VALIDOS": "0", "QT_VOTOS_BRANCOS": "0",
    "QT_TOTAL_VOTOS_NULOS": "0", "QT_TOTAL_VOTOS_ANULADOS": "0", "QT_TOTAL_VOTOS_ANUL_SUBJUD": "0", "QT_VOTOS_ANULADOS_APU_SEP": "0", "HH_ULTIMA_TOTALIZACAO": "22:00:00",
    "DT_ULTIMA_TOTALIZACAO": "03/10/2022",
}
CARGO_NAMES = {"5": "Senador", "6": "Deputado Federal"}


def tse_csv(columns, defaults, rows) -> bytes:
    lines = [";".join(f'"{name}"' for name in columns)]
    for row in rows:
        merged = {**defaults, **{key: str(value) for key, value in row.items()}}
        lines.append(";".join(f'"{merged[name]}"' for name in columns))
    return ("\r\n".join(lines) + "\r\n").encode("latin-1")


def candidate_csv(*rows) -> bytes:
    return tse_csv(CANDIDATE_COLUMNS, CANDIDATE_DEFAULTS, rows)


def detail_csv(*rows) -> bytes:
    return tse_csv(DETAIL_COLUMNS, DETAIL_DEFAULTS, rows)


def tse_zip(members: dict[str, bytes]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in members.items():
            archive.writestr(name, content)
    return buffer.getvalue()


def uf_rows(year: int, uf: str = "PI", cd: int = 10430):
    """``(candidate rows, detail rows)`` of one consistent municipality in two zones (factor 1 and 2).

    Senador: ANA 100 and BIA 50 nominal votes per unit, 5 blank, 7 null (valid 150, cast 162). Deputado Federal: CAIO 30 and DORA 20
    nominal, 10 legend, 3 blank, 2 null (valid 60, cast 65). In 2018 every voter had two Senate votes: every Senate vote count doubles
    while ``QT_COMPARECIMENTO`` does not."""
    candidates, detail = [], []
    where = {"ANO_ELEICAO": year, "SG_UF": uf, "CD_MUNICIPIO": cd}
    votes_per_voter = 2 if year == 2018 else 1
    for zone, factor in (("1", 1), ("2", 2)):
        senate = factor * votes_per_voter
        for number, name, cargo, votes in (("111", "ANA", "5", 100), ("222", "BIA", "5", 50), ("1111", "CAIO", "6", 30), ("2222", "DORA", "6", 20)):
            scaled = votes * (senate if cargo == "5" else factor)
            candidates.append({**where, "NR_ZONA": zone, "CD_CARGO": cargo, "DS_CARGO": CARGO_NAMES[cargo], "NR_CANDIDATO": number,
                               "SQ_CANDIDATO": number, "NM_CANDIDATO": f"{name} DA SILVA", "NM_URNA_CANDIDATO": name,
                               "QT_VOTOS_NOMINAIS": scaled, "QT_VOTOS_NOMINAIS_VALIDOS": scaled})
        detail.append({**where, "NR_ZONA": zone, "CD_CARGO": "5", "DS_CARGO": "Senador", "QT_APTOS": 300 * factor, "QT_COMPARECIMENTO": 162 * factor,
                       "QT_ABSTENCOES": 138 * factor, "QT_VOTOS": 162 * senate, "QT_TOTAL_VOTOS_VALIDOS": 150 * senate,
                       "QT_VOTOS_NOMINAIS_VALIDOS": 150 * senate, "QT_VOTOS_BRANCOS": 5 * senate, "QT_TOTAL_VOTOS_NULOS": 7 * senate})
        detail.append({**where, "NR_ZONA": zone, "CD_CARGO": "6", "DS_CARGO": "Deputado Federal", "QT_APTOS": 300 * factor,
                       "QT_COMPARECIMENTO": 65 * factor, "QT_ABSTENCOES": 235 * factor, "QT_VOTOS": 65 * factor, "QT_TOTAL_VOTOS_VALIDOS": 60 * factor,
                       "QT_VOTOS_NOMINAIS_VALIDOS": 50 * factor, "QT_TOTAL_VOTOS_LEG_VALIDOS": 10 * factor, "QT_VOTOS_BRANCOS": 3 * factor,
                       "QT_TOTAL_VOTOS_NULOS": 2 * factor})
    return candidates, detail


def legislative_zip_pair(year: int, candidates=None, detail=None, uf: str = "PI") -> tuple[bytes, bytes]:
    """Candidate and detail zips with one UF member plus the ``_BR`` (president) and ``_BRASIL`` members every real zip has,
    filled with junk the extraction must not read."""
    default_candidates, default_detail = uf_rows(year, uf)
    junk = candidate_csv({"CD_CARGO": "6", "QT_VOTOS_NOMINAIS": 999999, "QT_VOTOS_NOMINAIS_VALIDOS": 999999})
    junk_detail = detail_csv({"CD_CARGO": "6", "QT_VOTOS": 999999})
    kind_c, kind_d = "votacao_candidato_munzona", "detalhe_votacao_munzona"
    return (
        tse_zip({f"{kind_c}_{year}_{uf}.csv": candidate_csv(*(candidates or default_candidates)), f"{kind_c}_{year}_BR.csv": junk,
                 f"{kind_c}_{year}_BRASIL.csv": junk, "leiame.pdf": b"%PDF"}),
        tse_zip({f"{kind_d}_{year}_{uf}.csv": detail_csv(*(detail or default_detail)), f"{kind_d}_{year}_BR.csv": junk_detail,
                 f"{kind_d}_{year}_BRASIL.csv": junk_detail, "leiame.pdf": b"%PDF"}),
    )


@pytest.fixture
def legislative_zips():
    return legislative_zip_pair
