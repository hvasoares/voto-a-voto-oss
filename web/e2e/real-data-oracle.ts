/**
 * The oracle of the real-data specs (#127): expected figures counted from the build's own data directory, and
 * expected wording taken from the sentence catalog. Every real-data spec imports this file; none parses a CSV itself.
 *
 * Which data: the directory the build under test used, `process.env.DATA_DIR` (default `../data`, relative to web/;
 * the #109 sample project sets `.sample-data`), so a sampled build is never compared with full-data numbers.
 *
 * Row contract (the dataset files, UTF-8, header row first, comma-separated, no quoted commas):
 *   cities.csv     uf,cd_municipio,cd_ibge,nome,slug,regiao,ciclos      `ciclos` split on `;`, `uf` lower case
 *   votes.csv      ano,turno,uf,cd_municipio,candidato_numero,votos
 *   turnout.csv    ano,turno,uf,cd_municipio,aptos,comparecimento,abstencoes,brancos,nulos,anulados_apu_sep,validos
 *   candidates.csv ano,turno,candidato_numero,nome_urna,partido
 *   manifest.json  the pinned TSE national totals (`national_reference`)
 *
 * The derivation is plain counting and summing over those raw rows. It does NOT import `src/lib` code (loader,
 * facts, brasil.ts) and does not repeat a production formula, so a bug in the production calculation cannot cancel
 * out. Display goes through the few format functions below, covered by real-data-oracle.test.ts with fixed inputs
 * and outputs; the spec compares the page with `format(derived)`.
 *
 * Wording: `catalogText(key, params)` is the sentence of the catalog (default voice), so a copy change changes the
 * expectation with it.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DEFAULT_VOICE, message, type MessageKey } from '../src/lib/sentences/catalog'
import '../src/lib/sentences/catalog-brasil'
import '../src/lib/sentences/catalog-facts'
import '../src/lib/sentences/catalog-outliers'
import '../src/lib/sentences/catalog-preview'
import '../src/lib/sentences/catalog-stayhome'

// ---------------------------------------------------------------- the data

export interface CityRow { uf: string; cd: string; ibge: string; nome: string; slug: string; regiao: string; ciclos: string[] }
export interface VoteRow { ano: number; turno: number; uf: string; cd: string; numero: string; votos: number }
export interface TurnoutRow { ano: number; turno: number; uf: string; cd: string; aptos: number; comparecimento: number; brancos: number; nulos: number; validos: number }
export interface CandidateRow { ano: number; turno: number; numero: string; nome: string }
export interface Dataset { cities: CityRow[]; votes: VoteRow[]; turnout: TurnoutRow[]; candidates: CandidateRow[] }
/** One election round: the year and the round (1 or 2). */
export interface Round { ano: number; turno: number }
/** Where a count looks: all rows, one state, one municipality (`cd` is the TSE code), or the states of one region. */
export interface Where { uf?: string; cd?: string; regiao?: string }

const rowsOf = (text: string): string[][] => text.split('\n').filter(Boolean).slice(1).map((line) => line.split(','))

/** Parses the four tables from their CSV text (the unit test feeds small strings; the specs feed the files). */
export function parseDataset(files: { cities: string; votes: string; turnout: string; candidates: string }): Dataset {
  return {
    cities: rowsOf(files.cities).map(([uf, cd, ibge, nome, slug, regiao, ciclos]) => ({ uf: uf!, cd: cd!, ibge: ibge!, nome: nome!, slug: slug!, regiao: regiao!, ciclos: (ciclos ?? '').split(';').filter(Boolean) })),
    votes: rowsOf(files.votes).map(([ano, turno, uf, cd, numero, votos]) => ({ ano: Number(ano), turno: Number(turno), uf: uf!, cd: cd!, numero: numero!, votos: Number(votos) })),
    turnout: rowsOf(files.turnout).map(([ano, turno, uf, cd, aptos, comparecimento, , brancos, nulos, , validos]) => ({ ano: Number(ano), turno: Number(turno), uf: uf!, cd: cd!, aptos: Number(aptos), comparecimento: Number(comparecimento), brancos: Number(brancos), nulos: Number(nulos), validos: Number(validos) })),
    candidates: rowsOf(files.candidates).map(([ano, turno, numero, nome]) => ({ ano: Number(ano), turno: Number(turno), numero: numero!, nome: nome! })),
  }
}

/** Where the data directory is, as the build under test saw it. */
export const dataDir = (): string => resolve(process.env.DATA_DIR ?? '../data')

