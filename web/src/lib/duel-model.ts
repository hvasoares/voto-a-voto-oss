/**
 * Head-to-head ("Cara a cara", #30), PURE: two places of one level (two cities, two states or two regions) side by side, in the
 * measures that suit the level, with a mark on the higher value of each measure. No HTML, no fetch.
 *
 *   level     cidade | estado | regiao; the address carries it and the two places (`?nivel=estado&a=sp&b=mg`)
 *   measures  cidade:  comparecimento, margem (votes), virada desde 2022 (pp, signed), naoVotaram
 *             estado:  comparecimento, diferenca (pp, UNSIGNED, no side), viradaTurnos (1st -> 2nd round, pp, signed), naoVotaram
 *             regiao:  comparecimento, naoCompareceram, diferenca (pp, unsigned), peso (share of the national valid votes)
 *   mark      the higher DISPLAYED value of a measure ("higher number", never "better"); equal values or a missing value carry none
 *
 * The figures are the site's own: a city's are its card's (whole percents that add to 100, the votes between the two most voted
 * candidates), a state's come with the margins of the state map (#11: margin and swing from the unrounded shares), a region's with
 * /brasil/ (#10: share that turned out, share of the regions' valid votes). Everything is the 2nd round of the latest cycle; the
 * "virada" of a city compares it with the 2nd round of the cycle before, for the same two ballot numbers.
 */
import { formatInt } from '@/shared/city-model'
import { displayName, ufLabel } from '@/shared/city-search'
import { pctText, regionLabel } from './brasil'
import { cityShardResult, type CityShard } from './city-shard'
import { marginVotes } from './sentences/margin'
import { UF_NOME } from './uf-names'

export const LEVELS = ['cidade', 'estado', 'regiao'] as const
export type Level = (typeof LEVELS)[number]
export const REGIONS = ['norte', 'nordeste', 'centro-oeste', 'sudeste', 'sul'] as const
export const OVERSEAS_UF = 'zz'

export type MeasureKey = 'comparecimento' | 'naoVotaram' | 'margem' | 'virada' | 'diferenca' | 'viradaTurnos' | 'naoCompareceram' | 'peso'
export const MEASURES: Record<Level, readonly MeasureKey[]> = {
  cidade: ['comparecimento', 'margem', 'virada', 'naoVotaram'],
  estado: ['comparecimento', 'diferenca', 'viradaTurnos', 'naoVotaram'],
  regiao: ['comparecimento', 'naoCompareceram', 'diferenca', 'peso'],
}

/** The runoff pair of the cycle: A is the one with more votes nationally (the state map's "Lula side"), B the other. */
export interface DuelPair {
  a: { numero: number; nome: string }
  b: { numero: number; nome: string }
}
/** A state, from the margins of #11: the exact margin and swing, and the share that voted in whole tenths. */
export interface DuelStateRow {
  uf: string
  votedTenths: number
  margin2: number
  swing: number
}
/** A region, from /brasil/ (#10): the share that turned out in tenths, its share of the regions' valid votes, and the votes of the two candidates. */
export interface DuelRegionRow {
  regiao: string
  turnedOutTenths: number
  shareTenths: number
  votosA: number
  votosB: number
}
/** What the build hands the page: everything but the cities, which are read from their own shards. */
export interface DuelData {
  ano: number
  /** The cycle the "virada" of a city compares with. */
  prev: number
  pair: DuelPair
  states: DuelStateRow[]
  regions: DuelRegionRow[]
}

/** A displayed value: its text and, when there is a value, the number it is compared by (what the picture shows, in whole units or tenths). */
export interface Figure {
  text: string
  rank?: number
}
export const NO_VALUE: Figure = { text: '—' }

export interface DuelPlace {
  level: Level
  /** `rj/cidade-exemplo`, `rj`, `sudeste`: what the address carries. */
  code: string
  name: string
  /** "Cidade Exemplo · RJ", "São Paulo · SP", "Sudeste". */
  label: string
  figures: Partial<Record<MeasureKey, Figure>>
  /** The place has no 2nd round in the cycle: nothing to compare. */
  missingCycle?: boolean
  /** A city without the earlier 2nd round: its "virada" has no value. */
  missingPrev?: boolean
}

const whole = (n: number): Figure => ({ text: `${n}%`, rank: n })
const tenthsPct = (t: number): Figure => ({ text: `${pctText(t, 1)}%`, rank: t })
const count = (n: number): Figure => ({ text: formatInt(n), rank: n })
const tenthsOf = (x: number): number => Math.sign(x) * Math.round(Math.abs(x) * 10) || 0
/** Percentage points with one decimal; `signed` prints "+" or "−" (the true minus sign); the unsigned form is for the gap between the two candidates. */
function pp(x: number, signed: boolean): Figure {
  const t = tenthsOf(x)
  const abs = Math.abs(t)
  const sign = signed ? (t > 0 ? '+' : t < 0 ? '−' : '') : ''
  return { text: `${sign}${Math.floor(abs / 10)},${abs % 10} pp`, rank: signed ? t : abs }
}

/** (votes of A − votes of B) over the valid votes of the round, in pp of the block; undefined when a number or the valid votes are missing. */
function runoffMargin(shard: CityShard, ano: number, pair: DuelPair): number | undefined {
  const block = shard.cycles[String(ano)]?.['2']
  const votes = block?.votes
  const validos = block?.validos
  if (typeof votes !== 'object' || typeof validos !== 'number' || validos <= 0) return undefined
  const a = votes[String(pair.a.numero)]
  const b = votes[String(pair.b.numero)]
  return a === undefined || b === undefined ? undefined : ((a - b) / validos) * 100
}

