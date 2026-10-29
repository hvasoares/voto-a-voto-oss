/**
 * The real-data sample of ticket #109: a subset dataset of the states listed in `e2e/sample.json`, written to the
 * git-ignored `web/.sample-data/` from the committed, pinned `../data` (never `.cache/tse`, never the network).
 * Keeps only the rows of the listed states in the four per-city tables and copies `candidates.csv` and
 * `manifest.json` unchanged — deterministic: states sorted, rows in source order.
 *
 * It also writes the git-ignored `web/.sample-editions/<date>-sample/edition.json`: the build's "conferido" seal gate
 * (src/lib/facts/checks-load.ts) refuses a dataset whose fingerprint no committed edition records, and the
 * national checks compare the shard sums against the edition totals — so the sample edition carries the
 * fingerprint and the subset's own national sums, in the exact shape of src/voto_a_voto/editions.py.
 *
 * Usage:
 *   npx tsx scripts/sample-data.ts           # generate .sample-data/ and .sample-editions/
 *   npx tsx scripts/sample-data.ts pages     # count the pages of the built dist-sample, fail above the bound
 *
 * The script is deliberately small and imports only the shard fingerprint (present in every checkout the
 * backtest visits): sample-backtest.sh copies it, unchanged, over old commits.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { datasetFingerprint, FINGERPRINT_FILES, type ShardSources } from '../integrations/shards-fingerprint'

/**
 * Page bound of the sample build (ticket #109): the gate is the 3-minute build; the bound is its cheap proxy.
 * The ticket's 12,000 assumed a ~1,000-city sample; keeping the national 2nd-round leader true on the subset
 * (ladoA of every margin sentence, src/lib/margins.ts) needs ba+ce, which is ~15.5k pages at ~100 s — under half
 * the gate. Above the bound, review the manifest before accepting the time.
 */
export const PAGE_BOUND = 16_000

const webRoot = fileURLToPath(new URL('..', import.meta.url))
const sourceDir = resolve(webRoot, '..', 'data')
const outData = resolve(webRoot, '.sample-data')
const outEditions = resolve(webRoot, '.sample-editions')

type Rows = { header: string; rows: string[] }

const readTable = (file: string): Rows => {
  const lines = readFileSync(resolve(sourceDir, file), 'utf8').split('\n')
  const header = lines[0]!
  return { header, rows: lines.slice(1).filter((line) => line.length > 0) }
}

const writeTable = (file: string, table: Rows): string => {
  const text = `${table.header}\n${table.rows.join('\n')}\n`
  writeFileSync(resolve(outData, file), text)
  return text
}

/** Filter a table by a predicate over its parsed columns (header carries the column names). */
const filterBy = (table: Rows, column: string, keep: (value: string, cols: string[]) => boolean): Rows => {
  const names = table.header.split(',')
  const index = names.indexOf(column)
  if (index < 0) throw new Error(`${column}: no such column in ${table.header}`)
  return { header: table.header, rows: table.rows.filter((row) => { const cols = row.split(','); return keep(cols[index]!, cols) }) }
}

interface SampleManifest {
  states: { uf: string; why: string }[]
}

