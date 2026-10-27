/**
 * Build-time loader of the fact records of one city (#61): one set per page of `/fato/<uf>/<slug>/` — a cycle and round with data, and
 * the curiosities when the city has a card of them. The city card and the fact pages read the same sets, so the figure and its
 * record cannot disagree; every set goes through the gate before it is handed out.
 */
import { displayName } from '../../shared/city-search'
import { CYCLES } from '../../shared/city-model'
import { cityShardResult } from '../city-shard'
import { factsOf } from '../curiosities'
import { datasetFixture, loadCityShard, loadCuriositiesFile } from '../shard-files'
import { curiosityLine } from '../../slots/city/curiosities'
import { assertPublishable } from './gate'
import { CURIOSITIES_PAGE, curiosityFacts, factPage, viewFacts, type Fact, type FactPlace } from './model'

export interface CityFacts {
  place: FactPlace
  /** Page key (`2026-1`, `curiosidades`) -> its records, in the order the card prints the figures. */
  pages: Map<string, Fact[]>
}

export async function loadCityFacts(uf: string, slug: string): Promise<CityFacts | undefined> {
  const shard = await loadCityShard(uf, slug)
  if (!shard) return undefined
  const place: FactPlace = { uf, slug, name: displayName(shard.city.nome), overseas: shard.city.uf === 'zz', fixture: await datasetFixture() }
  const pages = new Map<string, Fact[]>()
  for (const ano of CYCLES)
    for (const turno of [1, 2] as const) {
      const facts = viewFacts(cityShardResult(shard, ano, turno), place)
      if (facts.length) pages.set(factPage(ano, turno), facts)
    }
  const curio = await loadCuriositiesFile()
  const own = curio ? factsOf(curio, uf, slug) : []
  if (own.length) pages.set(CURIOSITIES_PAGE, curiosityFacts(own, place, (c, register) => curiosityLine(c, register)))
  for (const [page, facts] of pages) assertPublishable(facts, `/fato/${uf}/${slug}/${page}/`)
  return { place, pages }
}
