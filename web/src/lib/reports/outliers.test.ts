import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStore } from '@/data'
import { diskSource } from '@/data/node'
import type { Candidate, City, Turnout, Vote } from '@/data'
import type { PeersResult } from '../peers'
import { computePeers } from '../peers'
import { computeOutliers, DEFAULT_MIN, MIN_OPTIONS, OUTLIERS_SHOWN, outlierPath, parseOutlierPath, pickOutliers, type OutlierRow } from './outliers'

/*
 * A world of eleven cities. Pair of 2026: 13 and 22 (candidates.csv); 2022: the same ballot numbers. "Alvo" is the city under test: its five peers
 * (a1..a5) vote alike, it does not. Numbers are chosen so the gaps are exact.
 */
const city = (uf: string, slug: string, cd: string): City => ({ uf, cdMunicipio: cd, cdIbge: cd, nome: slug.toUpperCase(), slug, regiao: 'x', ciclos: '2022,2026' }) as unknown as City
const t = (uf: string, cd: string, ano: number, aptos: number, comparecimento: number, validos: number): Turnout => ({ ano, turno: 2, uf, cdMunicipio: cd, aptos, comparecimento, abstencoes: aptos - comparecimento, brancos: 0, nulos: comparecimento - validos, anuladosApuSep: 0, validos })
const v = (uf: string, cd: string, ano: number, n: number, votos: number): Vote => ({ ano, turno: 2, uf, cdMunicipio: cd, candidatoNumero: n, votos })
const cand = (ano: number, n: number, nome: string): Candidate => ({ ano, turno: 2, candidatoNumero: n, nomeUrna: nome, partido: 'P' }) as Candidate

interface Spec { uf: string; slug: string; cd: string; aptos: number; comp26: number; valid26: number; a26: number; b26: number; valid22?: number; a22?: number; b22?: number }
function world(specs: Spec[]) {
  const cities = specs.map((s) => city(s.uf, s.slug, s.cd))
  const turnout: Turnout[] = []
  const votes: Vote[] = []
  for (const s of specs) {
    turnout.push(t(s.uf, s.cd, 2026, s.aptos, s.comp26, s.valid26))
    votes.push(v(s.uf, s.cd, 2026, 13, s.a26), v(s.uf, s.cd, 2026, 22, s.b26))
    if (s.valid22 !== undefined) {
      turnout.push(t(s.uf, s.cd, 2022, s.aptos, s.comp26, s.valid22))
      votes.push(v(s.uf, s.cd, 2022, 13, s.a22!), v(s.uf, s.cd, 2022, 22, s.b22!))
    }
  }
  return { cities, turnout, votes, candidates: [cand(2026, 13, 'LULA'), cand(2026, 22, 'FLAVIO BOLSONARO'), cand(2022, 13, 'LULA'), cand(2022, 22, 'JAIR BOLSONARO')] }
}
/** peers[i] are the indices of the peers of keys[i]. */
const peersOf = (keys: string[], map: Record<string, string[]>): PeersResult => ({ keys, peers: keys.map((k) => (map[k] ?? []).map((p) => keys.indexOf(p))), twins: keys.map(() => -1) })

// five peers: turnout 80% (aptos 10.000, comparecimento 8.000), margin 2022 0 pp, margin 2026 +10 pp -> swing +10 pp
const peer = (n: number, over: Partial<Spec> = {}): Spec => ({ uf: 'mg', slug: `par${n}`, cd: `${n}`, aptos: 10_000, comp26: 8_000, valid26: 8_000, a26: 4_400, b26: 3_600, valid22: 8_000, a22: 4_000, b22: 4_000, ...over })
// the city: turnout 60% (gap -20 pp), margin 2026 -20 pp, 2022 +20 pp -> swing -40 pp, typical swing +10 -> gap -50 pp
const alvo: Spec = { uf: 'rj', slug: 'alvo', cd: '90', aptos: 10_000, comp26: 6_000, valid26: 6_000, a26: 2_400, b26: 3_600, valid22: 6_000, a22: 3_600, b22: 2_400 }
const specs = [alvo, peer(1), peer(2), peer(3), peer(4), peer(5)]
const KEYS = specs.map((s) => `${s.uf}/${s.slug}`).sort()
const peersFor = (uf: string, slug: string, over: Record<string, string[]> = {}) => peersOf(KEYS, { [`${uf}/${slug}`]: ['mg/par1', 'mg/par2', 'mg/par3', 'mg/par4', 'mg/par5'], ...over })

