/**
 * Pre-rendered JSON shards for the browser (ticket #49). The build turns the committed dataset into versioned
 * files under public/data so no page fetches or parses a CSV:
 *
 *   v<fingerprint>/search.json            one row per city: [nome, slug, uf] (the search index)
 *   v<fingerprint>/city/<uf>/<slug>.json  one city: identity + turnout and votes per cycle and round + candidates
 *   v<fingerprint>/state/<uf>.json        one state: its cities with the fields a list needs (name and slug)
 *   v<fingerprint>/totals.json            national and per-region sums of turnout and votes, per cycle and round
 *   v<fingerprint>/peers.json             the closest peer cities of every city (ticket #23, src/lib/peers.ts)
 *   v<fingerprint>/arcs.json              how many cities have each arc (the sequence of 2nd-round winners, ticket #41, src/lib/arcs.ts)
 *   v<fingerprint>/curiosities.json       up to three rank facts per city against the cities of its size band (ticket #33, src/lib/curiosities.ts)
 *   v<fingerprint>/centroids.json         the IBGE centre of every city that has one, by state (ticket #40, src/lib/nearest-city.ts)
 *
 * The fingerprint is a sha256 over the six dataset files, so the paths change whenever the dataset changes and
 * a stale copy is never served (web/docs/shards.md records layout and budgets). Everything here is deterministic:
 * same dataset in, byte-identical files out (code-point ordering only, never the runtime locale).
 *
 * A cycle or round the dataset has no rows for is an absent key, never zeros ("sem dados" for the pages; Boa
 * Esperança do Norte exists from 2026). Overseas posts (uf "zz", regiao "exterior") get a city shard and enter the
 * national totals and the "exterior" region totals.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import {
  type City,
  type Turno,
  type Turnout,
} from '@/data'
import { parseCandidates, parseCentroids, parseCities, parseTurnout, parseVotes } from '@/data/csv'
import { encodeCentroids } from './centroids'
import { dataDir } from '../src/lib/data-dir'
import { countArcs } from '../src/lib/arcs'
import type { CityShard } from '../src/lib/city-shard'
import { curiosities, encodeCuriosities, FIXTURE_MIN_GROUP, MIN_GROUP } from '../src/lib/curiosities'
import { computePeers, encodePeers } from '../src/lib/peers'
import { datasetFingerprint, FINGERPRINT_FILES, type ShardSources } from './shards-fingerprint'

/** Bumped when the shard layout changes: a cached version directory is rebuilt when this does not match. */
export const SHARD_GENERATOR = 'voto-shards/6'

export const TURNOUT_FIELDS = ['aptos', 'comparecimento', 'abstencoes', 'brancos', 'nulos', 'anuladosApuSep', 'validos'] as const
type TurnoutFields = Pick<Turnout, (typeof TURNOUT_FIELDS)[number]>

export interface BuiltShards {
  fingerprint: string
  /** Paths relative to public/data (the `v<fingerprint>/` prefix included) and their JSON text. */
  files: { path: string; json: string }[]
}

export interface ShardRound {
  /** Present when the dataset has a turnout row for this city and round. */
  fields?: TurnoutFields
  /** Present when the dataset has candidate rows for this city and round. */
  votes?: Map<number, number>
}

/** Byte-identical regeneration depends on this order, never on the runtime locale. */
export const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const cityKey = (uf: string, cdMunicipio: string): string => `${uf}|${cdMunicipio}`

export class ShardError extends Error {}

/** The fingerprint helpers live in shards-fingerprint.ts (no `@site` imports there); re-exported for callers. */
export {
  builtFingerprint,
  datasetFingerprint,
  datasetFingerprintFromDisk,
  SHARD_VIRTUAL_ID,
  shardsModule,
  type DataFile,
  type ShardSources,
} from './shards-fingerprint'

type Cycles = Map<number, Map<Turno, ShardRound>>
type Target = Map<string, Cycles>

function slot(cycles: Cycles, ano: number, turno: Turno): ShardRound {
  const rounds = cycles.get(ano) ?? new Map<Turno, ShardRound>()
  cycles.set(ano, rounds)
  const round = rounds.get(turno) ?? {}
  rounds.set(turno, round)
  return round
}

function getOrCreate(target: Target, key: string): Cycles {
  const existing = target.get(key)
  if (existing) return existing
  const created: Cycles = new Map()
  target.set(key, created)
  return created
}

