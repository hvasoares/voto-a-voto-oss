/**
 * `npm run check:shards` — the real-data acceptance of ticket #49: every city (overseas posts included) has a
 * shard, shard totals equal the CSV totals for every cycle and round, the turnout identity holds, nothing absent
 * is invented; then the shard sizes for the budgets recorded in web/docs/shards.md. Choose the dataset with
 * DATA_DIR (default: the committed fixture dataset; the recorded run uses DATA_DIR=../data).
 */
import { gzipSync } from 'node:zlib'
import { verifyShards } from '../integrations/shards-verify'
import { loadDatasetShards } from '../integrations/shards'
import { ARC_KINDS, cityArc, type ArcsFile } from '../src/lib/arcs'
import type { CityShard } from '../src/lib/city-shard'
import type { CuriositiesFile } from '../src/lib/curiosities'

const { dir, sources, built } = loadDatasetShards()
const problems = await verifyShards(built, sources)
if (problems.length > 0) {
  console.error(`check:shards FAILED over ${dir} — ${problems.length} problem(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`check:shards: the shards of ${dir} cover the dataset exactly (${built.files.length} files, fingerprint ${built.fingerprint}).`)

const sizeOfJson = (files: { path: string; json: string }[], name: string): string => {
  const json = files.find((f) => f.path.endsWith(`/${name}`))!.json
  return `raw ${(Buffer.byteLength(json) / 1024).toFixed(1)} kB / gzip ${(gzipSync(Buffer.from(json)).length / 1024).toFixed(1)} kB`
}
// Arcs (#41): every city has exactly one arc, and the published counts add up to the cities (overseas posts apart).
const arcsFile = JSON.parse(built.files.find((f) => f.path.endsWith('/arcs.json'))!.json) as ArcsFile
const cityShards = built.files.filter((f) => /\/city\/[^/]+\/[^/]+\.json$/.test(f.path)).map((f) => JSON.parse(f.json) as CityShard)
const perCity = cityShards.map((s) => cityArc(s).kind)
const sum = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)
if (perCity.some((k) => !ARC_KINDS.includes(k)) || sum(arcsFile.counts) + sum(arcsFile.overseas) !== cityShards.length) {
  console.error(`check:shards FAILED: arcs.json does not give every city exactly one arc (${sum(arcsFile.counts)} + ${sum(arcsFile.overseas)} overseas for ${cityShards.length} cities)`)
  process.exit(1)
}
console.log(`arcs.json: ${JSON.stringify(arcsFile.counts)}; overseas posts ${JSON.stringify(arcsFile.overseas)}`)

const curio = JSON.parse(built.files.find((f) => f.path.endsWith('/curiosities.json'))!.json) as CuriositiesFile
console.log(`curiosities.json: ${Object.keys(curio.facts).length} of ${cityShards.filter((s) => s.city.uf !== 'zz').length} cities have a card (minimum group ${curio.minGroup}), ${sizeOfJson(built.files, 'curiosities.json')}`)

const kb = (n: number): string => `${(n / 1024).toFixed(1)} kB`
interface FileSize {
  path: string
  raw: number
  gzip: number
}
const sizeOf = (json: string): FileSize => ({ path: '', raw: Buffer.byteLength(json, 'utf8'), gzip: gzipSync(Buffer.from(json, 'utf8')).length })
const ofFiles = (files: { path: string; json: string }[]): FileSize[] =>
  files
    .map((f) => ({ ...sizeOf(f.json), path: f.path }))
    .sort((a, b) => a.raw - b.raw)
const report = (label: string, list: FileSize[], indices: number[]): string => {
  const n = (i: number): FileSize => list[Math.max(0, Math.min(i, list.length - 1))]!
  return `${label} (${list.length} file(s); raw / gzip): first ${n(0).path} ${kb(n(0).raw)} / ${kb(n(0).gzip)}; typical ${n(Math.floor(list.length / 2)).path} ${kb(n(Math.floor(list.length / 2)).raw)} / ${kb(n(Math.floor(list.length / 2)).gzip)}; last ${n(list.length - 1).path} ${kb(n(list.length - 1).raw)} / ${kb(n(list.length - 1).gzip)}`
}

const citySizes = ofFiles(built.files.filter((f) => f.path.includes('/city/')))
const stateSizes = ofFiles(built.files.filter((f) => f.path.includes('/state/')))
const search = sizeOf(built.files.find((f) => f.path.endsWith('search.json'))!.json)
const centroids = sizeOf(built.files.find((f) => f.path.endsWith('centroids.json'))!.json)
const totals = sizeOf(built.files.find((f) => f.path.endsWith('totals.json'))!.json)

console.log(report('city shards', citySizes, []))
console.log(report('state shards', stateSizes, []))
console.log(`totals.json: raw ${kb(totals.raw)} / gzip ${kb(totals.gzip)}`)
console.log(`search.json: raw ${kb(search.raw)} / gzip ${kb(search.gzip)} (fetched once, when the search field gains focus)`)
console.log(`centroids.json: raw ${kb(centroids.raw)} / gzip ${kb(centroids.gzip)} (fetched once, when "Usar minha localização" is tapped)`)