describe('computeOutliers: the city against the typical of its peers', () => {
  const w = world(specs)
  const { rows } = computeOutliers({ ...w, peers: peersFor('rj', 'alvo') })
  const row = rows.find((r) => r.slug === 'alvo')!

  it('turnout is comparecimento over aptos of the 2nd round of 2026, the typical is the median of the peers, the gap is the difference in pp', () => {
    expect(row.turnout).toBeCloseTo(60, 9)
    expect(row.typicalTurnout).toBeCloseTo(80, 9)
    expect(row.turnoutGap).toBeCloseTo(-20, 9)
  })

  it('the swing since 2022 is the change of the margin between the same two ballot numbers, in pp of valid votes', () => {
    expect(row.swing).toBeCloseTo(-40, 9)
    expect(row.typicalSwing).toBeCloseTo(10, 9)
    expect(row.swingGap).toBeCloseTo(-50, 9)
  })

  it('carries the valid-vote count of the 2nd round of 2026 next to the rate', () => {
    expect(row.validos).toBe(6_000)
    expect(row.aptos).toBe(10_000)
    expect(row.comparecimento).toBe(6_000)
  })

  it('lists the five peers with their own figures, so the typical can be recomputed', () => {
    expect(row.peers.map((p) => [p.key, p.turnout, p.swing])).toEqual([1, 2, 3, 4, 5].map((n) => [`mg/par${n}`, 80, 10]))
  })

  it('only cities that have peers are rows: a city with no peers is not compared', () => {
    expect(rows.map((r) => r.slug)).toEqual(['alvo'])
  })

  it('the typical is the median: an odd peer far away does not move it', () => {
    const odd = world([alvo, peer(1), peer(2), peer(3), peer(4, { comp26: 1_000, valid26: 1_000, a26: 600, b26: 400 }), peer(5)])
    const r = computeOutliers({ ...odd, peers: peersFor('rj', 'alvo') }).rows.find((x) => x.slug === 'alvo')!
    expect(r.typicalTurnout).toBeCloseTo(80, 9)
  })

  it('with an even number of usable peers the median is the mean of the two middle ones', () => {
    const w2 = world([alvo, peer(1), peer(2, { comp26: 7_000, valid26: 7_000, a26: 3_500, b26: 3_500 }), peer(3), peer(4, { valid22: undefined })])
    const peers = peersOf(['mg/par1', 'mg/par2', 'mg/par3', 'mg/par4', 'rj/alvo'].sort(), { 'rj/alvo': ['mg/par1', 'mg/par2', 'mg/par3', 'mg/par4'] })
    const r = computeOutliers({ ...w2, peers }).rows.find((x) => x.slug === 'alvo')!
    expect(r.typicalTurnout).toBeCloseTo((80 + 80) / 2, 9) // 80, 80, 80, 70 -> middle two 80 and 80
    expect(r.peers.find((p) => p.key === 'mg/par4')!.swing).toBeUndefined() // no 2022: no swing for this peer, the typical swing uses the other three
    expect(r.typicalSwing).toBeCloseTo(10, 9) // 10, 0, 10: the median
  })

  it('a city is left out when fewer than three peers have the measure ("sem dados", never zero)', () => {
    const w3 = world([alvo, peer(1), peer(2), peer(3, { valid22: undefined }), peer(4, { valid22: undefined }), peer(5, { valid22: undefined })])
    expect(computeOutliers({ ...w3, peers: peersFor('rj', 'alvo') }).rows.map((r) => r.slug)).not.toContain('alvo')
  })

  it('a city without the 2nd round of 2022, or without valid votes in either, is left out', () => {
    const w4 = world([{ ...alvo, valid22: undefined }, peer(1), peer(2), peer(3), peer(4), peer(5)])
    expect(computeOutliers({ ...w4, peers: peersFor('rj', 'alvo') }).rows).toEqual([])
  })

  it('overseas posts are never rows', () => {
    const w5 = world([{ ...alvo, uf: 'zz', slug: 'exterior' }, peer(1), peer(2), peer(3), peer(4), peer(5)])
    const peers = peersOf(['mg/par1', 'mg/par2', 'mg/par3', 'mg/par4', 'mg/par5', 'zz/exterior'].sort(), { 'zz/exterior': ['mg/par1', 'mg/par2', 'mg/par3', 'mg/par4', 'mg/par5'] })
    expect(computeOutliers({ ...w5, peers }).rows).toEqual([])
  })
})

