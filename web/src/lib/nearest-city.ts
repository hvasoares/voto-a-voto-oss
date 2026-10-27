/**
 * The nearest city to a position, found on the device from the centroid shard (`centroids.json`): nothing about
 * the position is sent anywhere. Pure and synchronous, so it is tested with fixed coordinates.
 *
 * "Nearest" means the nearest municipality CENTRE as IBGE publishes it. For a very large municipality the centre
 * can be far from its town, so a position at the edge of a big municipality may open a neighbour whose centre is
 * closer; the page says "a cidade mais próxima" and the visitor can always search or pick a state.
 */

/** `{ uf: [[slug, lat, lon], ...] }`: the cities that have an IBGE centre, grouped by state. */
export type CentroidShard = Record<string, [slug: string, lat: number, lon: number][]>

export type Located = { status: 'found'; uf: string; slug: string; km: number } | { status: 'outside' }

/** Brazil's bounding box with a margin (Chuí to Oiapoque, Ponta do Seixas to the Acre border). */
const LAT = [-34, 5.5] as const
const LON = [-74.5, -28] as const
/**
 * Farther than this from every municipality centre is "outside Brazil" even inside the box (Uruguay, Paraguay,
 * Bolivia, the sea). The largest municipalities are about 400 km across, so no point of Brazil is farther than
 * this from the centre of the municipality it is in, and a few border towns of the neighbours still count as near.
 */
export const MAX_KM = 250

const EARTH_KM = 6371
const rad = (d: number) => (d * Math.PI) / 180

/** Great-circle distance (haversine), in kilometres. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

export function locate(shard: CentroidShard, lat: number, lon: number): Located {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return { status: 'outside' }
  if (lat < LAT[0] || lat > LAT[1] || lon < LON[0] || lon > LON[1]) return { status: 'outside' }
  let best: Located | undefined
  for (const [uf, cities] of Object.entries(shard)) {
    for (const [slug, cityLat, cityLon] of cities) {
      const km = distanceKm(lat, lon, cityLat, cityLon)
      if (km <= MAX_KM && (!best || (best.status === 'found' && km < best.km))) best = { status: 'found', uf, slug, km }
    }
  }
  return best ?? { status: 'outside' }
}
