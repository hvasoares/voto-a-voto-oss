"""Aggregate the presidential rows of a TSE votacao_candidato_munzona zip into municipality totals (same shape as presidente_2022_municipios.csv)."""
import csv
import io
import sys
import zipfile
from collections import defaultdict

PRESIDENT = "1"
OVERSEAS = "ZZ"  # exterior votes have no municipality polygon; presidente_2022_municipios.csv leaves them out too


def aggregate(zip_path, year):
    totals = defaultdict(int)
    with zipfile.ZipFile(zip_path) as archive:
        with archive.open(f"votacao_candidato_munzona_{year}_BR.csv") as raw:
            rows = csv.DictReader(io.TextIOWrapper(raw, encoding="latin-1", newline=""), delimiter=";")
            for row in rows:
                if row["CD_CARGO"] == PRESIDENT and row["SG_UF"] != OVERSEAS:
                    key = (int(row["NR_TURNO"]), row["SG_UF"].lower(), int(row["CD_MUNICIPIO"]), int(row["NR_CANDIDATO"]))
                    totals[key] += int(row["QT_VOTOS_NOMINAIS"])
    return totals


def main(zip_path, year, out_path):
    with open(out_path, "w", encoding="utf-8", newline="") as out:
        writer = csv.writer(out, lineterminator="\n")
        writer.writerow(["turno", "uf", "cd_municipio", "candidato_numero", "votos"])
        for key, votos in sorted(aggregate(zip_path, year).items()):
            writer.writerow([*key, votos])


if __name__ == "__main__":
    main(*sys.argv[1:4])