let loaded: { dir: string; data: Dataset } | undefined
/**
 * The dataset of the current data directory (read once per worker). A directory without cities.csv gives an empty dataset:
 * the specs skip themselves with `dataGuard()`, but Playwright still loads their files, and a describe title may count rows.
 */
export function dataset(): Dataset {
  const dir = dataDir()
  if (!existsSync(resolve(dir, 'cities.csv'))) return { cities: [], votes: [], turnout: [], candidates: [] }
  if (loaded?.dir !== dir) {
    const read = (file: string) => readFileSync(resolve(dir, file), 'utf8')
    loaded = { dir, data: parseDataset({ cities: read('cities.csv'), votes: read('votes.csv'), turnout: read('turnout.csv'), candidates: read('candidates.csv') }) }
  }
  return loaded.data
}

/** The pinned TSE national totals of the data directory (`manifest.json`, `national_reference`, key `<ano>-<turno>`). */
export function nationalReference(round: Round): { aptos: number; comparecimento: number; validos: number; brancos: number; nulos: number; candidates: Record<string, number> } {
  const manifest = JSON.parse(readFileSync(resolve(dataDir(), 'manifest.json'), 'utf8')) as { national_reference: Record<string, never> }
  return manifest.national_reference[`${round.ano}-${round.turno}`]!
}

// ---------------------------------------------------------------- counting

const inRound = (r: Round) => (row: { ano: number; turno: number }) => row.ano === r.ano && row.turno === r.turno
const regionOf = (ds: Dataset) => new Map(ds.cities.map((c) => [c.uf, c.regiao]))
const inWhere = (ds: Dataset, where: Where) => {
  const region = where.regiao === undefined ? undefined : regionOf(ds)
  return (row: { uf: string; cd: string }) => (where.uf === undefined || row.uf === where.uf) && (where.cd === undefined || row.cd === where.cd) && (region === undefined || region.get(row.uf) === where.regiao)
}

/** The states (overseas left out) by valid votes in a round, the most first. */
export function statesByValidVotes(round: Round, ds = dataset()): string[] {
  const byUf = new Map<string, number>()
  for (const t of ds.turnout) if (inRound(round)(t) && t.uf !== 'zz') byUf.set(t.uf, (byUf.get(t.uf) ?? 0) + t.validos)
  return [...byUf].sort((x, y) => y[1] - x[1]).map(([uf]) => uf)
}

/** The newest round in turnout.csv (greatest year, then greatest round). */
export function latestRound(ds = dataset()): Round {
  return ds.turnout.reduce<Round>((best, t) => (t.ano > best.ano || (t.ano === best.ano && t.turno > best.turno) ? { ano: t.ano, turno: t.turno } : best), { ano: 0, turno: 0 })
}

/** Every round in turnout.csv, newest first (greatest year, then greatest round). */
export function rounds(ds = dataset()): Round[] {
  const seen = new Map(ds.turnout.map((t) => [`${t.ano}-${t.turno}`, { ano: t.ano, turno: t.turno }]))
  return [...seen.values()].sort((x, y) => y.ano - x.ano || y.turno - x.turno)
}

/** The municipalities of a state (all rows of cities.csv with that uf), or of the whole data when `uf` is unset. */
export const cityCount = (uf?: string, ds = dataset()): number => ds.cities.filter((c) => uf === undefined || c.uf === uf).length

/** The row of a city by its path parts. */
export function cityBySlug(uf: string, slug: string, ds = dataset()): CityRow {
  const found = ds.cities.find((c) => c.uf === uf && c.slug === slug)
  if (!found) throw new Error(`no city ${uf}/${slug} in ${dataDir()}`)
  return found
}

/** The distinct regions of the five-region split (the overseas posts have the region `exterior`), in file order. */
export const regions = (ds = dataset()): string[] => [...new Set(ds.cities.map((c) => c.regiao))].filter((r) => r !== 'exterior')

/** The votes of a candidate number in one municipality, named by its path (`uf`, `slug`). */
export function cityVotes(round: Round, numero: string, uf: string, slug: string, ds = dataset()): number {
  return candidateVotes(round, numero, { uf, cd: cityBySlug(uf, slug, ds).cd }, ds)
}

