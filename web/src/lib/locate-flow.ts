/**
 * "Usar minha localização": the position the browser gives, the nearest city on this device, nothing else.
 * The browser asks the visitor for permission when `getCurrentPosition` runs, which only happens after the tap
 * (the Home script calls this from the click handler). The position is used for the lookup and then dropped:
 * the result carries the city, never the coordinates, and nothing here writes to storage or to the network
 * (the only request is the static city-centre file). Seams are injected, so the tests use fixed coordinates.
 */
import { locate, type CentroidShard } from './nearest-city'

export interface GeolocationLike {
  getCurrentPosition(
    success: (position: { coords: { latitude: number; longitude: number } }) => void,
    failure?: (error: { code: number }) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number },
  ): void
}

export type FindOutcome =
  | { status: 'found'; uf: string; slug: string }
  | { status: 'denied' | 'outside' | 'unavailable' | 'timeout' | 'unsupported' }

/** W3C GeolocationPositionError codes. */
const DENIED = 1
const TIMEOUT = 3

export async function findMyCity(deps: { geolocation: GeolocationLike | undefined; loadShard: () => Promise<CentroidShard> }): Promise<FindOutcome> {
  if (!deps.geolocation) return { status: 'unsupported' }
  const geolocation = deps.geolocation
  // The city list loads while the visitor answers the permission prompt; a failed load is only reported if a position arrives.
  const shard = deps.loadShard().then(
    (s) => s,
    () => undefined,
  )
  const position = await new Promise<{ latitude: number; longitude: number } | 'denied' | 'timeout' | 'unavailable'>((resolve) => {
    geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      (e) => resolve(e.code === DENIED ? 'denied' : e.code === TIMEOUT ? 'timeout' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 },
    )
  })
  if (typeof position === 'string') return { status: position }
  const cities = await shard
  if (!cities) return { status: 'unavailable' }
  const found = locate(cities, position.latitude, position.longitude)
  return found.status === 'found' ? { status: 'found', uf: found.uf, slug: found.slug } : { status: 'outside' }
}
