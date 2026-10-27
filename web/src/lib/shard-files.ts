/**
 * Node access to the pre-rendered shards. Build-time page code (getStaticPaths, pre-rendered share content) and
 * the unit tests read the same `public/data/v<fingerprint>/` files the shards integration writes; when those are
 * not on disk yet (tests run without a full `astro build`), the shards are rebuilt in memory from the configured
 * dataset with the same `buildShards` — same input, byte-identical output — so tests never depend on a build.
 * Browser code never imports this (it fetches with the URL from `virtual:data-shards` instead).
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildShards, type BuiltShards } from '../../integrations/shards'
import { datasetFingerprintFromDisk } from '../../integrations/shards-fingerprint'
import { dataDir } from './data-dir'
import { cityShardResult, type CityShard } from './city-shard'
import type { CityResult } from '../shared/city-model'

const FINGERPRINT_FILES = ['candidates.csv', 'centroids.csv', 'cities.csv', 'manifest.json', 'turnout.csv', 'votes.csv'] as const

/** The JSON text of every shard file, keyed by its path relative to public/data. Memoised per dataset. */
const memos = new Map<string, Promise<BuiltShards>>()
function datasetShards(env: Record<string, string | undefined> = process.env, cwd = process.cwd()): Promise<BuiltShards> {
  const key = env.DATA_DIR ?? '(default)'
  const memo = memos.get(key)
  const done = memo ?? buildDatasetShards(env, cwd)
  memos.set(key, done)
  return done
}
function buildDatasetShards(env: Record<string, string | undefined>, cwd: string): Promise<BuiltShards> {
  return (async () => {
    const dir = dataDir(env, cwd)
    const sources = {} as Record<string, string>
    for (const f of FINGERPRINT_FILES) sources[f] = readFileSync(resolve(dir, f), 'utf8')
    return buildShards(sources as Parameters<typeof buildShards>[0])
  })()
}

async function publicShardText(path: string): Promise<string | undefined> {
  const publicData = resolve(process.cwd(), 'public/data')
  const fingerprint = await datasetFingerprintFromDisk()
  const file = resolve(publicData, `v${fingerprint}`, path)
  return existsSync(file) ? readFileSync(file, 'utf8') : undefined
}

async function shardJson<T>(path: string): Promise<T | undefined> {
  const text = (await publicShardText(path)) ?? shardText(path, await datasetShards())
  return text ? (JSON.parse(text) as T) : undefined
}

function shardText(path: string, built: BuiltShards): string | undefined {
  // The built file paths carry the version directory (`v<fingerprint>/…`) in front.
  return built.files.find((f) => f.path === `v${built.fingerprint}/${path}`)?.json
}

/** One city's parsed shard, from the built files on disk or, when they are not built yet, from memory. */
export async function loadCityShard(uf: string, slug: string): Promise<CityShard | undefined> {
  return shardJson<CityShard>(`city/${uf}/${slug}.json`)
}

/** The `CityResult` of a pre-rendered city shard; undefined when the city or that cycle/round has no data. */
export async function loadCityResult(uf: string, slug: string, ano: number, turno: 1 | 2): Promise<CityResult | undefined> {
  const shard = await loadCityShard(uf, slug)
  return shard && cityShardResult(shard, ano, turno)
}

/** Shape of `state/<uf>.json` (no overseas posts: 'zz' is never a state). */
export interface StateShard {
  uf: string
  regiao: string
  cities: { nome: string; slug: string }[]
}

export async function loadStateShard(uf: string): Promise<StateShard | undefined> {
  return shardJson<StateShard>(`state/${uf}.json`)
}

/** Shape of `search.json`: one `[nome, slug, uf]` row per city, overseas posts included. */
export type SearchShard = [nome: string, slug: string, uf: string][]

export async function loadSearchShard(): Promise<SearchShard | undefined> {
  return shardJson<SearchShard>('search.json')
}

/** Every UF the dataset has a state page for (the search shard's ufs; no overseas post is a state). */
export async function loadStateUfs(): Promise<string[]> {
  return [...new Set(((await loadSearchShard()) ?? []).map(([, , uf]) => uf))].filter((uf) => uf !== 'zz').sort()
}

/** Every city of the search shard in `StateRow` shape, for the build-time routes of one state. */
export async function loadStateCities(uf: string): Promise<{ nome: string; slug: string }[]> {
  return ((await loadSearchShard()) ?? []).filter(([, , cityUf]) => cityUf === uf).map(([nome, slug]) => ({ nome, slug }))
}

/** `manifest.fixture` of the configured dataset (build time only): the EXEMPLO banner and footer wording depend on it. */
export async function datasetFixture(env: Record<string, string | undefined> = process.env): Promise<boolean> {
  const manifest = JSON.parse(readFileSync(resolve(dataDir(env), 'manifest.json'), 'utf8')) as { fixture?: boolean }
  return !!manifest.fixture
}

/**
 * Every fixture city's shard, built on the fly from the committed fixture dataset (the default of `dataDir`,
 * never the real dataset) — the figures the old-site tests locked come back without a `astro build`.
 */
export async function fixtureCityShards(): Promise<CityShard[]> {
  const built = await datasetShards({ DATA_DIR: undefined }, process.cwd())
  return built.files
    .filter((f) => /^v[0-9a-f]+\/city\/[^/]+\/[^/]+\.json$/.test(f.path)) // paths carry the version directory
    .map((f) => JSON.parse(f.json) as CityShard)
}