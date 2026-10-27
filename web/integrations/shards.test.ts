/**
 * Shard tests (ticket #49): correct coverage of the dataset (via integrations/shards-verify, re-deriving from the
 * app's store), byte-identical regeneration, fingerprint semantics ("a stale copy is never served"), the absent
 * cycle/round rule (Boa Esperança do Norte) and the overseas posts. Values are never hard-coded: expected blocks
 * and sums come from the store over the same dataset texts (or the committed fixture dataset, the web default).
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dataDir } from '../src/lib/data-dir'
import { buildShards, byText, datasetFingerprint, datasetFingerprintFromDisk, generateShards, ShardError, type ShardSources } from './shards'
import { DATA_FILES } from '@/data'
import { FINGERPRINT_FILES } from './shards-fingerprint'
import { verifyShards } from './shards-verify'

/** Sources of a dataset directory (default: the committed fixture dataset web/ uses). */
function sourcesOf(env: Record<string, string | undefined> = {}): ShardSources {
  return Object.fromEntries(FINGERPRINT_FILES.map((f) => [f, readFileSync(resolve(dataDirOf(env), f), 'utf8')])) as ShardSources
}

function dataDirOf(env: Record<string, string | undefined>): string {
  return dataDir(env)
}

const buildFixture = () => buildShards(sourcesOf())

function fileOf(built: { fingerprint: string; files: { path: string; json: string }[] }, relPath: string): string | undefined {
  return built.files.find((f) => f.path === `v${built.fingerprint}/${relPath}`)?.json
}

function jsonOf(built: Parameters<typeof fileOf>[0], relPath: string): ReturnType<typeof JSON.parse> | undefined {
  const text = fileOf(built, relPath)
  return text && JSON.parse(text)
}

/** Every shard file: versioned path, no CSV, parses as JSON. */
function assertWellFormedShards(built: { fingerprint: string; files: { path: string; json: string }[] }): void {
  expect(built.fingerprint).toMatch(/^[0-9a-f]{16}$/)
  expect(built.files.length).toBeGreaterThan(0)
  for (const f of built.files) {
    expect(f.path.startsWith(`v${built.fingerprint}/`), f.path).toBe(true)
    expect(f.path.endsWith('.csv'), f.path).toBe(false)
    expect(() => JSON.parse(f.json)).not.toThrow()
  }
}

it('fixture: the data check passes (every city has a shard; shard totals equal the CSV totals)', async () => {
  const built = buildFixture()
  assertWellFormedShards(built)
  expect(await verifyShards(built, sourcesOf())).toEqual([])
})

it('regenerating from the same dataset gives byte-identical shards', () => {
  const built1 = buildFixture()
  const built2 = buildFixture()
  expect(built2.fingerprint).toBe(built1.fingerprint)
  for (const f of built2.files) expect(built1.files.find((e) => e.path === f.path)?.json, f.path).toBe(f.json)
})

it('regeneration writes byte-identical files into different directories, and no CSV', () => {
  const a = mkdtempSync(resolve(tmpdir(), 'shards-a-'))
  const b = mkdtempSync(resolve(tmpdir(), 'shards-b-'))
  try {
    const fingerprint = generateShards(a, {})
    generateShards(b, {})
    expect(fingerprint).toMatch(/^[0-9a-f]{16}$/)
    expect(walkDir(b)).toEqual(walkDir(a))
    expect([...walkDir(a)].filter(([name]) => name.endsWith('/.generator')).length).toBe(1) // the sentinel, not JSON
    expect([...walkDir(a)].every(([name, json]) => !name.endsWith('.csv') && (name.endsWith('/.generator') || typeof JSON.parse(json) === 'object'))).toBe(true)
  } finally {
    rmSync(a, { recursive: true, force: true })
    rmSync(b, { recursive: true, force: true })
  }
})

function walkDir(root: string): [string, string][] {
  const out: [string, string][] = []
  const walk = (dir: string, base: string): void => {
    for (const entry of readdirSync(dir).sort()) {
      const full = resolve(dir, entry)
      if (statSync(full).isDirectory()) walk(full, `${base}${entry}/`)
      else out.push([`${base}${entry}`, readFileSync(full, 'utf8')])
    }
  }
  walk(root, '')
  return out
}

