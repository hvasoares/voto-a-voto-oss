/**
 * Curiosities of a city (#33), PURE: up to three facts that compare the city with the cities of the same size band, each
 * by the RANK the city has in its group ("a 3ª maior queda de comparecimento entre cidades do mesmo porte"), and always
 * with the size of the group and the cycles compared. A comparison, never a finding: nothing here says anything is wrong.
 * The wording is in the catalog (`curio.*`); the method is written in web/docs/curiosities.md.
 *
 *  - Group: the cities (overseas posts out) of the same size band (`sizeBand` of `peers.ts`, latest round-1 electorate) that
 *    have the same measure over the same cycles. The city is in its own group, so a group of N has ranks 1..N.
 *  - Measures (round 1, the comparable round): the change of turnout between the two latest cycles of the city
 *    (`td` queda / `tu` alta; the sign of the city's own change picks the word), the margin
 *    between the two most voted candidates as a share of the valid votes in the latest cycle (`ml` menor / `mh` maior), and
 *    the share of blank and null votes in the turnout of the three cycles together (`bl` menor / `bh` maior; a city needs all three).
 *  - Rank: 1 + the cities strictly ahead of it on that side, so equal cities share a rank. A fact needs a group of at least
 *    `minGroup` cities, a measure that is not the same for the whole group, and a rank in the first quarter of the group and no
 *    lower than the 25th.
 *  - The three facts with the smallest rank / group size win (ties: turnout, margin, blank).
 * Deterministic: same shards, same facts.
 */
import type { CityShard } from './city-shard'
import { CYCLE_YEARS, sizeBand } from './peers'

/** Smallest group that gets a card: fewer cities are too few to rank against. The fixture dataset is tiny, so it uses its own. */
export const MIN_GROUP = 20
export const FIXTURE_MIN_GROUP = 2
/** A fact must be in the first quarter of its group and at most this far from its top: "251ª de 1.272" is not a curiosity (the frame's worst is the 12th of 48). */
export const TOP_SHARE = 0.25
export const MAX_RANK = 25
export const MAX_FACTS = 3

export const FACT_CODES = ['td', 'tu', 'ml', 'mh', 'bl', 'bh'] as const
export type FactCode = (typeof FACT_CODES)[number]

export interface Fact {
  code: FactCode
  /** 1 = the first of the group on that side. */
  rank: number
  /** Cities in the group, the city included. */
  n: number
  /** The cycles compared: `[from, to]` for a change, `[year]` for the latest cycle, all three for the blank and null share. */
  cycles: number[]
}

type Measure = 'turnout' | 'margin' | 'blank'
interface Reading {
  measure: Measure
  value: number
  cycles: number[]
}

const OVERSEAS_UF = 'zz'
const key = (s: CityShard) => `${s.city.uf}/${s.city.slug}`

type Block = { [field: string]: number | Record<string, number> }
const num = (b: Block, f: string) => (typeof b[f] === 'number' ? (b[f] as number) : 0)

/** The measures of one city (round 1) and its size band; undefined for an overseas post or a city with no round-1 data. */
export function readings(shard: CityShard): { band: number; readings: Reading[] } | undefined {
  if (shard.city.uf === OVERSEAS_UF) return undefined
  const rounds = CYCLE_YEARS.map((ano) => ({ ano, block: shard.cycles[String(ano)]?.['1'] as Block | undefined })).filter((r): r is { ano: 2018 | 2022 | 2026; block: Block } => !!r.block && num(r.block, 'aptos') > 0)
  if (!rounds.length) return undefined
  const last = rounds[rounds.length - 1]!
  const out: Reading[] = []
  const turnout = (b: Block) => num(b, 'comparecimento') / num(b, 'aptos')
  if (rounds.length >= 2) {
    const prev = rounds[rounds.length - 2]!
    out.push({ measure: 'turnout', value: turnout(last.block) - turnout(prev.block), cycles: [prev.ano, last.ano] })
  }
  const votes = typeof last.block.votes === 'object' ? Object.values(last.block.votes).sort((a, b) => b - a) : []
  if (votes.length >= 2 && num(last.block, 'validos') > 0) out.push({ measure: 'margin', value: (votes[0]! - votes[1]!) / num(last.block, 'validos'), cycles: [last.ano] })
  if (rounds.length === CYCLE_YEARS.length) {
    const blank = rounds.reduce((n, r) => n + num(r.block, 'brancos') + num(r.block, 'nulos') + num(r.block, 'anuladosApuSep'), 0)
    const attended = rounds.reduce((n, r) => n + num(r.block, 'comparecimento'), 0)
    if (attended > 0) out.push({ measure: 'blank', value: blank / attended, cycles: [...CYCLE_YEARS] })
  }
  return { band: sizeBand(num(last.block, 'aptos')), readings: out }
}

