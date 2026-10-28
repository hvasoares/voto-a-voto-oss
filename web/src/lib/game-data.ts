/**
 * Build time only: the data file of the daily game (#69), `/adivinhe/dados.json`. One row per city that has a 2026 2nd round and a municipality centre (IBGE's centroids,
 * #40), with its size, turnout, the times its 2nd-round result changed side between 2018 and 2026 (the arc, #41) and its region; plus the precomputed order of the daily cities
 * (a seeded shuffle of the cities that have all three cycles and no tie: the daily pick is `daily[day mod length]`). One file for the whole country: about 60 KB gzip, fetched
 * only by the game page. It holds no candidate, party or winner.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cityArc, type ArcKind } from './arcs'
import { cityShardResult } from './city-shard'
import { dataDir } from './data-dir'
import type { GameCity, GameData } from './game'
import { currentEdition } from './editions-load'
import { loadCityShard, loadSearchShard } from './shard-files'
import { UF_NOME } from './uf-names'
import { displayName } from '@/shared/city-search'

const SWINGS: Partial<Record<ArcKind, number>> = { same: 0, switched2022: 1, switched2026: 1, returned: 2, switchedTwice: 2 }

/** `{ cd_ibge: [lat, lon] }` from `centroids.csv`. */
export function readCentroids(dir = dataDir()): Map<string, [number, number]> {
  const [head, ...rows] = readFileSync(resolve(dir, 'centroids.csv'), 'utf8').trim().split(/\r?\n/)
  const cols = head!.split(',')
  const [iCd, iLat, iLon] = [cols.indexOf('cd_ibge'), cols.indexOf('lat'), cols.indexOf('lon')]
  return new Map(rows.map((r) => r.split(',')).map((c) => [c[iCd]!, [Number(c[iLat]), Number(c[iLon])] as [number, number]]))
}

/** mulberry32: a small seeded generator, so the order of the days is the same on every build. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A deterministic shuffle of `items` (Fisher-Yates with the seeded generator). */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items]
  const random = seeded(seed)
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export async function buildGameData(): Promise<GameData> {
  const centroids = readCentroids()
  const rows = ((await loadSearchShard()) ?? []).filter(([, , uf]) => uf !== 'zz')
  const cities: GameCity[] = []
  const eligible: number[] = []
  for (const [, slug, uf] of rows.sort((a, b) => (a[2] + a[1]).localeCompare(b[2] + b[1]))) {
    const shard = (await loadCityShard(uf, slug))!
    const r = cityShardResult(shard, 2026, 2)
    const centre = centroids.get(shard.city.cdIbge)
    if (!r || r.aptos <= 0 || !centre) continue
    const swings = SWINGS[cityArc(shard).kind] ?? -1
    cities.push([uf, slug, displayName(shard.city.nome), Math.round(centre[0] * 1000) / 1000, Math.round(centre[1] * 1000) / 1000, r.aptos, Math.round((r.comparecimento / r.aptos) * 100), swings, shard.city.regiao])
    if (swings >= 0) eligible.push(cities.length - 1)
  }
  const states = Object.fromEntries([...new Set(cities.map((c) => c[0]))].map((uf) => [uf, UF_NOME[uf] ?? uf.toUpperCase()]))
  return { edition: (await currentEdition()).id, cities, daily: shuffled(eligible, 2026), states }
}
