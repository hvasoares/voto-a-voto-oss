/**
 * Peer cities (ticket #23), PURE: for every city, the cities that are closest to it by turnout, margin, size band and
 * history across the three cycles. No page uses it yet; the build publishes the result as one small file
 * (`peers.json`, see `encodePeers`) so later screens can show a twin or compare a city with its peers.
 * The method is written in web/docs/peer-similarity.md; this file is that note in code.
 *
 *  - Features per city (round 1 only: every cycle has one): the size band of its electorate (latest cycle with data,
 *    thresholds below), and for each cycle 2018, 2022, 2026 the turnout (comparecimento / aptos) and the margin
 *    (first minus second candidate, as a share of the valid votes). A cycle the city has no round-1 data in simply has
 *    no features for it ("sem dados", never zero).
 *  - Each feature is z-scored over the cities that have it; size counts triple.
 *  - Distance between two cities: the weighted mean of the squared z-differences over the features BOTH have, and the
 *    pair must share at least MIN_SHARED features, so a city missing a cycle is compared on what it has.
 *  - Peers: the K nearest, closest first, ties broken by "uf/slug" in code-point order. Never itself.
 *  - Overseas posts (uf "zz") are neither subjects nor peers, and do not take part in the scaling.
 * Deterministic: the result does not depend on the order of the input rows.
 */
import type { City, Turnout, Vote } from '@/data'

export const PEERS_K = 5
export const CYCLE_YEARS = [2018, 2022, 2026] as const
/** Upper limits (registered voters) of the size bands: <5k, <10k, <20k, <50k, <100k, <200k, <500k, <1M, 1M or more. */
export const SIZE_BAND_LIMITS = [5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000] as const
/** A pair of cities needs this many features in common to be comparable (size plus one cycle's turnout and margin). */
export const MIN_SHARED = 3
const SIZE_WEIGHT = 3
const OVERSEAS_UF = 'zz'

/** Feature names, in the order of the vectors. */
export const FEATURES = ['size', ...CYCLE_YEARS.flatMap((ano) => [`turnout${ano}`, `margin${ano}`])] as const

/** The band (0 to 8) of an electorate. */
export function sizeBand(aptos: number): number {
  const i = SIZE_BAND_LIMITS.findIndex((limit) => aptos < limit)
  return i < 0 ? SIZE_BAND_LIMITS.length : i
}

export interface PeerInput {
  cities: readonly City[]
  turnout: readonly Turnout[]
  votes: readonly Vote[]
}

export interface PeersResult {
  /** "uf/slug" of every city that has features, code-point order. */
  keys: string[]
  /** For each key (same index), the indices of its peers into `keys`, closest first. */
  peers: number[][]
}

type Vector = (number | undefined)[]

const key = (c: Pick<City, 'uf' | 'slug'>) => `${c.uf}/${c.slug}`
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

/** Raw (unscaled) features of every non-overseas city that has round-1 data in some cycle. */
function rawVectors({ cities, turnout, votes }: PeerInput): Map<string, Vector> {
  const cityOf = new Map(cities.filter((c) => c.uf !== OVERSEAS_UF).map((c) => [`${c.uf}|${c.cdMunicipio}`, c]))
  const round1 = new Map<string, Turnout>()
  for (const t of turnout) if (t.turno === 1 && cityOf.has(`${t.uf}|${t.cdMunicipio}`)) round1.set(`${t.uf}|${t.cdMunicipio}|${t.ano}`, t)
  const top = new Map<string, [number, number]>()
  for (const v of votes) {
    const id = `${v.uf}|${v.cdMunicipio}|${v.ano}`
    if (v.turno !== 1 || !round1.has(id)) continue
    const [first, second] = top.get(id) ?? [0, 0]
    // keep the two largest tallies of the city and cycle
    if (v.votos > first) top.set(id, [v.votos, first])
    else if (v.votos > second) top.set(id, [first, v.votos])
    else top.set(id, [first, second])
  }
  const out = new Map<string, Vector>()
  for (const [id, city] of cityOf) {
    const vector: Vector = new Array(FEATURES.length).fill(undefined)
    let latestAptos: number | undefined
    CYCLE_YEARS.forEach((ano, i) => {
      const t = round1.get(`${id}|${ano}`)
      if (!t || t.aptos <= 0) return
      latestAptos = t.aptos
      vector[1 + 2 * i] = t.comparecimento / t.aptos
      const [first, second] = top.get(`${id}|${ano}`) ?? [0, 0]
      if (t.validos > 0) vector[2 + 2 * i] = (first - second) / t.validos
    })
    if (latestAptos === undefined) continue
    vector[0] = sizeBand(latestAptos)
    out.set(key(city), vector)
  }
  return out
}

/** z-scores each feature over the cities that have it (a feature with no spread is 0 for all). */
function scale(vectors: Map<string, Vector>): Map<string, Vector> {
  const stats = FEATURES.map((_, f) => {
    const xs = [...vectors.values()].map((v) => v[f]).filter((x): x is number => x !== undefined)
    const mean = xs.reduce((a, b) => a + b, 0) / (xs.length || 1)
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length || 1))
    return { mean, sd }
  })
  return new Map([...vectors].map(([k, v]) => [k, v.map((x, f) => (x === undefined ? undefined : stats[f]!.sd > 0 ? (x - stats[f]!.mean) / stats[f]!.sd : 0))]))
}

/** Weighted mean squared difference over the shared features, or undefined when too few are shared. */
function distance(a: Vector, b: Vector): number | undefined {
  let sum = 0
  let weight = 0
  let shared = 0
  for (let f = 0; f < FEATURES.length; f++) {
    const x = a[f]
    const y = b[f]
    if (x === undefined || y === undefined) continue
    const w = f === 0 ? SIZE_WEIGHT : 1
    sum += w * (x - y) ** 2
    weight += w
    shared++
  }
  return shared < MIN_SHARED ? undefined : sum / weight
}

export function computePeers(input: PeerInput, k = PEERS_K): PeersResult {
  const scaled = scale(rawVectors(input))
  const keys = [...scaled.keys()].sort(byText)
  const vectors = keys.map((id) => scaled.get(id)!)
  const peers = vectors.map((v, i) => {
    const near: { j: number; d: number }[] = []
    for (let j = 0; j < keys.length; j++) {
      if (j === i) continue
      const d = distance(v, vectors[j]!)
      if (d !== undefined) near.push({ j, d: Math.round(d * 1e9) / 1e9 })
    }
    // `keys` is sorted, so the index order is the code-point order of "uf/slug": the tie-break.
    near.sort((x, y) => x.d - y.d || x.j - y.j)
    return near.slice(0, k).map((n) => n.j)
  })
  return { keys, peers }
}

/** The published file: `{ k, cities: ["ac/acrelandia", ...], peers: [[idx, ...], ...] }`, index-encoded to stay small. */
export interface PeersFile {
  k: number
  cities: string[]
  peers: number[][]
}

export const encodePeers = (r: PeersResult, k = PEERS_K): PeersFile => ({ k, cities: r.keys, peers: r.peers })

/** "uf/slug" of the peers of a city in a published file (empty for a city the file does not have). */
export function peersOf(file: PeersFile, uf: string, slug: string): string[] {
  const i = file.cities.indexOf(`${uf}/${slug}`)
  return i < 0 ? [] : file.peers[i]!.map((j) => file.cities[j]!)
}