export function cityPlace(shard: CityShard, data: Pick<DuelData, 'ano' | 'prev' | 'pair'>): DuelPlace {
  const { uf, slug } = shard.city
  const name = displayName(shard.city.nome)
  const base = { level: 'cidade' as const, code: `${uf}/${slug}`, name, label: `${name} · ${ufLabel(uf)}` }
  const r = cityShardResult(shard, data.ano, 2)
  if (!r || r.aptos <= 0) return { ...base, figures: {}, missingCycle: true }
  const now = runoffMargin(shard, data.ano, data.pair)
  const before = runoffMargin(shard, data.prev, data.pair)
  const margin = marginVotes(r)
  const swing = now !== undefined && before !== undefined ? pp(now - before, true) : NO_VALUE
  return {
    ...base,
    figures: { comparecimento: whole(r.votedPct), naoVotaram: whole(r.notVotedPct), margem: margin === undefined ? NO_VALUE : count(margin), virada: swing },
    missingPrev: swing === NO_VALUE,
  }
}

export function stateName(uf: string): string {
  return UF_NOME[uf] ?? uf.toUpperCase()
}
export function statePlace(row: DuelStateRow): DuelPlace {
  const name = stateName(row.uf)
  return {
    level: 'estado',
    code: row.uf,
    name,
    label: `${name} · ${row.uf.toUpperCase()}`,
    figures: { comparecimento: tenthsPct(row.votedTenths), naoVotaram: tenthsPct(1000 - row.votedTenths), diferenca: pp(row.margin2, false), viradaTurnos: pp(row.swing, true) },
  }
}

export function regionPlace(row: DuelRegionRow): DuelPlace {
  const name = regionLabel(row.regiao)
  const pair = row.votosA + row.votosB
  return {
    level: 'regiao',
    code: row.regiao,
    name,
    label: name,
    figures: {
      comparecimento: tenthsPct(row.turnedOutTenths),
      naoCompareceram: tenthsPct(1000 - row.turnedOutTenths),
      diferenca: pair > 0 ? pp((Math.abs(row.votosA - row.votosB) / pair) * 100, false) : NO_VALUE,
      peso: tenthsPct(row.shareTenths),
    },
  }
}

/** The side with the higher displayed value; none when the values are equal or one of them is missing. */
export function higherOf(a?: number, b?: number): 'a' | 'b' | undefined {
  return a === undefined || b === undefined || a === b ? undefined : a > b ? 'a' : 'b'
}

export interface Measure {
  key: MeasureKey
  a: Figure
  b: Figure
  higher?: 'a' | 'b'
}

/** The rows of the card for a level; a missing place or value reads "—". */
export function buildMeasures(level: Level, a?: DuelPlace, b?: DuelPlace): Measure[] {
  return MEASURES[level].map((key) => {
    const fa = a?.figures[key] ?? NO_VALUE
    const fb = b?.figures[key] ?? NO_VALUE
    return { key, a: fa, b: fb, higher: higherOf(fa.rank, fb.rank) }
  })
}

// --- the address ---------------------------------------------------------------------------------------------------------------------

export interface DuelAddress {
  level: Level
  a?: string
  b?: string
  /** Modo duelo: the chrome-free view of the same card. */
  mode?: 'duelo'
  /** The reply flow (#39): the first city is the sender's, the second is for the visitor. */
  reply?: boolean
}
export interface AddressProblem {
  side: 'a' | 'b'
  kind: 'overseas' | 'invalid'
}

const CITY = /^[a-z]{2}\/[a-z0-9]+(?:-[a-z0-9]+)*$/
const UF = /^[a-z]{2}$/

/** Why a place code is not acceptable at a level, or undefined when it is (the data decides later whether it exists). */
export function codeProblem(level: Level, code: string): AddressProblem['kind'] | undefined {
  if (level === 'cidade') return CITY.test(code) ? undefined : 'invalid'
  if (level === 'estado') return code === OVERSEAS_UF ? 'overseas' : UF.test(code) ? undefined : 'invalid'
  return code === 'exterior' ? 'overseas' : (REGIONS as readonly string[]).includes(code) ? undefined : 'invalid'
}

/** The card an address asks for. A malformed or unacceptable place is dropped and reported; never throws. */
export function parseDuelAddress(search: string): { address: DuelAddress; problems: AddressProblem[] } {
  const q = new URLSearchParams(search)
  const level = (LEVELS as readonly string[]).includes(q.get('nivel') ?? '') ? (q.get('nivel') as Level) : 'cidade'
  const problems: AddressProblem[] = []
  const side = (key: 'a' | 'b'): string | undefined => {
    const v = q.get(key)
    if (!v) return undefined
    const kind = codeProblem(level, v)
    if (kind) problems.push({ side: key, kind })
    return kind ? undefined : v
  }
  const a = side('a')
  const b = side('b')
  const address: DuelAddress = { level, ...(a ? { a } : {}), ...(b ? { b } : {}) }
  if (q.get('modo') === 'duelo') address.mode = 'duelo'
  if (q.get('resposta') === '1' && level === 'cidade' && a && !b) address.reply = true
  return { address, problems }
}

/** `?nivel=estado&a=sp&b=mg`, then `&modo=duelo` or `&resposta=1` when they apply; always carries the level. */
export function duelQuery(address: DuelAddress): string {
  const parts = [`nivel=${address.level}`]
  if (address.a) parts.push(`a=${address.a}`)
  if (address.b) parts.push(`b=${address.b}`)
  if (address.mode) parts.push(`modo=${address.mode}`)
  if (address.reply && address.a && !address.b) parts.push('resposta=1')
  return `?${parts.join('&')}`
}

/** Switching level empties the pair (a city code means nothing as a state): the new address has the level only. */
export const switchLevel = (level: Level): DuelAddress => ({ level })
