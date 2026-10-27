import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCentroids, parseCities } from '@/data/csv'
import { encodeCentroids } from '../../integrations/centroids'
import { distanceKm, locate, MAX_KM, type CentroidShard } from './nearest-city'

// The committed dataset: the real IBGE centres of 5,570 cities, joined to the cities of the site.
const real = (): CentroidShard => {
  const dir = resolve(import.meta.dirname, '../../../data')
  const read = (f: string) => readFileSync(resolve(dir, f), 'utf8')
  return encodeCentroids(parseCities(read('cities.csv')), parseCentroids(read('centroids.csv')))
}
const shard = real()

describe('where a position lands, fixed coordinates in three states', () => {
  // The nearest CENTRE: IBGE's centre of a large municipality can be far from its downtown, so the points are in
  // the municipality's own area, not at a landmark of the city.
  it.each([
    ['Campo Grande, Rio de Janeiro (RJ)', -22.9027, -43.5586, 'rj', 'rio-de-janeiro'],
    ['Jabaquara, São Paulo (SP)', -23.62, -46.65, 'sp', 'sao-paulo'],
    ['Cuiabá (MT)', -15.52, -55.9, 'mt', 'cuiaba'],
  ])('%s opens its own city', (_name, lat, lon, uf, slug) => {
    expect(locate(shard, lat, lon)).toMatchObject({ status: 'found', uf, slug })
  })

  it('a point between two cities opens the nearer one', () => {
    expect(locate(shard, -22.91, -43.06)).toMatchObject({ status: 'found', uf: 'rj', slug: 'niteroi' })
    expect(locate(shard, -22.91, -43.4)).toMatchObject({ status: 'found', uf: 'rj', slug: 'rio-de-janeiro' })
  })

  it('reports how far the centre is, in kilometres', () => {
    const found = locate(shard, -15.52, -55.9)
    expect(found.status === 'found' && found.km).toBeGreaterThan(0)
    expect(found.status === 'found' && found.km).toBeLessThan(10)
  })
})

describe('outside Brazil', () => {
  it.each([
    ['Lisbon', 38.7223, -9.1393],
    ['Miami', 25.7617, -80.1918],
    ['Buenos Aires', -34.6037, -58.3816],
    ['Santiago', -33.4489, -70.6693],
    ['Bogotá', 4.711, -74.0721],
    ['the middle of the Atlantic', -20, -20],
  ])('%s is outside', (_name, lat, lon) => {
    expect(locate(shard, lat, lon)).toEqual({ status: 'outside' })
  })

  it('a position that is not a position is outside, never a crash', () => {
    for (const [lat, lon] of [[NaN, 0], [91, 0], [0, 181], [Infinity, 0]] as const) expect(locate(shard, lat, lon)).toEqual({ status: 'outside' })
  })

  it('an empty shard has no city to offer', () => {
    expect(locate({}, -22.9, -43.2)).toEqual({ status: 'outside' })
  })
})

describe('the shard of the fixture world', () => {
  const fixture: CentroidShard = { rj: [['a', -22.9, -43.2], ['b', -22.5, -43.0]], sp: [['c', -23.5, -46.6]], mt: [['d', -15.6, -56.1]] }

  it('picks across states, nearest first', () => {
    expect(locate(fixture, -22.52, -43.01)).toMatchObject({ uf: 'rj', slug: 'b' })
    expect(locate(fixture, -23.4, -46.5)).toMatchObject({ uf: 'sp', slug: 'c' })
    expect(locate(fixture, -15.7, -56.0)).toMatchObject({ uf: 'mt', slug: 'd' })
  })

  it('farther than the limit from every centre is outside, even inside the bounding box of Brazil', () => {
    expect(locate(fixture, -3.0, -40.0)).toEqual({ status: 'outside' })
    expect(MAX_KM).toBeGreaterThan(100)
  })
})

describe('distance', () => {
  it('is zero to itself and about 357 km from Rio to São Paulo', () => {
    expect(distanceKm(-22.9, -43.2, -22.9, -43.2)).toBe(0)
    expect(distanceKm(-22.9068, -43.1729, -23.5505, -46.6333)).toBeGreaterThan(350)
    expect(distanceKm(-22.9068, -43.1729, -23.5505, -46.6333)).toBeLessThan(365)
  })
})
