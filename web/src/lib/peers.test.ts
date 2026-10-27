import { describe, expect, it } from 'vitest'
import type { City, Turnout, Vote } from '@/data'
import { computePeers, encodePeers, MIN_SHARED, peersOf, sizeBand, twinOf, type PeerInput } from './peers'

interface Spec {
  uf?: string
  slug: string
  /** Per cycle: [aptos, turnout share, first share of valid, second share of valid]; absent = no data that cycle. */
  c18?: [number, number, number, number]
  c22?: [number, number, number, number]
  c26?: [number, number, number, number]
}

/** A tiny dataset from specs: round 1 of each cycle with two candidates (numbers 1 and 2) and the given shares. */
function dataset(specs: Spec[]): PeerInput {
  const cities: City[] = []
  const turnout: Turnout[] = []
  const votes: Vote[] = []
  specs.forEach((s, i) => {
    const uf = s.uf ?? 'xx'
    const cd = String(1000 + i)
    cities.push({ uf, cdMunicipio: cd, cdIbge: uf === 'zz' ? '' : cd, nome: s.slug, slug: s.slug, regiao: uf === 'zz' ? 'exterior' : 'sul', ciclos: [] })
    for (const [ano, c] of [[2018, s.c18], [2022, s.c22], [2026, s.c26]] as const) {
      if (!c) continue
      const [aptos, turn, a, b] = c
      const comparecimento = Math.round(aptos * turn)
      const validos = comparecimento
      turnout.push({ ano, turno: 1, uf, cdMunicipio: cd, aptos, comparecimento, abstencoes: aptos - comparecimento, brancos: 0, nulos: 0, anuladosApuSep: 0, validos })
      votes.push({ ano, turno: 1, uf, cdMunicipio: cd, candidatoNumero: 1, votos: Math.round(validos * a) })
      votes.push({ ano, turno: 1, uf, cdMunicipio: cd, candidatoNumero: 2, votos: Math.round(validos * b) })
    }
  })
  return { cities, turnout, votes }
}

const cyc = (aptos: number, turn: number, a: number, b: number): [number, number, number, number] => [aptos, turn, a, b]
const peersBySlug = (input: PeerInput, slug: string, k?: number) => {
  const r = computePeers(input, k)
  const i = r.keys.indexOf(`xx/${slug}`)
  return r.peers[i]!.map((j) => r.keys[j]!.replace('xx/', ''))
}

describe('size band', () => {
  it('is the ordinal band of the electorate', () => {
    expect([100, 4_999, 5_000, 19_999, 999_999, 1_000_000, 9_000_000].map(sizeBand)).toEqual([0, 0, 1, 2, 7, 8, 8])
  })
})

describe('who is a peer', () => {
  const small = (slug: string, turn: number, a: number) => ({ slug, c18: cyc(4000, turn, a, a - 0.1), c22: cyc(4100, turn, a, a - 0.1), c26: cyc(4200, turn, a, a - 0.1) })
  const big = (slug: string, turn: number, a: number) => ({ slug, c18: cyc(3_000_000, turn, a, a - 0.1), c22: cyc(3_100_000, turn, a, a - 0.1), c26: cyc(3_200_000, turn, a, a - 0.1) })
  const world = dataset([small('tiny-a', 0.9, 0.6), small('tiny-b', 0.88, 0.6), small('tiny-c', 0.84, 0.55), big('capital-a', 0.8, 0.5), big('capital-b', 0.79, 0.5), big('capital-c', 0.62, 0.45)])

  it('a very small city is matched with small cities, a capital with capitals', () => {
    expect(peersBySlug(world, 'tiny-a', 2).sort()).toEqual(['tiny-b', 'tiny-c'])
    expect(peersBySlug(world, 'capital-a', 2).sort()).toEqual(['capital-b', 'capital-c'])
  })
  it('closest first: a city with the same turnout and margin comes before a different one', () => {
    expect(peersBySlug(world, 'tiny-a', 2)).toEqual(['tiny-b', 'tiny-c'])
    expect(peersBySlug(world, 'capital-a', 2)).toEqual(['capital-b', 'capital-c'])
  })
  it('never lists the city itself and never more than k, fewer when there are not enough cities', () => {
    const r = computePeers(world, 3)
    r.peers.forEach((p, i) => {
      expect(p).not.toContain(i)
      expect(p.length).toBeLessThanOrEqual(3)
    })
    expect(computePeers(dataset([small('only', 0.9, 0.6)])).peers).toEqual([[]])
  })
  it('the history of the three cycles matters: same size and 2026 result, different past, different peer', () => {
    const w = dataset([
      { slug: 'a', c18: cyc(8000, 0.9, 0.6, 0.3), c22: cyc(8000, 0.9, 0.6, 0.3), c26: cyc(8000, 0.8, 0.5, 0.4) },
      { slug: 'same-past', c18: cyc(8000, 0.9, 0.6, 0.3), c22: cyc(8000, 0.9, 0.6, 0.3), c26: cyc(8000, 0.8, 0.5, 0.4) },
      { slug: 'other-past', c18: cyc(8000, 0.6, 0.4, 0.35), c22: cyc(8000, 0.6, 0.4, 0.35), c26: cyc(8000, 0.8, 0.5, 0.4) },
    ])
    expect(peersBySlug(w, 'a', 1)).toEqual(['same-past'])
  })
})