/** The facts of every city that has any, by "uf/slug". */
export function curiosities(shards: readonly CityShard[], minGroup = MIN_GROUP): Map<string, Fact[]> {
  // groups: measure + size band + cycles -> the readings of its cities
  const groups = new Map<string, { city: string; value: number }[]>()
  const of = new Map<string, { gid: string; reading: Reading }[]>()
  for (const s of shards) {
    const r = readings(s)
    if (!r) continue
    for (const reading of r.readings) {
      const gid = `${reading.measure}|${r.band}|${reading.cycles.join(',')}`
      const members = groups.get(gid) ?? []
      members.push({ city: key(s), value: reading.value })
      groups.set(gid, members)
      const mine = of.get(key(s)) ?? []
      mine.push({ gid, reading })
      of.set(key(s), mine)
    }
  }
  const result = new Map<string, Fact[]>()
  for (const [city, entries] of of) {
    const candidates: (Fact & { share: number; order: number })[] = []
    for (const { gid, reading } of entries) {
      const group = groups.get(gid)!
      const n = group.length
      if (n < minGroup) continue
      const values = group.map((g) => g.value)
      if (values.every((v) => v === values[0])) continue
      const ahead = values.filter((v) => v > reading.value).length + 1
      const behind = values.filter((v) => v < reading.value).length + 1
      const limit = Math.min(Math.ceil(n * TOP_SHARE), MAX_RANK)
      // which sides may be said: a change of turnout is a "queda" only when it fell and an "alta" only when it rose
      const sides: [FactCode, number][] =
        reading.measure === 'turnout'
          ? reading.value < 0 ? [['td', behind]] : reading.value > 0 ? [['tu', ahead]] : []
          : reading.measure === 'margin' ? [['mh', ahead], ['ml', behind]] : [['bh', ahead], ['bl', behind]]
      const [code, rank] = sides.reduce<[FactCode, number] | undefined>((best, s) => (!best || s[1] < best[1] ? s : best), undefined) ?? []
      if (!code || rank === undefined || rank > limit) continue
      candidates.push({ code, rank, n, cycles: reading.cycles, share: rank / n, order: FACT_CODES.indexOf(code) })
    }
    candidates.sort((a, b) => a.share - b.share || a.order - b.order)
    if (candidates.length) result.set(city, candidates.slice(0, MAX_FACTS).map(({ code, rank, n, cycles }) => ({ code, rank, n, cycles })))
  }
  return result
}

/** The published file: facts as tuples `[code, rank, n, ...cycles]` by "uf/slug"; only the cities that have any. */
export interface CuriositiesFile {
  minGroup: number
  facts: Record<string, (string | number)[][]>
}

export function encodeCuriosities(facts: Map<string, Fact[]>, minGroup: number): CuriositiesFile {
  const out: CuriositiesFile['facts'] = {}
  for (const city of [...facts.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) out[city] = facts.get(city)!.map((f) => [f.code, f.rank, f.n, ...f.cycles])
  return { minGroup, facts: out }
}

/** The facts of a city in a published file (empty when it has none). */
export function factsOf(file: CuriositiesFile, uf: string, slug: string): Fact[] {
  return (file.facts[`${uf}/${slug}`] ?? []).map(([code, rank, n, ...cycles]) => ({ code: code as FactCode, rank: rank as number, n: n as number, cycles: cycles as number[] }))
}
