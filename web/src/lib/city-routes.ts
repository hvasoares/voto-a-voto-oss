import { loadSearchShard, loadStateShard } from './shard-files'

export interface CityRoute {
  uf: string
  slug: string
  nome: string
  regiao: string
}

/** Build time only (Node): every city of the dataset, from the search shard's rows (`[nome, slug, uf]`), with the
 * region its state shard carries (empty when the shards are not built). Overseas posts ('zz') included. */
export async function loadCityRoutes(): Promise<CityRoute[]> {
  const rows = (await loadSearchShard()) ?? []
  const estados = new Map<string, Promise<string>>()
  const regiao = (uf: string) =>
    estados.get(uf) ?? estados.set(uf, loadStateShard(uf).then((s) => s?.regiao ?? '')).get(uf)!
  return Promise.all(rows.map(async ([nome, slug, uf]) => ({ uf, slug, nome, regiao: await regiao(uf) })))
}