import { describe, expect, it } from 'vitest'
import { ARC_KINDS, cityArc, countArcs } from './arcs'
import type { CityShard } from './city-shard'
import { fixtureCityShards } from './shard-files'

type Winner = 'PT' | 'BOL' | 'tie' | undefined
/** A shard whose 2nd rounds are won by the given camp (PT: 13; Bolsonaro: 17 in 2018, 22 later, as in candidates.csv), level, or absent (no votes that cycle). */
function shard(w: [Winner, Winner, Winner], uf = 'rj'): CityShard {
  const cycles: CityShard['cycles'] = {}
  const candidates: CityShard['candidates'] = {}
  ;([2018, 2022, 2026] as const).forEach((ano, i) => {
    const bol = ano === 2018 ? '17' : '22'
    candidates[String(ano)] = { '2': { '13': [ano === 2018 ? 'FERNANDO HADDAD' : 'LULA', 'PT'], [bol]: ['JAIR BOLSONARO', 'PL'] } }
    const who = w[i]
    if (who) cycles[String(ano)] = { '2': { aptos: 100, votes: who === 'tie' ? { '13': 50, [bol]: 50 } : { '13': who === 'PT' ? 60 : 40, [bol]: who === 'BOL' ? 60 : 40 } } }
  })
  return { city: { uf, slug: 'x', nome: 'X', regiao: 'sul', cdMunicipio: '1', cdIbge: '1', ciclos: [2018, 2022, 2026] }, cycles, candidates }
}

describe('arc of a city', () => {
  it.each([
    [['PT', 'PT', 'PT'], 'same'],
    [['BOL', 'BOL', 'BOL'], 'same'],
    [['PT', 'BOL', 'BOL'], 'switched2022'],
    [['BOL', 'PT', 'PT'], 'switched2022'],
    [['PT', 'PT', 'BOL'], 'switched2026'],
    [['PT', 'BOL', 'PT'], 'returned'],
    [['BOL', 'PT', 'BOL'], 'returned'],
  ] as [[Winner, Winner, Winner], string][])('%j is %s', (winners, kind) => {
    expect(cityArc(shard(winners))).toEqual({ kind })
  })
  it('the side is the camp, not the candidate number: Haddad (13) in 2018 and Lula (13) in 2022 are the same side', () => {
    const s = shard(['PT', 'PT', 'PT'])
    s.cycles['2018']!['2']!.votes = { '13': 70, '17': 30 }
    expect(s.candidates['2018']!['2']!['13']![0]).toBe('FERNANDO HADDAD')
    expect(cityArc(s).kind).toBe('same')
  })
  it('a tied 2nd round is a tie with its year, in any cycle', () => {
    expect(cityArc(shard(['tie', 'PT', 'PT']))).toEqual({ kind: 'tie', years: [2018] })
    expect(cityArc(shard(['PT', 'PT', 'tie']))).toEqual({ kind: 'tie', years: [2026] })
    expect(cityArc(shard(['tie', 'PT', 'tie']))).toEqual({ kind: 'tie', years: [2018, 2026] })
  })
  it('a missing cycle is a missing arc with its years, and wins over a tie in another cycle', () => {
    expect(cityArc(shard([undefined, 'PT', 'PT']))).toEqual({ kind: 'missing', years: [2018] })
    expect(cityArc(shard([undefined, undefined, 'PT']))).toEqual({ kind: 'missing', years: [2018, 2022] })
    expect(cityArc(shard(['tie', undefined, 'PT']))).toEqual({ kind: 'missing', years: [2022] })
  })
  it('three different sides is its own arc', () => {
    const s = shard(['PT', 'BOL', 'PT'])
    s.candidates['2026']!['2'] = { '13': ['X', 'AAA'], '99': ['Y', 'BBB'] }
    s.cycles['2026']!['2']!.votes = { '13': 40, '99': 60 }
    expect(cityArc(s)).toEqual({ kind: 'switchedTwice' })
  })
  it('an overseas post has an arc like any city, and is counted apart', () => {
    expect(cityArc(shard(['PT', 'PT', 'PT'], 'zz'))).toEqual({ kind: 'same' })
    const file = countArcs([shard(['PT', 'PT', 'PT']), shard(['PT', 'BOL', 'BOL']), shard(['PT', 'PT', 'PT'], 'zz')])
    expect(file.counts.same).toBe(1)
    expect(file.counts.switched2022).toBe(1)
    expect(file.overseas.same).toBe(1)
  })
})

describe('arc of every fixture city', () => {
  it('every city has exactly one arc from the closed list; the counts add up to the cities', async () => {
    const shards = await fixtureCityShards()
    const arcs = shards.map(cityArc)
    for (const arc of arcs) expect(ARC_KINDS).toContain(arc.kind)
    const file = countArcs(shards)
    const total = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0)
    expect(total(file.counts)).toBe(shards.filter((s) => s.city.uf !== 'zz').length)
    expect(total(file.overseas)).toBe(shards.filter((s) => s.city.uf === 'zz').length)
    expect(Object.keys(file.counts)).toEqual([...ARC_KINDS])
  })
  it('Cidade Exemplo is the frame: B (the side of 2018) wins 2022 and 2026, so it changed side in 2022; Boa Esperança do Norte has no earlier cycle', async () => {
    const shards = await fixtureCityShards()
    const arc = (slug: string) => cityArc(shards.find((s) => s.city.slug === slug)!)
    expect(arc('boa-esperanca-do-norte')).toEqual({ kind: 'missing', years: [2018, 2022] })
    expect(ARC_KINDS).toContain(arc('cidade-exemplo').kind)
  })
})
