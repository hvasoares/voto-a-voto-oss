import { describe, expect, it } from 'vitest'
import type { CityShard } from './city-shard'
import { curiosities, encodeCuriosities, factsOf, MAX_FACTS, MAX_RANK, readings } from './curiosities'
import { fixtureCityShards } from './shard-files'

interface Spec {
  slug: string
  uf?: string
  aptos?: number
  /** Per cycle: [turnout share, margin share of the valid votes, blank+null share of the turnout]; absent = no data. */
  c18?: [number, number, number]
  c22?: [number, number, number]
  c26?: [number, number, number]
}

/** A city shard with round-1 blocks built from shares (2.000 of 10.000 voters' precision is plenty for ranks). */
function shard(s: Spec): CityShard {
  const aptos = s.aptos ?? 10000
  const cycles: CityShard['cycles'] = {}
  for (const [ano, c] of [[2018, s.c18], [2022, s.c22], [2026, s.c26]] as const) {
    if (!c) continue
    const [turn, margin, blank] = c
    const comparecimento = Math.round(aptos * turn)
    const brancos = Math.round(comparecimento * blank)
    const validos = comparecimento - brancos
    const a = Math.round(validos * (0.5 + margin / 2))
    cycles[String(ano)] = { '1': { aptos, comparecimento, abstencoes: aptos - comparecimento, brancos, nulos: 0, anuladosApuSep: 0, validos, votes: { '1': a, '2': validos - a } } }
  }
  return { city: { uf: s.uf ?? 'rj', slug: s.slug, nome: s.slug, regiao: 'sul', cdMunicipio: s.slug, cdIbge: '', ciclos: [] }, cycles, candidates: {} }
}

const cyc = (turn: number, margin = 0.1, blank = 0.05): [number, number, number] => [turn, margin, blank]
/** n cities of one size band whose 2022 -> 2026 turnout fell by 0.01 * i, margin 0.01 * i and blank share 0.01 * i. */
const group = (n: number, extra: Partial<Spec> = {}) =>
  Array.from({ length: n }, (_, i) => shard({ slug: `c${String(i).padStart(2, '0')}`, c18: cyc(0.8, 0.1 + i / 100, 0.02 + i / 200), c22: cyc(0.8, 0.1, 0.03 + i / 200), c26: cyc(0.8 - i / 100, 0.1 + i / 100, 0.04 + i / 200), ...extra }))
const facts = (shards: CityShard[], city: string, min = 5) => curiosities(shards, min).get(`rj/${city}`) ?? []

describe('what is measured', () => {
  it('turnout change between the two latest cycles, the margin and the blank+null share of three cycles', () => {
    const r = readings(shard({ slug: 'a', c18: cyc(0.8, 0.2, 0.1), c22: cyc(0.8, 0.2, 0.1), c26: cyc(0.7, 0.3, 0.1) }))!
    expect(r.readings.map((x) => x.measure)).toEqual(['turnout', 'margin', 'blank'])
    expect(r.readings[0]!.cycles).toEqual([2022, 2026])
    expect(r.readings[0]!.value).toBeCloseTo(-0.1, 2)
    expect(r.readings[1]!.cycles).toEqual([2026])
    expect(r.readings[2]!.cycles).toEqual([2018, 2022, 2026])
  })
  it('a city that exists from 2026 only has a margin and nothing else; an overseas post and a city with no round 1 have nothing', () => {
    expect(readings(shard({ slug: 'new', c26: cyc(0.8) }))!.readings.map((x) => x.measure)).toEqual(['margin'])
    expect(readings(shard({ slug: 'post', uf: 'zz', c26: cyc(0.8) }))).toBeUndefined()
    expect(readings(shard({ slug: 'none' }))).toBeUndefined()
  })
})