/** The votes of one candidate number in a round, summed over the rows of `where`. */
export const candidateVotes = (round: Round, numero: string, where: Where = {}, ds = dataset()): number =>
  ds.votes.filter((v) => inRound(round)(v) && v.numero === numero && inWhere(ds, where)(v)).reduce((a, v) => a + v.votos, 0)

export interface TurnoutSum { aptos: number; comparecimento: number; brancos: number; nulos: number; validos: number }
/** The turnout columns of a round, summed over the rows of `where`. */
export function turnoutSum(round: Round, where: Where = {}, ds = dataset()): TurnoutSum {
  const sum: TurnoutSum = { aptos: 0, comparecimento: 0, brancos: 0, nulos: 0, validos: 0 }
  for (const t of ds.turnout) {
    if (!inRound(round)(t) || !inWhere(ds, where)(t)) continue
    sum.aptos += t.aptos
    sum.comparecimento += t.comparecimento
    sum.brancos += t.brancos
    sum.nulos += t.nulos
    sum.validos += t.validos
  }
  return sum
}

/** `a` minus `b` as a share of ALL valid votes of the round, in points (the "margem" of the maps, the city rows and the reports). */
export function marginPp(round: Round, a: string, b: string, where: Where = {}, ds = dataset()): number {
  return ((candidateVotes(round, a, where, ds) - candidateVotes(round, b, where, ds)) / turnoutSum(round, where, ds).validos) * 100
}

/** The "virada" of a year: the round-2 margin minus the round-1 margin of the same place, both unrounded. */
export const swingPp = (ano: number, a: string, b: string, where: Where = {}, ds = dataset()): number =>
  marginPp({ ano, turno: 2 }, a, b, where, ds) - marginPp({ ano, turno: 1 }, a, b, where, ds)

/** The people who voted for nobody (abstention, brancos and nulos: eligible minus valid votes) as a share of the eligible, in percent. */
export function nonVoterPct(round: Round, where: Where = {}, ds = dataset()): number {
  const t = turnoutSum(round, where, ds)
  return ((t.aptos - t.validos) / t.aptos) * 100
}

/** The share of municipalities (overseas posts left out) where the non-voters outnumber the votes between the two first candidates, in percent. */
export function nonVotersBeyondMarginPct(round: Round, ds = dataset()): number {
  const overseas = new Set(ds.cities.filter((c) => c.regiao === 'exterior').map((c) => `${c.uf}/${c.cd}`))
  const byCity = new Map<string, number[]>()
  for (const v of ds.votes) if (inRound(round)(v) && !overseas.has(`${v.uf}/${v.cd}`)) byCity.set(`${v.uf}/${v.cd}`, [...(byCity.get(`${v.uf}/${v.cd}`) ?? []), v.votos])
  const nonVoters = new Map(ds.turnout.filter(inRound(round)).map((t) => [`${t.uf}/${t.cd}`, t.aptos - t.validos]))
  let beyond = 0
  for (const [key, votes] of byCity) {
    const [first = 0, second = 0] = votes.sort((x, y) => y - x)
    if ((nonVoters.get(key) ?? 0) > first - second) beyond++
  }
  return (beyond / byCity.size) * 100
}

/** Share of `a` among the votes of `a` and `b`, in percent. */
export function twoWayShare(round: Round, a: string, b: string, where: Where = {}, ds = dataset()): number {
  const va = candidateVotes(round, a, where, ds)
  return (va / (va + candidateVotes(round, b, where, ds))) * 100
}

/** The state's municipality with the most valid votes in a round (how the state pages list their first row). */
export function largestCity(uf: string, round: Round, ds = dataset()): CityRow {
  const rows = ds.turnout.filter((t) => inRound(round)(t) && t.uf === uf).sort((x, y) => y.validos - x.validos || x.cd.localeCompare(y.cd))
  const top = rows[0]
  const found = top && ds.cities.find((c) => c.uf === uf && c.cd === top.cd)
  if (!found) throw new Error(`no turnout rows for ${uf} ${round.ano}-${round.turno}`)
  return found
}

/** Per municipality (key `uf/cd`) the votes of the candidate numbers `a` and `b` in a round. */
function pairByCity(round: Round, a: string, b: string, ds: Dataset): Map<string, { a: number; b: number }> {
  const out = new Map<string, { a: number; b: number }>()
  for (const v of ds.votes) {
    if (!inRound(round)(v) || (v.numero !== a && v.numero !== b)) continue
    const key = `${v.uf}/${v.cd}`
    const cell = out.get(key) ?? { a: 0, b: 0 }
    if (v.numero === a) cell.a += v.votos
    else cell.b += v.votos
    out.set(key, cell)
  }
  return out
}