/** Builds every shard of the dataset; a dataset that breaks the shard contract throws ShardError. */
export function buildShards(sources: ShardSources): BuiltShards {
  const cities = parseCities(sources['cities.csv'])
  const turnout = parseTurnout(sources['turnout.csv'])
  const votes = parseVotes(sources['votes.csv'])
  const candidates = parseCandidates(sources['candidates.csv'])

  const byCity = new Map<string, { city: City; cycles: Cycles }>()
  for (const city of cities) {
    if (byCity.has(cityKey(city.uf, city.cdMunicipio))) throw new ShardError(`cities.csv: duplicate city row ${city.uf} ${city.cdMunicipio}`)
    if (cities.some((c) => c.uf === city.uf && c.slug === city.slug && c.cdMunicipio !== city.cdMunicipio))
      throw new ShardError(`cities.csv: slug "${city.slug}" is used twice in ${city.uf} (${city.cdMunicipio})`)
    byCity.set(cityKey(city.uf, city.cdMunicipio), { city, cycles: new Map() })
  }
  const targets = (city: { regiao: string }): [Target, string][] => [
    [national, 'national'],
    [regions, city.regiao],
  ]
  const national: Target = new Map()
  const regions: Target = new Map()

  // A city slot holds exactly one dataset row; the aggregate slots (nation, region) hold sums, and
  // a second turnout row for one city (and round) breaks the build.
  const setTurnout = (r: ShardRound, t: Turnout) => {
    if (r.fields) throw new ShardError(`turnout.csv: two rows for ${t.uf} ${t.cdMunicipio} ${t.ano} round ${t.turno}`)
    r.fields = { aptos: t.aptos, comparecimento: t.comparecimento, abstencoes: t.abstencoes, brancos: t.brancos, nulos: t.nulos, anuladosApuSep: t.anuladosApuSep, validos: t.validos }
  }
  const sumTurnout = (aggregate: ShardRound, t: Turnout) => {
    if (!aggregate.fields) aggregate.fields = { aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 0 }
    for (const f of TURNOUT_FIELDS) aggregate.fields[f] += t[f]
  }
  const setVote = (r: ShardRound, candidatoNumero: number, votos: number) => {
    if (r.votes?.has(candidatoNumero)) throw new ShardError(`votes.csv: candidate ${candidatoNumero} twice for a city round`)
    if (!r.votes) r.votes = new Map()
    r.votes.set(candidatoNumero, votos)
  }
  const sumVote = (aggregate: ShardRound, candidatoNumero: number, votos: number) => {
    if (!aggregate.votes) aggregate.votes = new Map()
    aggregate.votes.set(candidatoNumero, (aggregate.votes.get(candidatoNumero) ?? 0) + votos)
  }

  for (const t of turnout) {
    const entry = byCity.get(cityKey(t.uf, t.cdMunicipio))
    if (!entry) throw new ShardError(`turnout.csv: ${t.uf} ${t.cdMunicipio} has no city row (cities.csv)`)
    setTurnout(slot(entry.cycles, t.ano, t.turno), t)
    for (const [target, key] of targets(entry.city)) sumTurnout(slot(getOrCreate(target, key), t.ano, t.turno), t)
  }
  for (const v of votes) {
    const entry = byCity.get(cityKey(v.uf, v.cdMunicipio))
    if (!entry) throw new ShardError(`votes.csv: ${v.uf} ${v.cdMunicipio} has no city row (cities.csv)`)
    setVote(slot(entry.cycles, v.ano, v.turno), v.candidatoNumero, v.votos)
    for (const [target, key] of targets(entry.city)) sumVote(slot(getOrCreate(target, key), v.ano, v.turno), v.candidatoNumero, v.votos)
  }

  const candidatesByRound = new Map<number, Map<Turno, Map<number, [string, string]>>>()
  for (const c of candidates) {
    const rounds = candidatesByRound.get(c.ano) ?? new Map<Turno, Map<number, [string, string]>>()
    candidatesByRound.set(c.ano, rounds)
    const numbers = rounds.get(c.turno) ?? new Map<number, [string, string]>()
    rounds.set(c.turno, numbers)
    if (numbers.has(c.candidatoNumero)) throw new ShardError(`candidates.csv: candidate ${c.candidatoNumero} twice for ${c.ano} round ${c.turno}`)
    numbers.set(c.candidatoNumero, [c.nomeUrna, c.partido])
  }
  // A vote row of a candidate the dataset never names cannot be shown by a page: break the build.
  for (const v of votes) {
    if (!candidatesByRound.get(v.ano)?.get(v.turno)?.has(v.candidatoNumero))
      throw new ShardError(`votes.csv: candidate ${v.candidatoNumero} of ${v.ano} round ${v.turno} (${v.uf} ${v.cdMunicipio}) has no row in candidates.csv`)
  }

  const fingerprint = datasetFingerprint(sources)
  // The fixture dataset is a handful of cities: its groups are as small as it gets (see src/lib/curiosities.ts).
  const minGroup = (JSON.parse(sources['manifest.json']) as { fixture?: boolean }).fixture ? FIXTURE_MIN_GROUP : MIN_GROUP
  const files = composeShards(`v${fingerprint}`, byCity, national, regions, candidatesByRound, minGroup)
  // Peer cities (#23): one small index-encoded file; overseas posts are left out by the method itself.
  files.push({ path: `v${fingerprint}/peers.json`, json: JSON.stringify(encodePeers(computePeers({ cities, turnout, votes }))) })
  // City centres (#40): fetched only when a visitor taps "Usar minha localização".
  const centres = encodeCentroids(cities, parseCentroids(sources['centroids.csv']), (message) => {
    throw new ShardError(message)
  })
  files.push({ path: `v${fingerprint}/centroids.json`, json: JSON.stringify(centres) })
  return { fingerprint, files }
}

