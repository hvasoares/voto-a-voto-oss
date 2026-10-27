/**
 * `npm run check:margin` — the record of ticket #26: for ten cities (a capital, a very small one, a tie-prone one ...) the
 * margin line of the latest cycle and round, with the votes and the turnout row it comes from, so a reviewer can redo the
 * arithmetic by hand from data/votes.csv and data/turnout.csv.
 *   DATA_DIR=../data npm run check:margin [uf/slug ...]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildShards, type ShardSources } from '../integrations/shards'
import { FINGERPRINT_FILES } from '../integrations/shards-fingerprint'
import { dataDir } from '../src/lib/data-dir'
import { cityShardResult, type CityShard } from '../src/lib/city-shard'
import { marginLine, marginVotes } from '../src/lib/sentences/margin'

const dir = dataDir()
const sources = {} as ShardSources
for (const f of FINGERPRINT_FILES) sources[f] = readFileSync(resolve(dir, f), 'utf8')
const built = buildShards(sources)
const shard = (id: string) => {
  const f = built.files.find((x) => x.path.endsWith(`/city/${id}.json`))
  return f ? (JSON.parse(f.json) as CityShard) : undefined
}

const picks = process.argv.slice(2).length ? process.argv.slice(2) : ['sp/sao-paulo', 'rj/rio-de-janeiro', 'ac/rio-branco', 'ba/urandi', 'rs/porto-alegre', 'mt/boa-esperanca-do-norte', 'pa/belem', 'mg/serra-da-saudade', 'pe/fernando-de-noronha', 'go/goiania']
for (const id of picks) {
  const s = shard(id)
  const r = s && cityShardResult(s, 2026, 1)
  const r2 = s && cityShardResult(s, 2026, 2)
  console.log(`\n${id}`)
  for (const [turno, x] of [[1, r], [2, r2]] as const) {
    if (!x) { console.log(`  2026 turno ${turno}: sem dados`); continue }
    const [a, b] = x.ranking
    console.log(`  2026 turno ${turno}: aptos ${x.aptos}, validos ${x.validos}, naoVotaram ${x.naoVotaram}; 1o ${a?.votos} - 2o ${b?.votos} = ${marginVotes(x)}`)
    console.log(`    ${marginLine(x, { cityName: id })}`)
  }
}