/** The number of municipalities (overseas posts left out) won by `a` over `b` in `round`, tied, and won by `b`. */
export function wins(round: Round, a: string, b: string, ds = dataset()): { a: number; tie: number; b: number } {
  const overseas = new Set(ds.cities.filter((c) => c.regiao === 'exterior').map((c) => `${c.uf}/${c.cd}`))
  const out = { a: 0, tie: 0, b: 0 }
  for (const [key, cell] of pairByCity(round, a, b, ds)) {
    if (overseas.has(key)) continue
    if (cell.a > cell.b) out.a++
    else if (cell.a < cell.b) out.b++
    else out.tie++
  }
  return out
}

/** One municipality of a year with the pair's margins in both rounds (points of all valid votes) and the round-2 valid votes. */
export interface SwingRow { city: CityRow; margin1: number; margin2: number; swing: number; validos: number }

/** Every non-overseas municipality with votes of `a` and `b` in both rounds of `ano`, biggest swing first. */
export function swingRows(ano: number, a: string, b: string, ds = dataset()): SwingRow[] {
  const valid2 = new Map(ds.turnout.filter(inRound({ ano, turno: 2 })).map((t) => [`${t.uf}/${t.cd}`, t.validos]))
  const valid1 = new Map(ds.turnout.filter(inRound({ ano, turno: 1 })).map((t) => [`${t.uf}/${t.cd}`, t.validos]))
  const [v1, v2] = [pairByCity({ ano, turno: 1 }, a, b, ds), pairByCity({ ano, turno: 2 }, a, b, ds)]
  const rows: SwingRow[] = []
  for (const city of ds.cities) {
    const key = `${city.uf}/${city.cd}`
    const [x1, x2] = [v1.get(key), v2.get(key)]
    if (city.regiao === 'exterior' || !x1 || !x2 || !valid1.get(key) || !valid2.get(key)) continue
    const margin1 = ((x1.a - x1.b) / valid1.get(key)!) * 100
    const margin2 = ((x2.a - x2.b) / valid2.get(key)!) * 100
    rows.push({ city, margin1, margin2, swing: margin2 - margin1, validos: valid2.get(key)! })
  }
  return rows.sort((x, y) => y.swing - x.swing)
}

/** The "virada" cities: `a` trailed `b` in round 1 and led in round 2 (by margin sign), with at least `minValid` round-2 valid votes. */
export const flips = (ano: number, a: string, b: string, minValid = 0, ds = dataset()): SwingRow[] =>
  swingRows(ano, a, b, ds).filter((r) => r.margin1 < 0 && r.margin2 > 0 && r.validos >= minValid)

/** The display form of a municipality in lists: its name and state, "ITABIRITO/MG" (the pages print it in their own case). */
export const placeLabel = (c: CityRow): string => `${c.nome}/${c.uf.toUpperCase()}`

/** One municipality's round-2 votes for a candidate now and in an earlier round. */
export interface VotesChange { city: CityRow; now: number; before: number; diff: number; validos: number }

/** Per non-overseas municipality with votes of `numero` in both rounds: the change in votes, biggest gain first, and the totals. */
export function votesChange(numero: string, now: Round, before: Round, ds = dataset()): { total: number; gained: number; lost: number; unchanged: number; rows: VotesChange[] } {
  const tally = (round: Round) => new Map(ds.votes.filter((v) => inRound(round)(v) && v.numero === numero).map((v) => [`${v.uf}/${v.cd}`, v.votos]))
  const [n, b] = [tally(now), tally(before)]
  const valid = new Map(ds.turnout.filter(inRound(now)).map((t) => [`${t.uf}/${t.cd}`, t.validos]))
  const rows: VotesChange[] = []
  for (const city of ds.cities) {
    const key = `${city.uf}/${city.cd}`
    if (city.regiao !== 'exterior' && n.has(key) && b.has(key)) rows.push({ city, now: n.get(key)!, before: b.get(key)!, diff: n.get(key)! - b.get(key)!, validos: valid.get(key) ?? 0 })
  }
  rows.sort((x, y) => y.diff - x.diff)
  return { total: rows.reduce((t, r) => t + r.diff, 0), gained: rows.filter((r) => r.diff > 0).length, lost: rows.filter((r) => r.diff < 0).length, unchanged: rows.filter((r) => r.diff === 0).length, rows }
}