describe('determinism and tie-breaking', () => {
  const same = (slug: string) => ({ slug, c18: cyc(8000, 0.8, 0.5, 0.4), c22: cyc(8000, 0.8, 0.5, 0.4), c26: cyc(8000, 0.8, 0.5, 0.4) })
  it('equal distances are ordered by "uf/slug" in code-point order', () => {
    const w = dataset([same('m'), same('c'), same('z'), same('a'), same('q')])
    expect(peersBySlug(w, 'm')).toEqual(['a', 'c', 'q', 'z'])
    expect(peersBySlug(w, 'a', 2)).toEqual(['c', 'm'])
  })
  it('does not depend on the order of the rows', () => {
    const w = dataset([same('m'), same('c'), { slug: 'x', c18: cyc(9000, 0.7, 0.5, 0.3), c26: cyc(9500, 0.75, 0.55, 0.3) }, same('a')])
    const reversed: PeerInput = { cities: [...w.cities].reverse(), turnout: [...w.turnout].reverse(), votes: [...w.votes].reverse() }
    expect(computePeers(reversed)).toEqual(computePeers(w))
    expect(JSON.stringify(encodePeers(computePeers(reversed)))).toBe(JSON.stringify(encodePeers(computePeers(w))))
  })
  it('uf breaks a tie before the slug', () => {
    const w = dataset([{ ...same('a'), uf: 'sp' }, { ...same('b'), uf: 'ba' }, { ...same('c'), uf: 'mg' }])
    const r = computePeers(w, 2)
    expect(r.keys).toEqual(['ba/b', 'mg/c', 'sp/a'])
    expect(r.peers[0]).toEqual([1, 2])
  })
})

describe('cities missing a cycle and overseas posts', () => {
  it('a city that exists from 2026 only is compared on the features it has and still gets peers', () => {
    const w = dataset([
      { slug: 'new', c26: cyc(6000, 0.8, 0.5, 0.4) },
      { slug: 'old-same', c18: cyc(6000, 0.7, 0.4, 0.3), c22: cyc(6000, 0.7, 0.4, 0.3), c26: cyc(6000, 0.8, 0.5, 0.4) },
      { slug: 'old-other', c18: cyc(6000, 0.7, 0.4, 0.3), c22: cyc(6000, 0.7, 0.4, 0.3), c26: cyc(600000, 0.9, 0.7, 0.2) },
    ])
    expect(peersBySlug(w, 'new', 2)).toEqual(['old-same', 'old-other'])
    expect(peersBySlug(w, 'old-same', 1)).toEqual(['new'])
  })
  it('two cities with fewer than MIN_SHARED features in common are not compared', () => {
    expect(MIN_SHARED).toBe(3)
    // a has only 2018 and b only 2026: they share the size band and nothing else.
    const apart = dataset([{ slug: 'a', c18: cyc(5000, 0.8, 0.5, 0.4) }, { slug: 'b', c26: cyc(5000, 0.8, 0.5, 0.4) }])
    expect(peersBySlug(apart, 'a')).toEqual([])
    // with one cycle in common (turnout and margin) they are comparable
    const meet = dataset([{ slug: 'a', c18: cyc(5000, 0.8, 0.5, 0.4), c26: cyc(5000, 0.8, 0.5, 0.4) }, { slug: 'b', c26: cyc(5000, 0.8, 0.5, 0.4) }])
    expect(peersBySlug(meet, 'a')).toEqual(['b'])
  })
  it('a city with no round-1 data in any cycle is left out, never listed as a peer', () => {
    const w = dataset([{ slug: 'a', c26: cyc(5000, 0.8, 0.5, 0.4) }, { slug: 'b', c26: cyc(5000, 0.8, 0.5, 0.4) }, { slug: 'ghost' }])
    expect(computePeers(w).keys).toEqual(['xx/a', 'xx/b'])
  })
  it('overseas posts are neither subjects nor peers, and do not change anyone else\'s peers', () => {
    const base = [{ slug: 'a', c26: cyc(5000, 0.8, 0.5, 0.4) }, { slug: 'b', c26: cyc(5200, 0.82, 0.5, 0.4) }, { slug: 'c', c26: cyc(80000, 0.7, 0.6, 0.3) }]
    const withPost = dataset([...base, { slug: 'post', uf: 'zz', c26: cyc(5000, 0.8, 0.5, 0.4) }, { slug: 'post2', uf: 'zz', c26: cyc(90000, 0.1, 0.9, 0.05) }])
    const r = computePeers(withPost)
    expect(r.keys.some((k) => k.startsWith('zz/'))).toBe(false)
    expect(r).toEqual(computePeers(dataset(base)))
  })
  it('turnout and margin read round 1 only', () => {
    const w = dataset([{ slug: 'a', c26: cyc(5000, 0.8, 0.5, 0.4) }, { slug: 'b', c26: cyc(5000, 0.8, 0.5, 0.4) }])
    const noisy: PeerInput = { ...w, turnout: [...w.turnout, ...w.turnout.map((t) => ({ ...t, turno: 2 as const, comparecimento: 1 }))] }
    expect(computePeers(noisy)).toEqual(computePeers(w))
  })
})