describe('ranking inside the size band', () => {
  const shards = group(20)
  it('the city with the biggest fall is the 1st biggest fall of 20, with the group size and the two cycles', () => {
    expect(facts(shards, 'c19')[0]).toEqual({ code: 'td', rank: 1, n: 20, cycles: [2022, 2026] })
  })
  it('a city whose turnout fell by the third most is the 3rd', () => {
    expect(facts(shards, 'c17').find((f) => f.code === 'td')).toMatchObject({ rank: 3, n: 20 })
  })
  it('the word follows the city: a rise is an "alta", never a "queda", and a city whose turnout did not change has no turnout fact', () => {
    const rising = [...group(10).map((s, i) => shard({ slug: `r${i}`, c22: cyc(0.7), c26: cyc(0.7 + i / 100), c18: cyc(0.7) })), shard({ slug: 'flat', c18: cyc(0.7), c22: cyc(0.7), c26: cyc(0.7) })]
    const up = curiosities(rising, 5).get('rj/r9')!
    expect(up.find((f) => f.code === 'tu')).toMatchObject({ rank: 1 })
    expect(up.some((f) => f.code === 'td')).toBe(false)
    expect((curiosities(rising, 5).get('rj/flat') ?? []).some((f) => f.code === 'td' || f.code === 'tu')).toBe(false)
  })
  it('compares only inside the size band: a big city is not ranked against small ones', () => {
    const mixed = [...group(10), ...group(10).map((s) => ({ ...s, city: { ...s.city, slug: `big-${s.city.slug}` }, cycles: Object.fromEntries(Object.entries(s.cycles).map(([a, r]) => [a, { '1': { ...r['1']!, aptos: 600000 } }])) }))]
    const f = curiosities(mixed as CityShard[], 5).get('rj/c09')!
    expect(f.find((x) => x.code === 'td')).toMatchObject({ rank: 1, n: 10 })
  })
  it('uses the smaller side for margin and blank share: the 1st largest or the 1st smallest', () => {
    const f = facts(shards, 'c19')
    expect(f.find((x) => x.code === 'mh')).toMatchObject({ rank: 1, n: 20, cycles: [2026] })
    const low = facts(shards, 'c00')
    expect(low.find((x) => x.code === 'ml')).toMatchObject({ rank: 1 })
    expect(low.find((x) => x.code === 'bl')).toMatchObject({ rank: 1, cycles: [2018, 2022, 2026] })
  })
  it('ties share a rank', () => {
    const tied = [...group(8), shard({ slug: 'twin-of-c07', c18: cyc(0.8, 0.17, 0.02 + 7 / 200), c22: cyc(0.8, 0.1, 0.03 + 7 / 200), c26: cyc(0.73, 0.17, 0.04 + 7 / 200) })]
    const a = curiosities(tied, 5)
    expect(a.get('rj/c07')!.find((f) => f.code === 'td')!.rank).toBe(a.get('rj/twin-of-c07')!.find((f) => f.code === 'td')!.rank)
  })
})

describe('when there is no card', () => {
  it('a group smaller than the minimum shows nothing, with no error', () => {
    expect(curiosities(group(4), 5).size).toBe(0)
    expect(curiosities(group(5), 5).size).toBeGreaterThan(0)
  })
  it('a city in the middle of its group has no fact: only the first quarter counts', () => {
    expect(facts(group(20), 'c10').some((f) => f.code === 'td')).toBe(false)
  })
  it('a big group does not make every middle rank a curiosity: nothing below the 25th, however many cities', () => {
    const big = group(200)
    expect(MAX_RANK).toBe(25)
    expect(curiosities(big, 5).get('rj/c175')!.find((f) => f.code === 'td')).toMatchObject({ rank: 25, n: 200 })
    expect(curiosities(big, 5).get('rj/c174')?.some((f) => f.code === 'td') ?? false).toBe(false)
  })
  it('a measure that is the same for the whole group says nothing', () => {
    const same = Array.from({ length: 10 }, (_, i) => shard({ slug: `s${i}`, c18: cyc(0.8), c22: cyc(0.8), c26: cyc(0.8) }))
    expect(curiosities(same, 5).size).toBe(0)
  })
  it('at most three facts, the ones closest to the top of their group first', () => {
    const f = facts(group(40), 'c39', 5)
    expect(f.length).toBeLessThanOrEqual(MAX_FACTS)
    expect(f.map((x) => x.rank / x.n)).toEqual([...f.map((x) => x.rank / x.n)].sort((a, b) => a - b))
  })
})

describe('the published file', () => {
  const found = curiosities(group(20), 5)
  const file = encodeCuriosities(found, 5)
  it('has tuples [code, rank, n, ...cycles] by uf/slug, in code-point order, and reads back', () => {
    expect(Object.keys(file.facts)).toEqual([...Object.keys(file.facts)].sort())
    expect(factsOf(file, 'rj', 'c19')).toEqual(found.get('rj/c19'))
    expect(factsOf(file, 'rj', 'nope')).toEqual([])
  })
  it('regenerating gives the same bytes, whatever the order of the shards', () => {
    expect(JSON.stringify(encodeCuriosities(curiosities([...group(20)].reverse(), 5), 5))).toBe(JSON.stringify(file))
  })
})

describe('the fixture dataset', () => {
  it('has few cities, so its minimum is 2 and Cidade Exemplo is ranked against the other city of its band', async () => {
    const shards = await fixtureCityShards()
    const f = curiosities(shards, 2).get('rj/cidade-exemplo')
    expect(f?.length).toBeGreaterThan(0)
    for (const x of f!) expect(x.n).toBeGreaterThanOrEqual(2)
    expect(curiosities(shards, 20).size).toBe(0)
  })
})
