/**
 * The data check of ticket #49 (acceptance): the shards must cover the chosen dataset exactly — every city has a
 * shard (overseas posts included), the per (cycle, round) shard totals equal the CSV totals, the turnout identity
 * holds, and nothing absent from the CSVs is invented in a shard. Runs on the fixture dataset in the unit tests and
 * on the real `../data` with `npm run check:shards`.
 *
 * The expectations are built straight from `createStore` (the store of ticket #1, the app's stable interface): the
 * check re-derives everything from the dataset instead of trusting the builder. Key order inside the shards is not
 * checked here — the byte-determinism tests cover it.
 */
import { createStore } from '@/data/store'
import { TURNOUT_FIELDS, type BuiltShards, type ShardSources } from './shards'

const OVERSEAS_UF = 'zz'

type Json = Record<string, unknown>
type BlockJson = Json
type CyclesJson = Record<string, Record<string, BlockJson>>

/** Order-insensitive deep equality over plain JSON values. */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEqual(x, b[i]))
  const ka = Object.keys(a as object)
  const kb = Object.keys(b as object)
  return ka.length === kb.length && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual((a as Json)[k], (b as Json)[k]))
}

/** One dataset slot: the turnout row fields (or none) and the summed candidate votes (or none). */
interface ExpectedSlot {
  fields: Record<string, number> | undefined
  votes: Map<number, number>
}

/** An expected slot in the shard's own shape, for deep comparison ({"...fields", "votes": {...}, absent when empty}). */
function slotJson(slot: ExpectedSlot): BlockJson {
  const out: BlockJson = {}
  if (slot.fields) for (const f of TURNOUT_FIELDS) out[f] = slot.fields[f]
  if (slot.votes.size > 0) {
    const votes: Record<string, number> = {}
    for (const [num, votos] of [...slot.votes].sort((x, y) => x[0] - y[0])) votes[String(num)] = votos
    out['votes'] = votes
  }
  return out
}

/** The slots of one target (a city, the nation, a region) keyed "ano|turno", in the shard's own nested shape. */
function asCyclesJson(slotsMap: Map<string, ExpectedSlot>): CyclesJson {
  const out: CyclesJson = {}
  for (const [id, slot] of slotsMap) {
    const [ano = '', turno = ''] = id.split('|')
    ;(out[ano] ??= {})[turno] = slotJson(slot)
  }
  return out
}

