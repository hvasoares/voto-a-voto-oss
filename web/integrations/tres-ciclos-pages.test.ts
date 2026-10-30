import { describe, expect, it } from 'vitest'
import { loadCityRoutes } from '../src/lib/city-routes'
import { loadCityShard } from '../src/lib/shard-files'
import { cityDataPath } from '../src/lib/api'
import { loadDatasetShards } from './shards'
import { joinPageData } from './page-data'

/**
 * The three-cycles family reads the city shard and writes no data file of its own (private#216): the shard already carries both rounds of the three cycles that
 * `buildCycleBlock` and `roundPanel` need. This pins the fields the page reads on the fixture (a golden of the shard's used part, so a change of the shard that
 * would change the page is seen here) and the join of the family: every city has exactly one stub and exactly one shard, and no shard belongs to no city.
 */
describe('the shard fields the three-cycles page reads (golden, fixture)', () => {
  it('pins the city, the turnout and vote blocks of every cycle and round, and the names of the candidates', async () => {
    const shard = (await loadCityShard('rj', 'cidade-exemplo'))!
    const used = {
      city: { uf: shard.city.uf, slug: shard.city.slug, nome: shard.city.nome, cdMunicipio: shard.city.cdMunicipio, ciclos: shard.city.ciclos },
      cycles: Object.fromEntries(Object.entries(shard.cycles).map(([ano, rounds]) => [ano, Object.fromEntries(Object.entries(rounds).map(([turno, block]) => [turno, Object.keys(block).sort()]))])),
      candidates: Object.fromEntries(Object.entries(shard.candidates).map(([ano, rounds]) => [ano, Object.fromEntries(Object.entries(rounds).map(([turno, names]) => [turno, Object.keys(names).sort()]))])),
    }
    expect(used).toMatchSnapshot()
  })
})

describe('the join of the three-cycles family', () => {
  it('has exactly one stub and one shard for each city route, and no shard without a stub', async () => {
    const routes = (await loadCityRoutes()).map((c) => `${c.uf}/${c.slug}`)
    expect(routes.length).toBeGreaterThan(1)
    const built = loadDatasetShards().built
    const files = built.files.map((f) => f.path).filter((p) => p.startsWith(`v${built.fingerprint}/city/`))
    expect(joinPageData('city', built.fingerprint, routes, files)).toEqual([])
    // the address the stub's script fetches is the one the city card links
    expect(cityDataPath(built.fingerprint, 'rj', 'cidade-exemplo')).toBe(`data/v${built.fingerprint}/city/rj/cidade-exemplo.json`)
  })
})