function generate(): void {
  const manifest = JSON.parse(readFileSync(resolve(webRoot, 'e2e/sample.json'), 'utf8')) as SampleManifest
  const ufs = manifest.states.map((s) => s.uf).sort()
  const wanted = new Set(ufs)

  rmSync(outData, { recursive: true, force: true })
  rmSync(outEditions, { recursive: true, force: true })
  mkdirSync(outData, { recursive: true })

  const cities = filterBy(readTable('cities.csv'), 'uf', (uf) => wanted.has(uf))
  const votes = filterBy(readTable('votes.csv'), 'uf', (uf) => wanted.has(uf))
  const turnout = filterBy(readTable('turnout.csv'), 'uf', (uf) => wanted.has(uf))

  const sources: Partial<ShardSources> = {}
  sources['cities.csv'] = writeTable('cities.csv', cities)
  sources['votes.csv'] = writeTable('votes.csv', votes)
  sources['turnout.csv'] = writeTable('turnout.csv', turnout)
  // centroids.csv arrived after the oldest backtest commit (4bd5da4~1 has none): only when the source has it.
  let centroidCount = 0
  if (existsSync(resolve(sourceDir, 'centroids.csv'))) {
    const ibge = new Set(cities.rows.map((row) => row.split(',')[2]!))
    const centroids = filterBy(readTable('centroids.csv'), 'cd_ibge', (cd) => ibge.has(cd))
    centroidCount = centroids.rows.length
    sources['centroids.csv'] = writeTable('centroids.csv', centroids)
  }
  for (const file of ['candidates.csv', 'manifest.json'] as const) {
    copyFileSync(resolve(sourceDir, file), resolve(outData, file))
    sources[file] = readFileSync(resolve(outData, file), 'utf8')
  }

  // The edition record of the subset (src/voto_a_voto/editions.py shape, counts_of/totals_of semantics).
  const cityRows = cities.rows.map((row) => row.split(','))
  const municipalities = cityRows.filter((cols) => cols[0] !== 'zz')
  const perCycle: Record<string, number> = {}
  for (const cols of municipalities) for (const year of cols[6]!.split(';')) perCycle[year] = (perCycle[year] ?? 0) + 1
  const totals: Record<string, { comparecimento: number; validos: number }> = {}
  for (const row of turnout.rows) {
    const cols = row.split(',')
    const key = `${cols[0]}-${cols[1]}`
    const entry = (totals[key] ??= { comparecimento: 0, validos: 0 })
    entry.comparecimento += Number(cols[5])
    entry.validos += Number(cols[10])
  }
  const files: Record<string, { bytes: number; sha256: string }> = {}
  for (const file of FINGERPRINT_FILES) {
    const text = sources[file]!
    files[file] = { bytes: Buffer.byteLength(text), sha256: createHash('sha256').update(text).digest('hex') }
  }
  const manifestData = JSON.parse(sources['manifest.json']!) as { sources?: { retrieved_at?: string }[] }
  const dates = (manifestData.sources ?? []).map((s) => s.retrieved_at?.slice(0, 10)).filter((d): d is string => !!d).sort()
  const fingerprint = datasetFingerprint(sources as ShardSources)
  const date = dates.at(-1) ?? '2026-01-01'
  // The id must look like an edition id (src/lib/card-keys.ts validates the shape): the collection date + suffix.
  const id = `${date}-sample`
  const edition = {
    schema_version: 1,
    id,
    date,
    fingerprint,
    counts: {
      municipalities: municipalities.length,
      overseas_posts: cityRows.length - municipalities.length,
      municipalities_per_cycle: Object.fromEntries(Object.entries(perCycle).sort()),
      rows: {
        'candidates.csv': candidatesCount(sources['candidates.csv']!),
        'centroids.csv': centroidCount,
        'cities.csv': cities.rows.length,
        'turnout.csv': turnout.rows.length,
        'votes.csv': votes.rows.length,
      },
    },
    totals: Object.fromEntries(Object.entries(totals).sort()),
    notes: [
      `Amostra gerada por web/scripts/sample-data.ts (ticket #109) para testes locais: somente ${ufs.join(', ')}.`,
      'Não é uma edição publicada; os totais nacionais dela são as somas do recorte.',
    ],
    files,
    publication: { mode: 'manual', checks: [] },
    release: { identifier: 'voto-a-voto-sample', license: 'CC-BY-4.0', url: `https://voto-a-voto.com/edicoes/${id}/dados/`, files: {} },
  }
  const editionDir = resolve(outEditions, id)
  mkdirSync(editionDir, { recursive: true })
  writeFileSync(resolve(editionDir, 'edition.json'), `${JSON.stringify(edition, null, 2)}\n`)

  // The pre-computed nerds aggregates hold whole-country figures (their specs are fullOnly): copied unchanged except
  // for the edition stamp inside every shard, which NerdsPage.astro checks against the site's edition. Nothing in
  // the sample derives from the nerds numbers. Not part of the dataset fingerprint.
  const nerdsSource = resolve(sourceDir, 'nerds')
  if (existsSync(nerdsSource)) {
    cpSync(nerdsSource, resolve(outData, 'nerds'), { recursive: true })
    for (const file of findJson(resolve(outData, 'nerds'))) {
      const shard = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>
      if ('edition' in shard) shard.edition = id
      if ('hash' in shard) shard.hash = fingerprint
      writeFileSync(file, `${JSON.stringify(shard)}\n`)
    }
  }

  const perUf = ufs.map((uf) => `${uf} ${cityRows.filter((c) => c[0] === uf).length}`).join(', ')
  console.log(`sample: ${cityRows.length} cities (${perUf}), fingerprint ${fingerprint}`)
  console.log(`sample: data in ${outData}, edition in ${editionDir}`)
}

const candidatesCount = (text: string) => text.split('\n').filter((line) => line.length > 0).length - 1

/** Counts the pages a build of the sample produced; fails above the bound (the manifest is what gets reviewed). */
function pages(): void {
  const outDir = resolve(webRoot, process.env.OUT_DIR ?? 'dist-sample')
  const count = walk(outDir)
  console.log(`sample: ${count} pages in ${outDir} (bound ${PAGE_BOUND})`)
  if (count > PAGE_BOUND) {
    console.error(`sample: ${count} pages is above the ${PAGE_BOUND} bound — shrink web/e2e/sample.json`)
    process.exit(1)
  }
}

function walk(dir: string): number {
  let count = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) count += walk(path)
    else if (entry.name === 'index.html') count++
  }
  return count
}

function findJson(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findJson(path))
    else if (entry.name.endsWith('.json')) out.push(path)
  }
  return out
}

// Only when run as a script: sample-manifest.ts imports PAGE_BOUND and must not generate data on import.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2] ?? 'generate'
  if (command === 'generate') generate()
  else if (command === 'pages') pages()
  else {
    console.error(`sample: unknown command "${command}" (generate | pages)`)
    process.exit(1)
  }
}