/** One municipality's race in a round: the votes of its two first candidates and the difference. */
export interface Race { city: CityRow; leader: string; first: number; second: number; diff: number }

/** Every non-overseas municipality's race (all candidates), smallest difference first (ties by file order). */
export function closestRaces(round: Round, ds = dataset()): Race[] {
  const byCity = new Map<string, { numero: string; votos: number }[]>()
  for (const v of ds.votes) if (inRound(round)(v)) byCity.set(`${v.uf}/${v.cd}`, [...(byCity.get(`${v.uf}/${v.cd}`) ?? []), { numero: v.numero, votos: v.votos }])
  const races: Race[] = []
  for (const city of ds.cities) {
    const ranked = (byCity.get(`${city.uf}/${city.cd}`) ?? []).sort((x, y) => y.votos - x.votos)
    if (city.regiao !== 'exterior' && ranked.length >= 2) races.push({ city, leader: ranked[0]!.numero, first: ranked[0]!.votos, second: ranked[1]!.votos, diff: ranked[0]!.votos - ranked[1]!.votos })
  }
  return races.sort((x, y) => x.diff - y.diff)
}

/** One municipality's turnout in a round. */
export interface TurnoutRank { city: CityRow; rate: number; comparecimento: number; aptos: number }

/** The non-overseas municipalities with at least `minAptos` eligible voters, highest turnout rate first. */
export function turnoutRanking(round: Round, minAptos: number, ds = dataset()): TurnoutRank[] {
  const cityOf = new Map(ds.cities.map((c) => [`${c.uf}/${c.cd}`, c]))
  const rows: TurnoutRank[] = []
  for (const t of ds.turnout) {
    const city = inRound(round)(t) && t.aptos >= minAptos ? cityOf.get(`${t.uf}/${t.cd}`) : undefined
    if (city && city.regiao !== 'exterior') rows.push({ city, rate: (t.comparecimento / t.aptos) * 100, comparecimento: t.comparecimento, aptos: t.aptos })
  }
  return rows.sort((x, y) => y.rate - x.rate)
}

/** Municipalities with at least `min` valid votes in a round (overseas posts left out). */
export function citiesWithValidVotes(round: Round, min: number, ds = dataset()): number {
  const overseas = new Set(ds.cities.filter((c) => c.regiao === 'exterior').map((c) => `${c.uf}/${c.cd}`))
  return ds.turnout.filter((t) => inRound(round)(t) && t.validos >= min && !overseas.has(`${t.uf}/${t.cd}`)).length
}

/** The camp of a runoff candidate number: 13 is the PT camp, the other finalist (17 in 2018, 22 since) the Bolsonaro camp. */
export const campOf = (numero: string): 'PT' | 'Bolsonaro' => (numero === '13' ? 'PT' : 'Bolsonaro')

/** The candidate with the most votes in each municipality of a round (`null` for a tie for the lead). */
function winners(round: Round, ds: Dataset): Map<string, string | null> {
  const byCity = new Map<string, { numero: string; votos: number }[]>()
  for (const v of ds.votes) if (inRound(round)(v)) byCity.set(`${v.uf}/${v.cd}`, [...(byCity.get(`${v.uf}/${v.cd}`) ?? []), { numero: v.numero, votos: v.votos }])
  return new Map([...byCity].map(([key, ranked]) => {
    ranked.sort((x, y) => y.votos - x.votos)
    return [key, ranked.length > 1 && ranked[0]!.votos === ranked[1]!.votos ? null : ranked[0]!.numero]
  }))
}

/** One cohort: the cities that the same camps won in the 2018 and 2022 runoffs, with their 2026 runoff. */
export interface Cohort { camp2018: string; camp2022: string; cities: number; validos: number; lula: number; flavio: number; ties2026: number }
/** A city outside the cohorts: tied in a runoff before 2026 (`tieIn`; `other` is the camp that won the other cycle) or without 2018 and 2022 data. */
export interface OutsideCity { city: CityRow; tieIn?: number; other?: { ano: number; camp: string }; winner2026: string | null }

