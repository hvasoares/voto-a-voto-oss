/**
 * `npm run check:curiosities` — the record of ticket #33: how many cities have a card, and for ten cities the facts shown with
 * the city's own value, its group (size band + same cycles) and its place in the sorted values, so a reviewer can redo the ranking.
 *   DATA_DIR=../data npm run check:curiosities [uf/slug ...]
 */
import { loadDatasetShards } from '../integrations/shards'
import type { CityShard } from '../src/lib/city-shard'
import { curiosities, MIN_GROUP, readings } from '../src/lib/curiosities'
import { message } from '../src/lib/sentences/catalog'

const { sources, built } = loadDatasetShards()
const shards = built.files.filter((f) => /\/city\/[^/]+\/[^/]+\.json$/.test(f.path)).map((f) => JSON.parse(f.json) as CityShard)
const minGroup = (JSON.parse(sources['manifest.json']) as { fixture?: boolean }).fixture ? 2 : MIN_GROUP
const facts = curiosities(shards, minGroup)
const voice = { locale: 'pt-BR', register: 'standard' } as const
console.log(`${facts.size} of ${shards.filter((s) => s.city.uf !== 'zz').length} cities have a card (minimum group ${minGroup}); facts per city: ${[1, 2, 3].map((n) => `${n}: ${[...facts.values()].filter((f) => f.length === n).length}`).join(', ')}`)

const measureOf = { td: 'turnout', tu: 'turnout', ml: 'margin', mh: 'margin', bl: 'blank', bh: 'blank' } as const
const picks = process.argv.slice(2).length ? process.argv.slice(2) : ['sp/sao-paulo', 'rj/rio-de-janeiro', 'ac/rio-branco', 'ba/urandi', 'rs/porto-alegre', 'mt/boa-esperanca-do-norte', 'pa/belem', 'mg/serra-da-saudade', 'pe/fernando-de-noronha', 'go/goiania']
const by = new Map(shards.map((s) => [`${s.city.uf}/${s.city.slug}`, s]))
for (const id of picks) {
  const shard = by.get(id)
  console.log(`\n${id}`)
  const mine = shard && readings(shard)
  const list = facts.get(id) ?? []
  if (!list.length) console.log(`  no card (${mine ? `size band ${mine.band}; ${mine.readings.length} measure(s), none in the first quarter of a group of ${minGroup}+` : 'no round-1 data'})`)
  for (const f of list) {
    const measure = measureOf[f.code]
    const me = mine!.readings.find((r) => r.measure === measure)!
    const group = shards
      .map((s) => ({ s, r: readings(s) }))
      .filter(({ r }) => r && r.band === mine!.band)
      .map(({ r }) => r!.readings.find((x) => x.measure === measure && x.cycles.join() === me.cycles.join()))
      .filter((x) => x !== undefined)
      .map((x) => x!.value)
    const sorted = [...group].sort((a, b) => (f.code === 'td' || f.code === 'ml' || f.code === 'bl' ? a - b : b - a))
    console.log(`  ${f.rank}ª ${message(voice, `curio.${f.code}`)} | grupo ${f.n} (banda ${mine!.band}), ciclos ${f.cycles.join(', ')} | valor ${me.value.toFixed(4)}; posição na lista ordenada: ${sorted.findIndex((v) => v === me.value) + 1} de ${sorted.length}`)
  }
}
