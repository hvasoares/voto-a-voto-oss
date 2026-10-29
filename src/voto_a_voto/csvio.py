"""The one place that fixes how the committed CSV files are written and read back from bytes (ticket #145).

Written files are UTF-8 with LF line ends and the csv module's default quoting; read files are UTF-8 and keep embedded
newlines (``newline=""``). Two shapes stay outside on purpose: the TSE source files (latin-1, ``;``, ``munzona.py``) and the
scraper's own CSV (``DictWriter``, CRLF, ``tse_scrape.py``), because changing them would change bytes or the source format.
"""
import csv
import io
from collections.abc import Iterable, Sequence


def write_rows(header: Sequence[str], rows: Iterable[Sequence]) -> bytes:
    """UTF-8, LF, the header first and then one line per row, in the order given."""
    buffer = io.StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(rows)
    return buffer.getvalue().encode("utf-8")


def read_rows(content: bytes) -> list[dict]:
    """The rows of UTF-8 CSV bytes as dicts keyed by the header."""
    return list(csv.DictReader(io.StringIO(content.decode("utf-8"), newline="")))