describe('the ranking: furthest from the peers first, on turnout and swing together', () => {
  // three cities with the same peers: only the gaps differ.
  const base = (slug: string, cd: string, uf: string, comp: number, a26: number, b26: number): Spec => ({ uf, slug, cd, aptos: 10_000, comp26: comp, valid26: comp, a26, b26, valid22: comp, a22: comp / 2, b22: comp / 2 })
  const subjects = [base('perto', '91', 'rj', 7_900, 4_300, 3_600), base('longe', '92', 'sp', 5_000, 1_000, 4_000), base('meio', '93', 'rj', 7_000, 3_000, 4_000)]
  const all = [...subjects, peer(1), peer(2), peer(3), peer(4), peer(5)]
  const keys = all.map((s) => `${s.uf}/${s.slug}`).sort()
  const five = ['mg/par1', 'mg/par2', 'mg/par3', 'mg/par4', 'mg/par5']
  const { rows } = computeOutliers({ ...world(all), peers: peersOf(keys, { 'rj/perto': five, 'sp/longe': five, 'rj/meio': five }) })

  it('orders by distance, the largest first, and the distance is the same scale for turnout and swing (gap in standard deviations of all rows)', () => {
    expect(rows.map((r) => r.slug)).toEqual(['longe', 'meio', 'perto'])
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.distance).toBeGreaterThanOrEqual(rows[i]!.distance)
  })

  it('equal distances are ordered by uf/slug in code-point order, whatever the input order', () => {
    const twin = [base('b', '94', 'rj', 7_000, 3_000, 4_000), base('a', '95', 'rj', 7_000, 3_000, 4_000), peer(1), peer(2), peer(3), peer(4), peer(5)]
    const k = twin.map((s) => `${s.uf}/${s.slug}`).sort()
    const out = computeOutliers({ ...world(twin), peers: peersOf(k, { 'rj/a': five, 'rj/b': five }) }).rows
    expect(out.map((r) => r.slug)).toEqual(['a', 'b'])
    const shuffled = computeOutliers({ ...world([...twin].reverse()), peers: peersOf(k, { 'rj/a': five, 'rj/b': five }) }).rows
    expect(shuffled.map((r) => r.slug)).toEqual(['a', 'b'])
  })

  describe('pickOutliers: the filters', () => {
    const picked = (o: Parameters<typeof pickOutliers>[1]) => pickOutliers(rows, o)
    it('shows only cities at or above the minimum of valid votes (the default hides the small ones)', () => {
      expect(picked({ uf: undefined, min: 5_000 }).shown.map((r) => r.slug)).toEqual(['longe', 'meio', 'perto'])
      expect(picked({ uf: undefined, min: 7_000 }).shown.map((r) => r.slug)).toEqual(['meio', 'perto'])
      expect(picked({ uf: undefined, min: 7_900 }).shown.map((r) => r.slug)).toEqual(['perto'])
      expect(picked({ uf: undefined, min: 8_000 }).shown).toEqual([])
    })
    it('the state filter keeps one state', () => {
      expect(picked({ uf: 'rj', min: 1_000 }).shown.map((r) => r.slug)).toEqual(['meio', 'perto'])
      expect(picked({ uf: 'sp', min: 1_000 }).shown.map((r) => r.slug)).toEqual(['longe'])
      expect(picked({ uf: 'am', min: 1_000 }).shown).toEqual([])
    })
    it('says how many cities the filter compared, and how many are listed', () => {
      expect(picked({ uf: undefined, min: 7_000 })).toMatchObject({ compared: 2, shown: expect.any(Array) })
      expect(picked({ uf: undefined, min: 1_000 }).compared).toBe(3)
    })
    it('lists at most OUTLIERS_SHOWN, still ranked from the start', () => {
      const many: OutlierRow[] = Array.from({ length: OUTLIERS_SHOWN + 7 }, (_, i) => ({ ...rows[0]!, slug: `c${String(i).padStart(3, '0')}`, distance: 100 - i }))
      const p = pickOutliers(many, { uf: undefined, min: 1_000 })
      expect(p.shown).toHaveLength(OUTLIERS_SHOWN)
      expect(p.compared).toBe(OUTLIERS_SHOWN + 7)
      expect(p.shown[0]!.slug).toBe('c000')
    })
  })
})

describe('the addresses of the filtered lists', () => {
  it('round trip, and the plain address is state "todos" with the default minimum', () => {
    expect(DEFAULT_MIN).toBe(5_000)
    expect(MIN_OPTIONS).toEqual([1_000, 5_000, 20_000, 50_000])
    expect(outlierPath(undefined, 20_000)).toBe('/relatorios/cidades-fora-da-curva/todos/20000/')
    expect(outlierPath('rj', 5_000)).toBe('/relatorios/cidades-fora-da-curva/rj/5000/')
    expect(parseOutlierPath('todos', '20000')).toEqual({ uf: undefined, min: 20_000 })
    expect(parseOutlierPath('rj', '5000')).toEqual({ uf: 'rj', min: 5_000 })
  })
  it('refuses a minimum that is not one of the options', () => {
    expect(parseOutlierPath('rj', '777')).toBeUndefined()
    expect(parseOutlierPath('rj', 'x')).toBeUndefined()
  })
})

const hasReal = existsSync(resolve('../data/votes.csv'))
describe.skipIf(!hasReal)('the real dataset', () => {
  it('ranks thousands of cities, in decreasing distance, with finite figures', async () => {
    const store = createStore(diskSource(resolve('../data')))
    const [cities, turnout, votes, candidates] = await Promise.all([store.cities(), store.turnout(), store.votes(), store.candidates()])
    const peers = computePeers({ cities, turnout, votes })
    const { rows } = computeOutliers({ cities, turnout, votes, candidates, peers })
    expect(rows.length).toBeGreaterThan(5_000)
    expect(rows.some((r) => r.uf === 'zz')).toBe(false)
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.distance).toBeGreaterThanOrEqual(rows[i]!.distance)
    for (const r of rows.slice(0, 200)) for (const x of [r.turnout, r.typicalTurnout, r.swing, r.typicalSwing, r.distance]) expect(Number.isFinite(x)).toBe(true)
  }, 120_000)
})