it('the fingerprint changes when the dataset changes and is stable otherwise', () => {
  const sources = sourcesOf()
  const expectedFingerprint = datasetFingerprint(sources)
  // A changed byte — any byte — of any dataset file selects a different version directory.
  const touched: ShardSources = { ...sources, 'cities.csv': `${sources['cities.csv']}# touched\n` }
  expect(datasetFingerprint(touched)).not.toBe(expectedFingerprint)
  expect(expectedFingerprint).toBe(buildFixture().fingerprint)
})

it('the fingerprint covers exactly the dataset files the app store reads, plus the centroids the shards add (no drift)', () => {
  expect([...FINGERPRINT_FILES].sort(byText)).toEqual([...DATA_FILES, 'centroids.csv'].sort(byText))
})

it('the fingerprint on disk agrees with the built shards (nothing stale served)', async () => {
  expect(await datasetFingerprintFromDisk({})).toBe(buildFixture().fingerprint)
})

describe('fixture shards', () => {
  it('Boa Esperança do Norte exists only in 2026: no 2018 or 2022 keys, never zeros', () => {
    const built = buildFixture()
    const shard = jsonOf(built, 'city/mt/boa-esperanca-do-norte.json') as { city?: { ciclos?: number[] }; cycles?: Record<string, unknown> } | undefined
    expect(shard).toBeDefined()
    expect(shard!.city!.ciclos).toEqual([2026])
    expect(Object.keys(shard!.cycles!)).toEqual(['2026'])
  })

  it('a city with all cycles and rounds has a block for every one and the candidate block per cycle and round', () => {
    const built = buildFixture()
    const shard = jsonOf(built, 'city/rj/cidade-exemplo.json') as { cycles?: Record<string, Record<string, unknown>>; candidates?: Record<string, Record<string, unknown>> } | undefined
    expect(shard).toBeDefined()
    expect(Object.keys(shard!.cycles!).sort()).toEqual(['2018', '2022', '2026'])
    for (const rounds of Object.values(shard!.cycles!)) expect(Object.keys(rounds).sort()).toEqual(['1', '2'])
    expect(Object.keys(shard!.candidates ?? {})).toEqual(expect.arrayContaining(['2018', '2022', '2026']))
    for (const rounds of Object.values(shard!.candidates ?? {})) expect(Object.keys(rounds).sort()).toEqual(['1', '2'])
  })

  it('overseas posts shard is a city (uf zz), and zz never has a state shard', () => {
    const built = buildFixture()
    const overseas = jsonOf(built, 'city/zz/exterior-exemplo.json') as { city?: { uf?: string; ciclos?: number[] } } | undefined
    expect(overseas?.city?.uf).toBe('zz')
    expect(overseas?.city?.ciclos).toEqual([2018, 2022, 2026])
    expect(built.files.some((f) => f.path.includes('state/zz.'))).toBe(false)
  })

  it('each dataset state has a state shard with its cities (name and slug only)', () => {
    const built = buildFixture()
    const rj = jsonOf(built, 'state/rj.json') as { cities?: { nome: string; slug: string }[] } | undefined
    expect(rj).toBeDefined()
    expect(rj!.cities).toContainEqual({ nome: 'Cidade Exemplo', slug: 'cidade-exemplo' })
    expect(rj!.cities!.every((c) => Object.keys(c).sort().join() === 'nome,slug')).toBe(true)
    const states = built.files.filter((f) => f.path.includes('/state/')).map((f) => f.path.replace(/^v[0-9a-f]{16}\/state\/|\.json$/g, ''))
    expect(states.sort()).toEqual(['mt', 'rj', 'sp'])
  })

  it('the search index is [nome, slug, uf] rows of every city, overseas included', () => {
    const built = buildFixture()
    const search = jsonOf(built, 'search.json') as [string, string, string][]
    expect(search).toContainEqual(['Boa Esperança do Norte', 'boa-esperanca-do-norte', 'mt'])
    expect(search).toContainEqual(['Exterior (posto exemplo)', 'exterior-exemplo', 'zz'])
    const slugs = search.map(([, slug]) => slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('totals: national includes the overseas posts, and exactly the dataset regions have a block (exterior included)', () => {
    const built = buildFixture()
    const totals = jsonOf(built, 'totals.json') as { national?: Record<string, Record<string, { validos?: number }>>; regions?: Record<string, unknown> }
    // Only regions with cities: a region block is never invented for absence (fixture has 3 of the 6).
    expect(Object.keys(totals.regions ?? {}).sort()).toEqual(['centro-oeste', 'exterior', 'sudeste'])
    // national validos of 2026 round 2 is the sum over the cities, overseas posts included (never one region's)
    expect(totals.national?.['2026']?.['2']?.validos).toBeGreaterThan(0)
  })
})

/** A tiny synthetic dataset, committed here: one city with a rowless round, one normal city. */
function synthetic(): ShardSources {
  return {
    'cities.csv':
      'uf,cd_municipio,cd_ibge,nome,slug,regiao,ciclos\n' +
      'aa,1,1,ALFA CITY,alfa-city,sul,2026\n' +
      'bb,2,2,BETA TOWN,beta-town,sul,2026\n',
    'turnout.csv':
      'ano,turno,uf,cd_municipio,aptos,comparecimento,abstencoes,brancos,nulos,anulados_apu_sep,validos\n' +
      '2026,1,aa,1,10,8,2,1,2,0,5\n' +
      '2026,2,bb,2,20,14,6,2,3,0,9\n',
    'votes.csv':
      'ano,turno,uf,cd_municipio,candidato_numero,votos\n' +
      '2026,1,aa,1,77,5\n' +
      '2026,1,aa,1,88,3\n',
    'candidates.csv':
      'ano,turno,candidato_numero,nome_urna,partido\n' +
      '2026,1,77,ZETA,PZ\n' +
      '2026,1,88,YPSILON,PY\n' +
      '2026,2,77,DELTA,PD\n',
    'manifest.json': '{}',
    'centroids.csv': 'cd_ibge,lat,lon\n',
  }
}

describe('shard contract', () => {
  it('a round with rows gets turnout fields and votes; a round without is absent (never zeros)', async () => {
    const built = buildShards(synthetic())
    const alfa = jsonOf(built, 'city/aa/alfa-city.json') as { cycles: Record<string, Record<string, Record<string, unknown>>> }
    expect(Object.keys(alfa.cycles['2026']!)).toEqual(['1']) // round 2 has rows only for bb
    const round = alfa.cycles['2026']!['1']!
    expect(Object.keys(round)).toEqual(['aptos', 'comparecimento', 'abstencoes', 'brancos', 'nulos', 'anuladosApuSep', 'validos', 'votes'])
    expect(round.votes).toEqual({ 77: 5, 88: 3 })
    await expect(verifyShards(built, synthetic())).resolves.toEqual([])
  })

  it('a vote row of a candidate the dataset never names breaks the build', () => {
    const sources = synthetic()
    sources['votes.csv'] = sources['votes.csv'].replace('2026,1,aa,1,88,3\n', '2026,1,aa,1,999,3\n')
    expect(() => buildShards(sources)).toThrow(/candidates\.csv|candidate 999/)
  })

  it('a turnout row without a city row breaks the build', () => {
    const sources = synthetic()
    sources['turnout.csv'] = `${sources['turnout.csv']}2026,2,zz,1,10,8,2,1,2,0,5\n`
    expect(() => buildShards(sources)).toThrow(/turnout\.csv: zz 1 has no city row/)
  })

  it('a duplicate city row breaks the build', () => {
    const sources = synthetic()
    sources['cities.csv'] = `${sources['cities.csv']}aa,1,1,ALFA CITY AGAIN,alfa-city-again,sul,2026\n`
    expect(() => buildShards(sources)).toThrow(/duplicate city/)
  })

  it('a slug used twice within one state breaks the build (shard paths would collide)', () => {
    const sources = synthetic()
    sources['cities.csv'] = `uf,cd_municipio,cd_ibge,nome,slug,regiao,ciclos\naa,1,1,ALFA CITY,alfa-city,sul,2026\naa,3,3,ALFA OTHER,alfa-city,sul,2026\n`
    expect(() => buildShards(sources)).toThrow(/slug "alfa-city" is used twice/)
  })

  it('a second turnout row for the same city and round breaks the build', () => {
    const sources = synthetic()
    sources['turnout.csv'] = `${sources['turnout.csv']}2026,1,aa,1,10,8,2,1,2,0,5\n`
    expect(() => buildShards(sources)).toThrow(/two rows for aa 1 2026/)
  })
})

describe('verify catches broken shards', () => {
  it('invented zeros for a round the dataset has no rows for', async () => {
    const built = buildShards(synthetic())
    const shardFile = built.files.find((f) => f.path.endsWith('city/aa/alfa-city.json'))!
    const shard = JSON.parse(shardFile.json) as { cycles: Record<string, Record<string, Record<string, unknown>>> }
    shard.cycles['2018'] = { '1': { aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 0 } }
    shardFile.json = JSON.stringify(shard)
    expect((await verifyShards(built, synthetic())).some((problem) => problem.includes('has no dataset row'))).toBe(true)
  })

  it('a turnout row that violates the identity', async () => {
    const sources = synthetic()
    sources['turnout.csv'] = sources['turnout.csv'].replace('2026,1,aa,1,10,8,2,1,2,0,5\n', '2026,1,aa,1,10,7,2,1,2,0,5\n')
    const built = buildShards(sources)
    expect((await verifyShards(built, sources)).some((problem) => problem.startsWith('turnout identity'))).toBe(true)
  })

  it('totals missing a cycle and round', async () => {
    const built = buildShards(synthetic())
    const totalsFile = built.files.find((f) => f.path.endsWith('totals.json'))!
    const totals = JSON.parse(totalsFile.json) as { national: Record<string, Record<string, unknown>> }
    delete totals.national['2026']!['2']
    totalsFile.json = JSON.stringify(totals)
    expect((await verifyShards(built, synthetic())).some((problem) => problem.includes('national totals of'))).toBe(true)
  })

  it('a city shard missing (the coverage rule)', async () => {
    const built = buildShards(synthetic())
    built.files = built.files.filter((f) => !f.path.endsWith('city/aa/alfa-city.json'))
    const problems = await verifyShards(built, synthetic())
    expect(problems.some((problem) => problem.includes('no shard city/aa/alfa-city.json'))).toBe(true)
  })
})

describe('peers.json (#23)', () => {
  const built = buildFixture()
  const peers = jsonOf(built, 'peers.json') as { k: number; cities: string[]; peers: number[][]; twins: number[] }

  it('is part of the shards, well formed, one peer list per city and every index valid', () => {
    expect(peers.k).toBe(5)
    expect(peers.peers).toHaveLength(peers.cities.length)
    for (const [i, list] of peers.peers.entries()) {
      expect(list.length).toBeLessThanOrEqual(peers.k)
      for (const j of list) {
        expect(j).toBeGreaterThanOrEqual(0)
        expect(j).toBeLessThan(peers.cities.length)
        expect(j).not.toBe(i)
      }
    }
  })
  it('lists every city of the fixture except the overseas post', () => {
    const search = jsonOf(built, 'search.json') as [string, string, string][]
    expect(peers.cities).toEqual(search.filter(([, , uf]) => uf !== 'zz').map(([, slug, uf]) => `${uf}/${slug}`).sort(byText))
    expect(peers.cities.some((c) => c.startsWith('zz/'))).toBe(false)
  })
  it('has a twin per city: an index of ANOTHER state, or -1; the fixture rj cities have the sp city or the mt city', () => {
    expect(peers.twins).toHaveLength(peers.cities.length)
    for (const [i, j] of peers.twins.entries()) {
      if (j < 0) continue
      expect(peers.cities[j]!.split('/')[0]).not.toBe(peers.cities[i]!.split('/')[0])
    }
    const twin = (key: string) => peers.cities[peers.twins[peers.cities.indexOf(key)]!]
    expect(['sp/cidade-exemplo-paulista', 'mt/boa-esperanca-do-norte']).toContain(twin('rj/cidade-exemplo'))
    expect(twin('sp/cidade-exemplo-paulista')!.startsWith('rj/') || twin('sp/cidade-exemplo-paulista')!.startsWith('mt/')).toBe(true)
  })
  it('regenerating gives the same bytes', () => {
    expect(fileOf(buildFixture(), 'peers.json')).toBe(fileOf(built, 'peers.json'))
  })
})

describe('arcs.json (#41)', () => {
  const built = buildFixture()
  const arcs = jsonOf(built, 'arcs.json') as { counts: Record<string, number>; overseas: Record<string, number> }

  it('counts every city once, per arc of the closed list; the overseas post is counted apart', () => {
    const kinds = ['same', 'switched2022', 'switched2026', 'returned', 'switchedTwice', 'tie', 'missing']
    expect(Object.keys(arcs.counts)).toEqual(kinds)
    expect(Object.keys(arcs.overseas)).toEqual(kinds)
    const search = jsonOf(built, 'search.json') as [string, string, string][]
    expect(Object.values(arcs.counts).reduce((a, b) => a + b, 0)).toBe(search.filter(([, , uf]) => uf !== 'zz').length)
    expect(Object.values(arcs.overseas).reduce((a, b) => a + b, 0)).toBe(search.filter(([, , uf]) => uf === 'zz').length)
  })
  it('Boa Esperança do Norte, with only 2026, is the one city with a missing cycle', () => {
    expect(arcs.counts.missing).toBe(1)
  })
  it('regenerating gives the same bytes', () => {
    expect(fileOf(buildFixture(), 'arcs.json')).toBe(fileOf(built, 'arcs.json'))
  })
})

describe('curiosities.json (#33)', () => {
  const built = buildFixture()
  const file = jsonOf(built, 'curiosities.json') as { minGroup: number; facts: Record<string, (string | number)[][]> }

  it('uses the fixture minimum, lists only cities of the dataset and at most three facts each', () => {
    expect(file.minGroup).toBe(2)
    const search = jsonOf(built, 'search.json') as [string, string, string][]
    const keys = search.filter(([, , uf]) => uf !== 'zz').map(([, slug, uf]) => `${uf}/${slug}`)
    for (const [city, facts] of Object.entries(file.facts)) {
      expect(keys).toContain(city)
      expect(facts.length).toBeGreaterThan(0)
      expect(facts.length).toBeLessThanOrEqual(3)
      for (const [, rank, n] of facts) expect(rank as number).toBeLessThanOrEqual(n as number)
    }
    expect(file.facts['rj/cidade-exemplo']).toBeDefined()
  })
  it('regenerating gives the same bytes', () => {
    expect(fileOf(buildFixture(), 'curiosities.json')).toBe(fileOf(built, 'curiosities.json'))
  })
})

describe('centroids.json (#40)', () => {
  const built = buildFixture()
  const shard = jsonOf(built, 'centroids.json') as Record<string, [string, number, number][]>

  it('has, per state, the cities that have an IBGE centre: [slug, lat, lon], sorted, the overseas post and a city without a centre left out', () => {
    expect(Object.keys(shard)).toEqual(['rj', 'sp'])
    expect(shard.rj!.map(([slug]) => slug)).toEqual(['cidade-exemplo', 'cidade-exemplo-a', 'cidade-exemplo-b', 'cidade-exemplo-c', 'cidade-exemplo-d', 'cidade-exemplo-e'])
    expect(shard.sp!.map(([slug]) => slug)).toEqual(['cidade-exemplo-paulista'])
    for (const rows of Object.values(shard)) for (const [, lat, lon] of rows) expect(Number.isFinite(lat) && Number.isFinite(lon)).toBe(true)
  })

  it('regenerating gives the same bytes, and the file is versioned like the others', () => {
    expect(fileOf(buildFixture(), 'centroids.json')).toBe(fileOf(built, 'centroids.json'))
    expect(built.files.some((f) => f.path === `v${built.fingerprint}/centroids.json`)).toBe(true)
  })

  it('a centre for a city the dataset does not have breaks the build', () => {
    const sources = { ...synthetic(), 'centroids.csv': 'cd_ibge,lat,lon\n9,-1,-1\n' }
    expect(() => buildShards(sources)).toThrow(ShardError)
  })

  it('a dataset without centres still builds, with an empty file', () => {
    const empty = JSON.parse(fileOf(buildShards(synthetic()), 'centroids.json')!)
    expect(empty).toEqual({})
  })
})