/** The cohort report of the 2018 and 2022 runoff winners against the 2026 runoff (overseas posts left out), in the page's order. */
export function cohortReport(ds = dataset()): { cohorts: Cohort[]; outside: OutsideCity[]; cities2026: number } {
  const [w18, w22, w26] = [winners({ ano: 2018, turno: 2 }, ds), winners({ ano: 2022, turno: 2 }, ds), winners({ ano: 2026, turno: 2 }, ds)]
  const valid = new Map(ds.turnout.filter(inRound({ ano: 2026, turno: 2 })).map((t) => [`${t.uf}/${t.cd}`, t.validos]))
  const order = [['PT', 'PT'], ['Bolsonaro', 'Bolsonaro'], ['Bolsonaro', 'PT'], ['PT', 'Bolsonaro']]
  const cohorts: Cohort[] = order.map(([camp2018, camp2022]) => ({ camp2018: camp2018!, camp2022: camp2022!, cities: 0, validos: 0, lula: 0, flavio: 0, ties2026: 0 }))
  const ties: OutsideCity[] = []
  const noData: OutsideCity[] = []
  let cities2026 = 0
  for (const city of ds.cities) {
    const key = `${city.uf}/${city.cd}`
    if (city.regiao === 'exterior' || !w26.has(key)) continue
    cities2026++
    const [a, b, c] = [w18.get(key), w22.get(key), w26.get(key)!]
    if (a === undefined && b === undefined) noData.push({ city, winner2026: c })
    else if (a === null) ties.push({ city, tieIn: 2018, other: b ? { ano: 2022, camp: campOf(b) } : undefined, winner2026: c })
    else if (b === null) ties.push({ city, tieIn: 2022, other: a ? { ano: 2018, camp: campOf(a) } : undefined, winner2026: c })
    else if (a && b) {
      const cohort = cohorts.find((x) => x.camp2018 === campOf(a) && x.camp2022 === campOf(b))!
      cohort.cities++
      cohort.validos += valid.get(key) ?? 0
      if (c === null) cohort.ties2026++
      else if (c === '13') cohort.lula++
      else cohort.flavio++
    }
  }
  return { cohorts, outside: [...ties, ...noData], cities2026 }
}

/** The urna name of a candidate number in a round. */
export const candidateName = (round: Round, numero: string, ds = dataset()): string => ds.candidates.find((c) => inRound(round)(c) && c.numero === numero)?.nome ?? numero

// ---------------------------------------------------------------- display

const ptInt = new Intl.NumberFormat('pt-BR')
/** 26258452 -> "26.258.452". */
export const int = (n: number): string => ptInt.format(n)
/** 186433 -> "+186.433"; -2403 -> "-2.403" (ASCII hyphen, as the pages print it). */
export const signedInt = (n: number): string => (n > 0 ? '+' : '') + int(n)
/** 46.15 -> "46,2" (one decimal, comma). */
export const dec1 = (x: number): string => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',')
/** -7.69 -> "-7,7"; 0.94 -> "+0,9" (a point difference: sign always shown, a zero too). */
export const signedDec1 = (x: number): string => {
  const rounded = Math.round(x * 10) / 10
  return (rounded >= 0 ? '+' : '') + rounded.toFixed(1).replace('.', ',')
}

/** Largest-remainder split of 100 (unit 10^-decimals of a percent) among the parts' shares of their sum. */
function largestRemainder(parts: number[], decimals: number): number[] {
  const sum = parts.reduce((a, b) => a + b, 0)
  const total = 100 * 10 ** decimals
  const exact = parts.map((p) => (p / sum) * total)
  const out = exact.map((q) => Math.floor(q + 1e-9))
  let left = total - out.reduce((a, b) => a + b, 0)
  for (const o of exact.map((q, i) => ({ i, rem: q - out[i]! })).sort((x, y) => (Math.abs(y.rem - x.rem) > 1e-9 ? y.rem - x.rem : x.i - y.i))) {
    if (left <= 0) break
    out[o.i]!++
    left--
  }
  return out
}

/** The share text of part `index` among `parts`, rounded by the largest-remainder rule so the shown parts add to 100: "51,79" (decimals 2). */
export function shareText(parts: number[], index: number, decimals = 1): string {
  const scaled = largestRemainder(parts, decimals)[index]!
  const digits = String(scaled).padStart(decimals + 1, '0')
  const cut = digits.length - decimals
  return `${digits.slice(0, cut)}${decimals > 0 ? ',' + digits.slice(cut) : ''}`
}

// ---------------------------------------------------------------- wording

/** The sentence of a catalog key in the default voice, slots filled; a plural key takes `count`. */
export const catalogText = (key: MessageKey, params: Record<string, string | number> = {}, count?: number): string => message(DEFAULT_VOICE, key, params, count)
