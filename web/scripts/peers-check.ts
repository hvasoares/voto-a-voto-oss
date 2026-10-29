/**
 * `npm run check:peers` — the real-data record of ticket #23: the published size of peers.json for every city, and a
 * spot check of ten cities (a capital and a very small one included) listing each city's peers next to the features
 * the method used (size band, round-1 turnout and margin of the latest cycle), so a reviewer can read why they are peers.
 *   DATA_DIR=../data npm run check:peers [uf/slug ...]
 */
import { gzipSync } from 'node:zlib'
import { parseCities, parseTurnout, parseVotes } from '../src/data/csv'
import { loadDatasetShards } from '../integrations/shards'
import { sizeBand, type PeersFile } from '../src/lib/peers'

const { dir, sources, built } = loadDatasetShards()
const json = built.files.find((f) => f.path.endsWith('/peers.json'))!.json
const peers = JSON.parse(json) as PeersFile

const kb = (n: number) => `${(n / 1024).toFixed(1)} kB`
const raw = Buffer.byteLength(json, 'utf8')
console.log(`peers.json over ${dir} (fingerprint ${built.fingerprint}): ${peers.cities.length} cities, k=${peers.k}, raw ${raw} B (${kb(raw)}), gzip ${gzipSync(Buffer.from(json)).length} B (${kb(gzipSync(Buffer.from(json)).length)})`)
console.log(`cities without a full list of ${peers.k} peers: ${peers.peers.filter((p) => p.length < peers.k).length}`)

const cities = parseCities(sources['cities.csv'])
const turnout = parseTurnout(sources['turnout.csv']).filter((t) => t.turno === 1)
const votes = parseVotes(sources['votes.csv']).filter((v) => v.turno === 1)
const name = new Map(cities.map((c) => [`${c.uf}/${c.slug}`, c]))
/** "2026: 85,0% turnout, margin 12,3 pp" of a city, from the latest cycle with round-1 data. */
function facts(id: string): string {
  const c = name.get(id)!
  const years = turnout.filter((t) => t.uf === c.uf && t.cdMunicipio === c.cdMunicipio).sort((a, b) => b.ano - a.ano)
  const t = years[0]
  if (!t) return 'no data'
  const tallies = votes.filter((v) => v.uf === c.uf && v.cdMunicipio === c.cdMunicipio && v.ano === t.ano).map((v) => v.votos).sort((a, b) => b - a)
  const margin = t.validos > 0 ? (((tallies[0] ?? 0) - (tallies[1] ?? 0)) / t.validos) * 100 : NaN
  const f1 = (x: number) => x.toFixed(1).replace('.', ',')
  return `${c.nome}/${c.uf.toUpperCase()} · ${new Intl.NumberFormat('pt-BR').format(t.aptos)} aptos (faixa ${sizeBand(t.aptos)}) · ${t.ano}: comparecimento ${f1((t.comparecimento / t.aptos) * 100)}%, margem ${f1(margin)} p.p. · ciclos ${c.ciclos.join(',')}`
}

const picks = process.argv.slice(2).length ? process.argv.slice(2) : ['sp/sao-paulo', 'rj/rio-de-janeiro', 'ac/rio-branco', 'ba/urandi', 'rs/porto-alegre', 'mt/boa-esperanca-do-norte', 'pa/belem', 'mg/serra-da-saudade', 'pe/fernando-de-noronha', 'go/goiania']
for (const id of picks) {
  const i = peers.cities.indexOf(id)
  console.log(`\n${id}`)
  if (i < 0) {
    console.log('  not in the file')
    continue
  }
  console.log(`  ${facts(id)}`)
  for (const j of peers.peers[i]!) console.log(`  -> ${facts(peers.cities[j]!)}`)
}
