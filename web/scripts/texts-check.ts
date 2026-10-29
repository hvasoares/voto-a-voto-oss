/**
 * `npm run check:texts` — the gate of the ready-made texts (#65) over a whole dataset: for every city, in both registers, the WhatsApp block is within its length
 * limit, the bulletin has no digit, no percent sign and its length is about 90 seconds, and no slot is left unfilled. The page build runs the same gate city by
 * city; this script runs it without a build. Choose the dataset with DATA_DIR (default: the fixtures; the recorded run uses DATA_DIR=../data). Exit 1 on any problem.
 */
import { loadDatasetShards } from '../integrations/shards'
import type { CityShard } from '../src/lib/city-shard'
import { cityTexts } from '../src/lib/city-texts-build'

const { dir, built } = loadDatasetShards()
const shards = built.files.filter((f) => /\/city\/[^/]+\/[^/]+\.json$/.test(f.path)).map((f) => JSON.parse(f.json) as CityShard)

let longest = 0
let longestBulletin = 0
const problems: string[] = []
for (const shard of shards) {
  try {
    const t = cityTexts(shard, { origin: 'https://voto-a-voto.com', base: '/', fixture: false, editionDate: '2026-11-03' })
    longest = Math.max(longest, ...Object.values(t.whatsapp).map((x) => x.length))
    longestBulletin = Math.max(longestBulletin, ...Object.values(t.bulletin).map((x) => x.split(/\s+/).length))
  } catch (e) {
    problems.push((e as Error).message)
  }
}
if (problems.length) {
  console.error(`check:texts FAILED over ${dir}: ${problems.length} problem(s)`)
  for (const p of problems.slice(0, 200)) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`check:texts: ${shards.length} cities of ${dir}, both registers: longest WhatsApp block ${longest} characters, longest bulletin ${longestBulletin} words; every bulletin number is spelled.`)
