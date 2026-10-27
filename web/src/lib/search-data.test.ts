import { afterEach, describe, expect, it, vi } from 'vitest'
import { SHARD_VERSION } from 'virtual:data-shards'
import { loadSearchCities } from './search-data'

afterEach(() => vi.unstubAllGlobals())

describe('loadSearchCities (the one function #49 replaced with the shard)', () => {
  it('fetches the versioned search index shard and maps its rows onto the City shape', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([['Cidade Exemplo', 'cidade-exemplo', 'rj'], ['Exterior', 'exterior', 'zz']])))
    vi.stubGlobal('fetch', fetchMock)
    const cities = await loadSearchCities('/voto-a-voto/')
    expect(fetchMock).toHaveBeenCalledWith(`/voto-a-voto/data/v${SHARD_VERSION}/search.json`)
    expect(cities.map((c) => [c.uf, c.slug, c.nome])).toEqual([
      ['rj', 'cidade-exemplo', 'Cidade Exemplo'],
      ['zz', 'exterior', 'Exterior'],
    ])
  })

  it('fails loudly on an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    await expect(loadSearchCities('/')).rejects.toThrow(/search\.json.*404/)
  })

  it('fails loudly when the shard does not look like [nome, slug, uf] rows', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ cities: [] }))))
    await expect(loadSearchCities('/')).rejects.toThrow(/unexpected rows/)
  })
})