function numberedObject(map: Map<number, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const n of [...map.keys()].sort((a, b) => a - b)) out[String(n)] = map.get(n)!
  return out
}

/** One cycle/round block: turnout fields (absent fields are never zeros), then votes. */
function roundObject(r: ShardRound): Record<string, number | Record<string, number>> {
  const out: Record<string, number | Record<string, number>> = {}
  if (r.fields) for (const f of TURNOUT_FIELDS) out[f] = r.fields[f]
  if (r.votes?.size) out['votes'] = numberedObject(r.votes)
  return out
}

/** Candidate names and parties keyed by cycle, round and number (the same block every city shard embeds). */
function candidatesJson(candidatesByRound: Map<number, Map<Turno, Map<number, [string, string]>>>): Record<string, Record<string, Record<string, string[]>>> {
  const out: Record<string, Record<string, Record<string, string[]>>> = {}
  for (const ano of [...candidatesByRound.keys()].sort((a, b) => a - b)) {
    const rounds = candidatesByRound.get(ano)!
    const rJson: Record<string, Record<string, string[]>> = {}
    for (const turno of [...rounds.keys()].sort((a, b) => a - b)) {
      const numbers: Record<string, string[]> = {}
      for (const n of [...rounds.get(turno)!.keys()].sort((a, b) => a - b)) numbers[String(n)] = rounds.get(turno)!.get(n)!
      rJson[String(turno)] = numbers
    }
    out[String(ano)] = rJson
  }
  return out
}

type CycleBlocks = Record<string, Record<string, Record<string, number | Record<string, number>>>>

function cyclesObject(cycles: Cycles | undefined): CycleBlocks {
  const out: CycleBlocks = {}
  if (!cycles) return out
  for (const ano of [...cycles.keys()].sort((a, b) => a - b)) {
    const rounds = cycles.get(ano)!
    const block: Record<string, Record<string, number | Record<string, number>>> = {}
    for (const turno of [...rounds.keys()].sort((a, b) => a - b)) block[String(turno)] = roundObject(rounds.get(turno)!)
    out[String(ano)] = block
  }
  return out
}

