import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadSearchCities } from './search-data'

afterEach(() => vi.unstubAllGlobals())

describe('loadSearchCities (the one function #49 replaces with a shard)', () => {
  it('fetches cities.csv from the site own base path and parses it', async () => {
    const fetchMock = vi.fn(async () => new Response('uf,cd_municipio,cd_ibge,nome,slug,regiao,ciclos\nrj,1,3304557,Cidade Exemplo,cidade-exemplo,sudeste,2018;2022;2026\n'))
    vi.stubGlobal('fetch', fetchMock)
    const cities = await loadSearchCities('/voto-a-voto/')
    expect(fetchMock).toHaveBeenCalledWith('/voto-a-voto/data/cities.csv')
    expect(cities.map((c) => [c.uf, c.slug])).toEqual([['rj', 'cidade-exemplo']])
  })

  it('fails loudly on an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    await expect(loadSearchCities('/')).rejects.toThrow(/cities.csv.*404/)
  })
})
