import { parseCities } from '@site/data/csv'
import { readFile } from 'node:fs/promises'
import { dataDir } from './data-dir'

export interface CityRoute {
  uf: string
  slug: string
  nome: string
  regiao: string
}

/** Build time only (Node): every city of the dataset, for the pre-rendered city routes of the shard contract. */
export async function loadCityRoutes(): Promise<CityRoute[]> {
  const cities = parseCities(await readFile(`${dataDir()}/cities.csv`, 'utf8'))
  return cities.map(({ uf, slug, nome, regiao }) => ({ uf, slug, nome, regiao }))
}