import { describe, expect, it, vi } from 'vitest'
import { findMyCity, type GeolocationLike } from './locate-flow'
import { LOCATE_MESSAGES } from './locate-messages'
import type { CentroidShard } from './nearest-city'

const shard: CentroidShard = {
  rj: [['rio-de-janeiro', -22.9255, -43.458], ['niteroi', -22.9151, -43.0547]],
  sp: [['sao-paulo', -23.6501, -46.6481]],
  mt: [['cuiaba', -15.5056, -55.8792]],
}
const loadShard = async () => shard

/** A browser position API that answers at once with fixed coordinates. */
const at = (latitude: number, longitude: number): GeolocationLike => ({
  getCurrentPosition: (ok) => ok({ coords: { latitude, longitude } }),
})
/** One that refuses with the W3C error code (1 denied, 2 unavailable, 3 timeout). */
const failing = (code: number): GeolocationLike => ({ getCurrentPosition: (_ok, fail) => fail?.({ code }) })

describe('finding my city from a position, fixed coordinates in three states', () => {
  it.each([
    ['rj', -22.90, -43.55, 'rio-de-janeiro'],
    ['sp', -23.60, -46.65, 'sao-paulo'],
    ['mt', -15.55, -55.85, 'cuiaba'],
  ])('a position in %s opens %s', async (uf, lat, lon, slug) => {
    expect(await findMyCity({ geolocation: at(lat, lon), loadShard })).toEqual({ status: 'found', uf, slug })
  })
})

describe('when there is nothing to open', () => {
  it('a position outside Brazil says so', async () => {
    expect(await findMyCity({ geolocation: at(38.72, -9.14), loadShard })).toEqual({ status: 'outside' })
  })
  it.each([
    [1, 'denied'],
    [2, 'unavailable'],
    [3, 'timeout'],
    [99, 'unavailable'],
  ])('a position error with code %i is "%s"', async (code, status) => {
    expect(await findMyCity({ geolocation: failing(code), loadShard })).toEqual({ status })
  })
  it('a browser without a position API is "unsupported"', async () => {
    expect(await findMyCity({ geolocation: undefined, loadShard })).toEqual({ status: 'unsupported' })
  })
  it('a city list that cannot be loaded is "unavailable", not a crash', async () => {
    const broken = async () => {
      throw new Error('HTTP 500')
    }
    expect(await findMyCity({ geolocation: at(-22.9, -43.5), loadShard: broken })).toEqual({ status: 'unavailable' })
  })
})

describe('what is asked, and when', () => {
  it('asks the browser for the position exactly once, and not before being called', async () => {
    const getCurrentPosition = vi.fn<GeolocationLike['getCurrentPosition']>((ok) => ok({ coords: { latitude: -22.9, longitude: -43.5 } }))
    expect(getCurrentPosition).not.toHaveBeenCalled()
    await findMyCity({ geolocation: { getCurrentPosition }, loadShard })
    expect(getCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('a refused permission asks for nothing else and returns nothing about the position', async () => {
    const result = await findMyCity({ geolocation: failing(1), loadShard })
    expect(JSON.stringify(result)).not.toMatch(/-?\d+\.\d+/)
  })

  it('the result never carries the coordinates, only the city', async () => {
    const result = await findMyCity({ geolocation: at(-22.9, -43.5), loadShard })
    expect(Object.keys(result).sort()).toEqual(['slug', 'status', 'uf'])
  })
})

describe('the messages', () => {
  it('every failure has a clear message that points to the search and the states', () => {
    for (const status of ['denied', 'outside', 'unavailable', 'timeout'] as const) {
      expect(LOCATE_MESSAGES[status]).toMatch(/\.$/)
      expect(LOCATE_MESSAGES[status]).toMatch(/cidade|estado/)
    }
    expect(LOCATE_MESSAGES.denied).toMatch(/permiss|acesso/i)
    expect(LOCATE_MESSAGES.outside).toMatch(/fora do Brasil/)
  })
})