function composeShards(
  versionDir: string,
  byCity: Map<string, { city: City; cycles: Cycles }>,
  national: Target,
  regions: Target,
  candidatesByRound: Map<number, Map<Turno, Map<number, [string, string]>>>,
  minGroup: number,
): { path: string; json: string }[] {
  const files: { path: string; json: string }[] = []
  const dir = (p: string) => `${versionDir}/${p}`

  // Search index: name, slug and state of every city (overseas posts included), the order is deterministic.
  const all = [...byCity.values()].map(({ city }) => city).sort((a, b) => byText(a.nome, b.nome) || byText(a.slug, b.slug) || byText(a.uf, b.uf))
  files.push({ path: dir('search.json'), json: JSON.stringify(all.map((c) => [c.nome, c.slug, c.uf])) })

  // One shard per state (no overseas posts are states): the cities a list needs.
  const states = new Map<string, { uf: string; regiao: string; cities: { nome: string; slug: string }[] }>()
  for (const { city } of byCity.values()) {
    if (city.uf === 'zz') continue
    const state = states.get(city.uf) ?? { uf: city.uf, regiao: city.regiao, cities: [] }
    state.cities.push({ nome: city.nome, slug: city.slug })
    states.set(city.uf, state)
  }
  for (const uf of [...states.keys()].sort(byText)) {
    const s = states.get(uf)!
    s.cities.sort((a, b) => byText(a.nome, b.nome) || byText(a.slug, b.slug))
    files.push({ path: dir(`state/${uf}.json`), json: JSON.stringify({ uf: s.uf, regiao: s.regiao, cities: s.cities }) })
  }

  // One shard per city: identity, every cycle and round it has data for, and the candidate names and parties
  // (keyed by cycle and number; a number is not the same person in another year).
  const candidateJson = candidatesJson(candidatesByRound)
  const cityShards: CityShard[] = []
  for (const { city, cycles } of [...byCity.values()].sort((a, b) => byText(a.city.uf, b.city.uf) || byText(a.city.slug, b.city.slug))) {
    const shard = {
      city: { uf: city.uf, slug: city.slug, nome: city.nome, regiao: city.regiao, cdMunicipio: city.cdMunicipio, cdIbge: city.cdIbge, ciclos: city.ciclos },
      cycles: cyclesObject(cycles),
      candidates: candidateJson,
    }
    files.push({ path: dir(`city/${city.uf}/${city.slug}.json`), json: JSON.stringify(shard) })
    cityShards.push(shard)
  }
  // How many cities have each arc (#41): a small file that must match the cohort table (see arcs.test.ts).
  files.push({ path: dir('arcs.json'), json: JSON.stringify(countArcs(cityShards)) })
  // Curiosities (#33): the rank facts of every city that has any.
  files.push({ path: dir('curiosities.json'), json: JSON.stringify(encodeCuriosities(curiosities(cityShards, minGroup), minGroup)) })

  // National and regional sums, per cycle and round. National includes overseas posts; the regions are every
  // `regiao` value of the dataset (the pseudo-region "exterior" included).
  const regionsJson: Record<string, CycleBlocks> = {}
  for (const regiao of [...regions.keys()].sort(byText)) regionsJson[regiao] = cyclesObject(regions.get(regiao))
  files.push({ path: dir('totals.json'), json: JSON.stringify({ national: cyclesObject(national.get('national')), regions: regionsJson }) })

  return files
}

/**
 * Writes the shards of the configured dataset (env/DATA_DIR, cwd) under public/data and prunes everything else of
 * that directory (older version directories, the previously copied CSVs). The version directory is cached with a
 * `.generator` sentinel, so dev servers re-start fast while the same dataset is in place.
 * Returns the fingerprint (the new version directory name is `public/data/v<fingerprint>`).
 */
export function generateShards(publicData: string, env: Record<string, string | undefined> = process.env, cwd = process.cwd()): string {
  const dir = dataDir(env, cwd)
  const sources = {} as Record<string, string>
  for (const f of FINGERPRINT_FILES) {
    try {
      sources[f] = readFileSync(resolve(dir, f), 'utf8')
    } catch (error) {
      throw new ShardError(`DATA_DIR ${dir} is missing ${f}: ${(error as Error).message}`)
    }
  }
  const built = buildShards(sources as Parameters<typeof buildShards>[0])
  const versionDir = resolve(publicData, `v${built.fingerprint}`)
  let stale = true
  try {
    stale = readFileSync(resolve(versionDir, '.generator'), 'utf8') !== `${SHARD_GENERATOR}\n`
  } catch {
    // no directory yet
  }
  if (stale) {
    rmSync(publicData, { recursive: true, force: true })
    mkdirSync(versionDir, { recursive: true })
    for (const f of built.files) {
      const file = resolve(publicData, f.path)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, f.json)
    }
    writeFileSync(resolve(versionDir, '.generator'), `${SHARD_GENERATOR}\n`)
  }
  return built.fingerprint
}