describe('the published file', () => {
  const w = dataset([
    { slug: 'a', c26: cyc(5000, 0.8, 0.5, 0.4) },
    { slug: 'b', c26: cyc(5200, 0.82, 0.5, 0.4) },
    { slug: 'c', c26: cyc(80000, 0.7, 0.6, 0.3) },
  ])
  const file = encodePeers(computePeers(w, 2), 2)
  it('is index-encoded and small: city keys once, peers as indices', () => {
    expect(file).toEqual({ k: 2, cities: ['xx/a', 'xx/b', 'xx/c'], peers: [[1, 2], [0, 2], [0, 1]], twins: [-1, -1, -1] })
  })
  it('peersOf reads it back by uf and slug; an unknown city has none', () => {
    expect(peersOf(file, 'xx', 'a')).toEqual(['xx/b', 'xx/c'])
    expect(peersOf(file, 'xx', 'nope')).toEqual([])
  })
})

describe('the twin: the closest comparable city of another state (#31)', () => {
  // the margin follows the turnout, so the cities differ in both features
  const s = (slug: string, uf: string, turn: number) => ({ slug, uf, c18: cyc(8000, turn, turn * 0.6, turn * 0.3), c22: cyc(8000, turn, turn * 0.6, turn * 0.3), c26: cyc(8000, turn, turn * 0.6, turn * 0.3) })
  const w = dataset([s('a', 'rj', 0.8), s('b', 'rj', 0.81), s('c', 'rj', 0.82), s('far', 'sp', 0.55), s('farther', 'mg', 0.2)])
  const r = computePeers(w, 2)
  const twin = (key: string) => twinOf(encodePeers(r, 2), key.split('/')[0]!, key.split('/')[1]!)

  it('always comes from a different state, even when all the nearest peers are of the same state', () => {
    expect(peersOf(encodePeers(r, 2), 'rj', 'a')).toEqual(['rj/b', 'rj/c'])
    expect(twin('rj/a')).toBe('sp/far')
    for (const [i, key] of r.keys.entries()) if (r.twins[i]! >= 0) expect(r.keys[r.twins[i]!]!.split('/')[0]).not.toBe(key.split('/')[0])
  })
  it('is the nearest of the other states, not the first listed', () => {
    expect(twin('sp/far')).toBe('rj/a')
    expect(twin('mg/farther')).toBe('sp/far')
  })
  it('a city whose state has every comparable city has no twin, and no error', () => {
    const lone = dataset([s('a', 'rj', 0.8), s('b', 'rj', 0.7)])
    expect(computePeers(lone).twins).toEqual([-1, -1])
    expect(twinOf(encodePeers(computePeers(lone)), 'rj', 'a')).toBeUndefined()
  })
  it('an overseas post and a city that is not in the file have no twin', () => {
    const withPost = dataset([s('a', 'rj', 0.8), s('b', 'sp', 0.8), s('post', 'zz', 0.8)])
    const file = encodePeers(computePeers(withPost))
    expect(twinOf(file, 'zz', 'post')).toBeUndefined()
    expect(twinOf(file, 'rj', 'a')).toBe('sp/b')
    expect(twinOf(file, 'rj', 'nope')).toBeUndefined()
  })
  it('does not depend on the order of the rows', () => {
    const reversed: PeerInput = { cities: [...w.cities].reverse(), turnout: [...w.turnout].reverse(), votes: [...w.votes].reverse() }
    expect(computePeers(reversed, 2).twins).toEqual(r.twins)
  })
})