/** Returns one sentence per violated rule; an empty list means the shards cover the dataset exactly. */
export async function verifyShards(built: BuiltShards, sources: ShardSources): Promise<string[]> {
  const problems: string[] = []
  const add = (message: string) => problems.push(message)

  const files = new Map(built.files.map((f) => [f.path, f.json]))
  const version = `v${built.fingerprint}`
  const shardJson = (rel: string): unknown | undefined => {
    const text = files.get(`${version}/${rel}`)
    return text === undefined ? undefined : (JSON.parse(text) as unknown)
  }

  const store = createStore(async (file) => sources[file] ?? '')
  const cities = await store.cities()
  const turnout = await store.turnout()
  const votes = await store.votes()
  const cityOf = new Map(cities.map((c) => [`${c.uf}|${c.cdMunicipio}`, c] as const))

  // 1. The turnout identity holds per dataset row: comparecimento = validos + brancos + nulos + anulados.
  for (const t of turnout) {
    const sum = t.validos + t.brancos + t.nulos + t.anuladosApuSep
    if (sum !== t.comparecimento)
      add(`turnout identity: ${t.uf} ${t.cdMunicipio} ${t.ano} round ${t.turno}: validos+brancos+nulos+anulados = ${sum} != comparecimento = ${t.comparecimento}`)
  }

  // 2. Expected slots, from the store rows: per city (overseas posts included), national (all rows, overseas
  //    included) and per region (the `regiao` values of cities, "exterior" included). Absent cycle or round = no
  //    key at all, never zeros.
  const perCity = new Map<string, Map<string, ExpectedSlot>>()
  const national = new Map<string, ExpectedSlot>()
  const regions = new Map<string, Map<string, ExpectedSlot>>()
  const slotsOf = (target: Map<string, Map<string, ExpectedSlot>>, key: string): Map<string, ExpectedSlot> => {
    const existing = target.get(key)
    if (existing) return existing
    const created = new Map<string, ExpectedSlot>()
    target.set(key, created)
    return created
  }
  const slotFor = (slotsMap: Map<string, ExpectedSlot>, ano: number, turno: number): ExpectedSlot => {
    const id = `${ano}|${turno}`
    const existing = slotsMap.get(id)
    if (existing) return existing
    const created: ExpectedSlot = { fields: undefined, votes: new Map() }
    slotsMap.set(id, created)
    return created
  }
  for (const t of turnout) {
    const region = cityOf.get(`${t.uf}|${t.cdMunicipio}`)?.regiao
    if (region === undefined) {
      add(`turnout.csv: no city row (cities.csv) for ${t.uf} ${t.cdMunicipio}`)
      continue
    }
    for (const [slotsMap, ano, turno] of [
      [slotsOf(perCity, `${t.uf}|${t.cdMunicipio}`), t.ano, t.turno],
      [national, t.ano, t.turno],
      [slotsOf(regions, region), t.ano, t.turno],
    ] as const) {
      const slot = slotFor(slotsMap, ano, turno)
      slot.fields = Object.fromEntries(TURNOUT_FIELDS.map((f) => [f, (slot.fields?.[f] ?? 0) + t[f]]))
    }
  }
  for (const v of votes) {
    const region = cityOf.get(`${v.uf}|${v.cdMunicipio}`)?.regiao
    if (region === undefined) {
      add(`votes.csv: no city row (cities.csv) for ${v.uf} ${v.cdMunicipio}`)
      continue
    }
    for (const [slotsMap, ano, turno] of [
      [slotsOf(perCity, `${v.uf}|${v.cdMunicipio}`), v.ano, v.turno],
      [national, v.ano, v.turno],
      [slotsOf(regions, region), v.ano, v.turno],
    ] as const) {
      const slot = slotFor(slotsMap, ano, turno)
      slot.votes.set(v.candidatoNumero, (slot.votes.get(v.candidatoNumero) ?? 0) + v.votos)
    }
  }

  // 3. City shards: every city has one; its blocks are exactly the dataset slots of that city (overseas posts
  //    included), equal to the dataset (turnout fields, summed votes), never zeros where the CSVs have no rows.
  for (const city of cities) {
    const id = `${city.uf}|${city.cdMunicipio}`
    const shard = shardJson(`city/${city.uf}/${city.slug}.json`) as { city?: Json; cycles?: CyclesJson } | undefined
    if (!shard) {
      add(`city ${city.uf} ${city.cdMunicipio} (${city.nome}): no shard city/${city.uf}/${city.slug}.json`)
      continue
    }
    const identity = { uf: city.uf, slug: city.slug, nome: city.nome, regiao: city.regiao, cdMunicipio: city.cdMunicipio, cdIbge: city.cdIbge, ciclos: city.ciclos }
    if (!deepEqual(shard.city ?? {}, identity)) add(`city ${city.nome}: the "city" identity block differs from the dataset of ${city.uf} ${city.cdMunicipio}`)
    const citySlots = perCity.get(id) ?? new Map<string, ExpectedSlot>()
    const got = new Map<string, BlockJson>()
    for (const [ano, rounds] of Object.entries(shard.cycles ?? {})) {
      if (ano === '' || Number.isNaN(Number(ano))) {
        add(`city ${city.nome}: shard cycle "${ano}" is not a year`)
        continue
      }
      for (const turno of Object.keys(rounds)) {
        if (turno !== '1' && turno !== '2') {
          add(`city ${city.nome}: shard round "${turno}" is not 1 or 2`)
          continue
        }
        got.set(`${ano}|${turno}`, rounds[turno]!)
      }
    }
    for (const [slotId, slot] of citySlots) {
      if (slot.fields === undefined && slot.votes.size === 0) continue
      const block = got.get(slotId)
      if (!block) {
        add(`city ${city.nome}: shard has no block for ${labelId(slotId)} (the CSVs have rows there)`)
        continue
      }
      const gotFields: Json = {}
      for (const f of TURNOUT_FIELDS) if (typeof block[f] === 'number') gotFields[f] = block[f]
      if (slot.fields === undefined && Object.keys(gotFields).length > 0)
        add(`city ${city.nome}: block ${labelId(slotId)} has turnout fields but the CSVs have no turnout row there`)
      if (slot.fields !== undefined && !deepEqual(gotFields, slot.fields))
        add(`city ${city.nome}: turnout of ${labelId(slotId)} differs from the dataset row`)
      const gotVotes = votesOf(block)
      if (slot.votes.size === 0 && gotVotes.size > 0)
        add(`city ${city.nome}: block ${labelId(slotId)} has votes but the CSVs have no candidate rows there`)
      if (slot.votes.size > 0 && ![...slot.votes].every(([num, votos]) => gotVotes.get(num) === votos && gotVotes.size === slot.votes.size))
        add(`city ${city.nome}: votes of ${labelId(slotId)} differ from the summed dataset rows`)
    }
    for (const slotId of [...got.keys()]) if (!citySlots.has(slotId)) add(`city ${city.nome}: shard block ${labelId(slotId)} has no dataset row (invented, or zeros for absence)`)
  }

  // 4. State shards: one per dataset state (no overseas), exactly its cities, each with name and slug; the
  //    state's region is the cities' one.
  const expectedStates = new Map<string, { regiao: string; cities: Set<string> }>()
  for (const city of cities) {
    if (city.uf === OVERSEAS_UF) continue
    if (!expectedStates.has(city.uf)) expectedStates.set(city.uf, { regiao: city.regiao, cities: new Set() })
    const state = expectedStates.get(city.uf)!
    if (state.regiao !== city.regiao) add(`state ${city.uf}: dataset has cities in different regions (${state.regiao} and ${city.regiao})`)
    state.cities.add(`${city.nome}|${city.slug}`)
  }
  const statePaths = built.files.filter((f) => f.path.startsWith(`${version}/state/`)).map((f) => f.path)
  for (const path of statePaths) {
    const uf = path.slice(`${version}/state/`.length, -'.json'.length)
    if (!expectedStates.has(uf)) add(`state shard for "${uf}" exists but the dataset has no such state (overseas posts are not states)`)
  }
  for (const [uf, expectedState] of expectedStates) {
    if (!statePaths.includes(`${version}/state/${uf}.json`)) {
      add(`state ${uf} (${expectedState.cities.size} cities) has no state shard`)
      continue
    }
    const state = shardJson(`state/${uf}.json`) as { uf?: unknown; regiao?: unknown; cities?: { nome?: unknown; slug?: unknown }[] } | undefined
    if (!state || state.uf !== uf || state.regiao !== expectedState.regiao) add(`state ${uf}: the shard's identity fields differ from the dataset`)
    const got = new Set((state?.cities ?? []).map((c) => `${c.nome}|${c.slug}`))
    if (got.size !== expectedState.cities.size || ![...got].every((c) => expectedState.cities.has(c))) add(`state ${uf}: the shard's city list differs from the dataset`)
    for (const row of state?.cities ?? []) if (typeof row.nome !== 'string' || typeof row.slug !== 'string') add(`state ${uf}: a shard city row lacks name or slug`)
  }

  // 5. Search index: name, slug and state of every city, overseas posts included. The index drives the home
  //    search, so it must not mention anything the dataset does not have.
  const search = shardJson('search.json')
  if (!Array.isArray(search)) add('no search index shard (search.json) or not an array of [nome, slug, uf] rows')
  else {
    const got = new Set(search.map((row) => `${row[0]}|${row[1]}|${row[2]}`))
    const expectedRows = new Set(cities.map((c) => `${c.nome}|${c.slug}|${c.uf}`))
    if (got.size !== expectedRows.size || ![...got].every((k) => expectedRows.has(k))) add('search index rows differ from the dataset cities')
    for (const row of search) if (row.length !== 3) add(`a search index row is not [nome, slug, uf]: ${JSON.stringify(row)}`)
  }

  // 6. Totals: national (overseas included) and every region, per cycle and round; a block only where rows exist.
  const totals = shardJson('totals.json') as { national?: CyclesJson; regions?: Record<string, CyclesJson> } | undefined
  if (!totals) add('no totals shard (totals.json)')
  else {
    const expectedNational = asCyclesJson(national)
    for (const [id, slot] of national)
      if (!deepEqual(totals.national?.[id.split('|')[0] ?? '']?.[id.split('|')[1] ?? ''], slotJson(slot)))
        add(`national totals of ${labelId(id)} differ from the dataset rows (overseas included)`)
    for (const [ano, rounds] of Object.entries(totals.national ?? {}))
      for (const turno of Object.keys(rounds))
        if (!national.has(`${ano}|${turno}`)) add(`national totals have a ${ano}/${turno} block the dataset has no rows for (invented)`)
    const regionTotals = totals.regions ?? {}
    for (const region of Object.keys(regionTotals)) {
      if (!regions.has(region)) {
        add(`totals have a region "${region}" the dataset has no such region for`)
        continue
      }
      const regionSlots = regions.get(region)!
      for (const [id, slot] of regionSlots)
        if (!deepEqual(regionTotals[region]?.[id.split('|')[0] ?? '']?.[id.split('|')[1] ?? ''], slotJson(slot)))
          add(`region ${region} totals of ${labelId(id)} differ from the dataset rows`)
      for (const [ano, rounds] of Object.entries(regionTotals[region] ?? {}))
        for (const turno of Object.keys(rounds))
          if (!regionSlots.has(`${ano}|${turno}`)) add(`region ${region} totals have a ${ano}/${turno} block the dataset has no rows for (invented)`)
    }
    for (const [region, regionSlots] of regions)
      if (regionTotals[region] === undefined) add(`totals have no region ${region} block (${regionSlots.size} cycle/round slots of the dataset)`)
  }

  return problems
}

const labelId = (id: string): string => {
  const [ano, turno] = id.split('|')
  return `cycle ${ano} round ${turno}`
}

function votesOf(block: BlockJson): Map<number, number> {
  const map = new Map<number, number>()
  const votes = (block['votes'] as Json | undefined) ?? {}
  for (const [num, votos] of Object.entries(votes)) map.set(Number(num), votos as number)
  return map
}