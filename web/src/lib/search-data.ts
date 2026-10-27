import { parseCities } from '@site/data/csv'
import type { City } from '@site/data'
import { withBase } from '@site/paths'

/**
 * The ONE place that decides where the search gets its cities. Today: the cities.csv copied next to the site
 * (same as the vanilla home). Ticket #49 replaces the body with the pre-rendered search index shard; callers stay.
 */
export async function loadSearchCities(base: string): Promise<City[]> {
  const res = await fetch(withBase(base, 'data/cities.csv'))
  if (!res.ok) throw new Error(`data/cities.csv: HTTP ${res.status}`)
  return parseCities(await res.text())
}
