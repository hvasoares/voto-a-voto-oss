/**
 * `npm run check:facts` — the data-level fact gate (#61) over a whole dataset, next to `check:shards`: every city shard gives its records,
 * and every record has an id, a sentence in both registers, inputs, a source and a calculation; ids are unique across the dataset.
 * Choose the dataset with DATA_DIR (default: the fixtures; the recorded run uses DATA_DIR=../data). Exit 1 on any problem.
 */
import { loadDatasetShards } from '../integrations/shards'
import { cityShardResult, type CityShard } from '../src/lib/city-shard'
import { factsOf, type CuriositiesFile } from '../src/lib/curiosities'
import { gateProblems } from '../src/lib/facts/gate'
import { curiosityFacts, factPage, viewFacts, type Fact } from '../src/lib/facts/model'
import { curiosityLineSentence } from '../src/slots/city/curiosities'
import { displayName } from '../src/shared/city-search'
import { CYCLES } from '../src/shared/city-model'

const { dir, built } = loadDatasetShards()
const json = (name: string) => built.files.find((f) => f.path.endsWith(`/${name}`))!.json
const curio = JSON.parse(json('curiosities.json')) as CuriositiesFile
const shards = built.files.filter((f) => /\/city\/[^/]+\/[^/]+\.json$/.test(f.path)).map((f) => JSON.parse(f.json) as CityShard)

const all: Fact[] = []
let pages = 0
for (const s of shards) {
  const place = { uf: s.city.uf, slug: s.city.slug, name: displayName(s.city.nome), overseas: s.city.uf === 'zz' }
  for (const ano of CYCLES)
    for (const turno of [1, 2] as const) {
      const facts = viewFacts(cityShardResult(s, ano, turno), place)
      if (facts.length) pages++
      all.push(...facts)
    }
  const own = factsOf(curio, place.uf, place.slug)
  if (own.length) {
    pages++
    all.push(...curiosityFacts(own, place, (c) => curiosityLineSentence(c)))
  }
}
const problems = gateProblems(all)
if (problems.length > 0) {
  console.error(`check:facts FAILED over ${dir}: ${problems.length} problem(s)`)
  for (const p of problems.slice(0, 40)) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`check:facts: ${all.length} fact records on ${pages} pages for ${shards.length} cities of ${dir}; every record has a source and a calculation, and no id repeats (${factPage(2026, 1)} style ids).`)
