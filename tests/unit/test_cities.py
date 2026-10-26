import pytest

from voto_a_voto.cities import REGIONS, City, DuplicateSlugError, parse_cities, region_of, slugify
from voto_a_voto.tse_scrape import decode_jws


@pytest.mark.parametrize(
    "name, expected",
    [
        ("SÃO PAULO", "sao-paulo"),  # accents
        ("ALTA FLORESTA D'OESTE", "alta-floresta-d-oeste"),  # apostrophe
        ("ANHANGÜERA", "anhanguera"),  # diaeresis
        ("  Santa   Bárbara d’Oeste ", "santa-barbara-d-oeste"),  # typographic apostrophe and spaces
        ("ABU DHABI", "abu-dhabi"),
        ("POSTO-1", "posto-1"),
    ],
)
def test_slugify_gives_lowercase_ascii_hyphenated_slugs(name, expected):
    assert slugify(name) == expected


def test_every_one_of_the_27_ufs_has_a_region():
    assert len(REGIONS) == 27
    assert {region_of(uf) for uf in REGIONS} == {"norte", "nordeste", "centro-oeste", "sudeste", "sul"}


@pytest.mark.parametrize(
    "uf, region",
    [("ac", "norte"), ("ba", "nordeste"), ("df", "centro-oeste"), ("rj", "sudeste"), ("rs", "sul"), ("zz", "exterior")],
)
def test_region_of_maps_uf_and_overseas(uf, region):
    assert region_of(uf) == region


def test_parse_cities_reads_ibge_code_slug_and_region(config_jws):
    cities = parse_cities(decode_jws(config_jws))

    assert City(uf="ro", code="00310", ibge="1100015", name="ALTA FLORESTA D'OESTE", slug="alta-floresta-d-oeste", region="norte") in cities
    assert City(uf="mt", code="73709", ibge="5101837", name="BOA ESPERANÇA DO NORTE", slug="boa-esperanca-do-norte", region="centro-oeste") in cities


def test_parse_cities_keeps_overseas_posts_with_empty_ibge_and_region_exterior(config_jws):
    overseas = [city for city in parse_cities(decode_jws(config_jws)) if city.uf == "zz"]

    assert [city.ibge for city in overseas] == ["", "", ""]
    assert {city.region for city in overseas} == {"exterior"}
    assert "abidja" in {city.slug for city in overseas}


def test_parse_cities_fails_when_two_cities_of_a_state_share_a_slug():
    config = {"abr": [{"cd": "ac", "mu": [
        {"cd": "00001", "cdi": "1", "nm": "SÃO JOÃO"}, {"cd": "00002", "cdi": "2", "nm": "SAO JOAO"},
    ]}]}

    with pytest.raises(DuplicateSlugError, match="ac/sao-joao"):
        parse_cities(config)


def test_the_same_slug_is_allowed_in_different_states():
    config = {"abr": [
        {"cd": "ac", "mu": [{"cd": "00001", "cdi": "1", "nm": "BOA VISTA"}]},
        {"cd": "rr", "mu": [{"cd": "00002", "cdi": "2", "nm": "BOA VISTA"}]},
    ]}

    assert [city.slug for city in parse_cities(config)] == ["boa-vista", "boa-vista"]
