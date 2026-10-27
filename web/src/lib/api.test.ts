import { describe, expect, it } from 'vitest'
import { cityDataPath, latestDocument, shardEndpoints } from './api'
import { loadEditions } from './editions-load'

describe('the static API paths', () => {
  it('lists the shards of a dataset version', () => {
    expect(shardEndpoints('abc')).toEqual({
      search: 'data/vabc/search.json', totals: 'data/vabc/totals.json', centroids: 'data/vabc/centroids.json',
      state: 'data/vabc/state/{uf}.json', city: 'data/vabc/city/{uf}/{slug}.json',
    })
  })

  it('points the page download of a city at its shard', () => {
    expect(cityDataPath('abc', 'rj', 'cidade-exemplo')).toBe('data/vabc/city/rj/cidade-exemplo.json')
  })

  it('latest.json names the edition, its fingerprint and absolute addresses under the base', () => {
    const edition = loadEditions().find((e) => e.id === '2026-10-26')!
    const doc = latestDocument(edition, { origin: 'https://x.github.io', base: '/voto-a-voto-oss/' }) as { edition: string; endpoints: Record<string, string>; edition_json: string }
    expect(doc.edition).toBe('2026-10-26')
    expect(doc.endpoints.city).toBe(`https://x.github.io/voto-a-voto-oss/data/v${edition.fingerprint}/city/{uf}/{slug}.json`)
    expect(doc.edition_json).toBe('https://x.github.io/voto-a-voto-oss/edicoes/2026-10-26/edition.json')
  })
})
