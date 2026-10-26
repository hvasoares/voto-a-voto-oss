"""City index from the TSE config file: names, IBGE codes, URL slugs and regions (pure functions)."""
import re
import unicodedata
from dataclasses import dataclass

OVERSEAS = "zz"

REGIONS: dict[str, str] = {
    **dict.fromkeys("ac am ap pa ro rr to".split(), "norte"),
    **dict.fromkeys("al ba ce ma pb pe pi rn se".split(), "nordeste"),
    **dict.fromkeys("df go ms mt".split(), "centro-oeste"),
    **dict.fromkeys("es mg rj sp".split(), "sudeste"),
    **dict.fromkeys("pr rs sc".split(), "sul"),
}


class DuplicateSlugError(ValueError):
    """Two cities of the same state would share one URL slug."""


@dataclass(frozen=True)
class City:
    uf: str
    code: str  # TSE municipality code, 5 digits as in the TSE URLs
    ibge: str  # 7 digits; empty for overseas posts
    name: str
    slug: str
    region: str


def slugify(name: str) -> str:
    """NFKD, ASCII only, lowercase, runs of anything else become one hyphen."""
    decomposed = unicodedata.normalize("NFKD", name)
    unaccented = "".join(char for char in decomposed if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", "-", unaccented.lower()).strip("-")


def region_of(uf: str) -> str:
    return "exterior" if uf == OVERSEAS else REGIONS[uf]


def parse_cities(config: dict) -> list[City]:
    """Every city (and overseas post) of a decoded ``mun-e00<eleicao>-cm`` config, in config order."""
    cities = []
    seen: dict[tuple[str, str], City] = {}
    for state in config["abr"]:
        uf = state["cd"]
        for entry in state["mu"]:
            slug = slugify(entry["nm"])
            city = City(uf=uf, code=entry["cd"], ibge=entry.get("cdi", ""), name=entry["nm"], slug=slug, region=region_of(uf))
            if (uf, slug) in seen:
                other = seen[(uf, slug)]
                raise DuplicateSlugError(f"{uf}/{slug}: {other.name!r} (TSE {other.code}) and {city.name!r} (TSE {city.code})")
            seen[(uf, slug)] = city
            cities.append(city)
    return cities
