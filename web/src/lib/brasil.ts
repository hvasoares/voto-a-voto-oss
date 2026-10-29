/**
 * Brasil and regions (screen 8, ticket #10): PURE, BUILD-TIME aggregation of the runoff data into
 * the numbers the static /brasil/ page shows. No HTML, no data access, no browser — the page and its
 * tests feed it rows from the data layer (site/src/data), so everything here is testable in vitest.
 *
 * Product decisions of ticket #10 (issue + corrections agreed with the owner):
 * - The NATIONAL totals INCLUDE the overseas posts (uf "zz"); they equal the full dataset sum, which is
 *   TSE's own national figure (cross-checked in the tests against data/manifest.json "national_reference").
 *   The REGIONS EXCLUDE the overseas posts and the page says so.
 * - Blank and null votes DO come from the turnout data; the old "O arquivo não separa brancos e nulos"
 *   claim was wrong. Each region shows them (as a share of its own comparecimento).
 * - Region shares ("% dos votos válidos do país") use the regions' own sum (national minus overseas)
 *   as denominator, so the five shares add up to 100. Candidate and turnout shares are shares of the
 *   region's own valid votes / electorate.
 * - Every shown percentage that belongs to a composition (candidate bar, turnout bar, the five region
 *   shares) comes from largest-remainder rounding, so the parts of one bar add up to exactly 100.
 */
import { candidateName } from '@/shared/candidate-name'
import { formatInt } from '@/shared/city-model'
import { isRegionKey, REGION_NOME } from './regions'
import type { Candidate, State, Turno, Turnout, Vote } from '@/data'

/** Largest-remainder split of 100 among the parts' shares of their sum, kept with `decimals` decimal
 * places: the unit is 10^-decimals of a percent (a scaled integer), so no float is ever formatted.
 * Ties in the remainder go to the earlier part. A zero (or negative) sum gives all zeros. */
export function splitShares(parts: readonly number[], decimals: number): number[] {
  const sum = parts.reduce((a, b) => a + b, 0)
  if (sum <= 0) return parts.map(() => 0)
  const total = 100 * 10 ** decimals
  const exact = parts.map((p) => (p / sum) * total)
  const out = exact.map((q) => Math.floor(q + 1e-9))
  let left = total - out.reduce((a, b) => a + b, 0)
  const order = exact
    .map((q, i) => ({ i, rem: q - out[i]! }))
    .sort((x, y) => (Math.abs(y.rem - x.rem) > 1e-9 ? y.rem - x.rem : x.i - y.i))
  for (const { i } of order) {
    if (left <= 0) break
    out[i]!++
    left--
  }
  return out
}

/** Scaled percent (unit = 10^-decimals of a percent) -> pt-BR text with fixed decimals, comma included:
 * 5179 with 2 -> "51,79"; 500 with 1 -> "50,0"; 0 with 1 -> "0,0". */
export function pctText(scaled: number, decimals: number): string {
  const digits = String(Math.abs(scaled)).padStart(decimals + 1, '0')
  const cut = digits.length - decimals
  return formatInt(Number(digits.slice(0, cut))) + (decimals > 0 ? ',' + digits.slice(cut) : '')
}

export interface BrasilCandidate {
  /** Urna name in title case ("Lula", "Flavio Bolsonaro", "Candidato A"). */
  labelFull: string
  /** Short form for bar labels (the identity table's: "Lula", "Flávio"; "A" for the example data). */
  label: string
  numero: number
  votos: number
  /** Percent of the caller's denominator (national: overseas-inclusive valid votes; a region: its own
   * valid votes), as a scaled integer with `decimals` decimal places. */
  pctScaled: number
  pctText: string
}

export interface BrasilRegion {
  regiao: string
  /** "Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul". */
  label: string
  aptos: number
  comparecimento: number
  validos: number
  brancos: number
  nulos: number
  /** Share of the regions' own total valid votes (not the overseas-inclusive national figure), in tenths of a percent. */
  shareScaled: number
  shareText: string
  /** The two most-voted candidates in ballot-number order; shares of this region's valid votes, in tenths. */
  candidates: BrasilCandidate[]
  /** Share of this region's electorate (aptos) that voted, in tenths; "Não" is exactly `1000 - compareceramScaled`. */
  compareceramScaled: number
  compareceramText: string
  naoText: string
  /** Blank and null votes as a share of THIS region's comparecimento, in tenths (they are part of it). */
  brancosText: string
  nulosText: string
}

export interface BrasilView {
  ano: number
  turno: Turno
  /** National valid votes, overseas posts INCLUDED (the dataset sum = TSE's national total). */
  validos: number
  /** The two most-voted national candidates in ballot-number order; percent with TWO decimals. */
  nationalCandidates: BrasilCandidate[]
  /** Overseas posts excluded, ordered by valid votes (descending), ties by region key. */
  regions: BrasilRegion[]
  /** The regions' own sum of valid votes (national minus overseas): the "% dos votos válidos do país" denominator. */
  regionalValidos: number
}

/** The region of the dataset's region keys ("Sudeste", ...). Fixed pt-BR geography, not election numbers. */
export function regionLabel(regiao: string): string {
  return regiao === 'exterior' ? 'Exterior' : isRegionKey(regiao) ? REGION_NOME[regiao] : regiao
}

/** An uf the dataset's state list does not carry (the overseas posts, uf "zz") belongs to no region:
 * it counts only for the national totals. */
export function regionOfUf(states: readonly State[], uf: string): string {
  return states.find((s) => s.uf === uf)?.regiao ?? 'exterior'
}

interface Agg {
  aptos: number
  comparecimento: number
  abstencoes: number
  brancos: number
  nulos: number
  validos: number
  /** votos per candidate number, as a string key (dataset ids are strings). */
  votes: Map<string, number>
}

const newAgg = (): Agg => ({ aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0, votes: new Map() })
const addTurnout = (a: Agg, t: Turnout) => {
  a.aptos += t.aptos
  a.comparecimento += t.comparecimento
  a.abstencoes += t.abstencoes
  a.brancos += t.brancos
  a.nulos += t.nulos
  a.validos += t.validos
}
const addVotes = (a: Agg, v: Vote) => a.votes.set(String(v.candidatoNumero), (a.votes.get(String(v.candidatoNumero)) ?? 0) + v.votos)

/** The two candidates with the most votes (ties by ballot number), most votes first. Their percentages
 * are the largest-remainder shares of their own two-vote sum — in a runoff that sum is exactly the
 * valid votes of the scope (checked against the dataset in the tests), so the bar adds to exactly 100.
 * Every frame draws the candidates in ballot-number order (13 before 22, Sudeste included, even where
 * Flavio Bolsonaro wins the region), so the returned list is re-sorted ascending by numero. */
function candidatesOf(votes: Map<string, number>, candidates: Candidate[], decimals: number): BrasilCandidate[] {
  const urnaName = new Map(candidates.map((c) => [String(c.candidatoNumero), c.nomeUrna]))
  const urna = (numero: number) => urnaName.get(String(numero)) ?? String(numero)
  const sorted = [...votes.entries()]
    .map(([numero, votos]) => ({ numero: Number(numero), votos }))
    .filter((c) => c.votos > 0)
    .sort((a, b) => (b.votos !== a.votos ? b.votos - a.votos : a.numero - b.numero))
    .slice(0, 2)
    .sort((a, b) => a.numero - b.numero)
  const pcts = splitShares(sorted.map((c) => c.votos), decimals)
  return sorted.map((c, i): BrasilCandidate => ({
    numero: c.numero,
    votos: c.votos,
    labelFull: candidateName(urna(c.numero)),
    label: candidateName(urna(c.numero), 'short'),
    pctScaled: pcts[i] ?? 0,
    pctText: pctText(pcts[i] ?? 0, decimals),
  }))
}

export interface BrasilInput {
  ano: number
  turno: Turno
  states: State[]
  turnout: Turnout[]
  votes: Vote[]
  candidates: Candidate[]
}

/** Builds the /brasil/ page numbers for one cycle (the ticket's frame is 2026, round 2). */
export function buildBrasil(input: BrasilInput): BrasilView {
  const { ano, turno, states } = input
  const regionalRegiaos = new Set(states.map((s) => s.regiao).filter((r) => r !== 'exterior'))

  const national = newAgg()
  const regions = new Map<string, Agg>()
  // One pass over the cycle's rows: turnout rows (they have abstencoes) feed the counts, vote rows the
  // candidate map. THE NATIONAL aggregates keep every row, including the overseas posts; a region only
  // takes rows of ufs its dataset carries (never the overseas posts).
  for (const row of [...input.turnout, ...input.votes].filter((r) => r.ano === ano && r.turno === turno)) {
    const regiao = regionOfUf(states, row.uf)
    if ('abstencoes' in row) addTurnout(national, row as Turnout)
    else addVotes(national, row)
    if (regionalRegiaos.has(regiao)) {
      const target = regions.get(regiao) ?? regions.set(regiao, newAgg()).get(regiao)!
      if ('abstencoes' in row) addTurnout(target, row as Turnout)
      else addVotes(target, row)
    }
  }

  const regionalValidos = [...regions.values()].reduce((a, r) => a + r.validos, 0)
  const shares = splitShares([...regions.values()].map((r) => r.validos), 1)

  const regionsView: BrasilRegion[] = [...regions.entries()].map(([regiao, r], i): BrasilRegion => {
    const pair = splitShares([r.comparecimento, r.abstencoes], 1)
    const compareceramScaled = pair[0] ?? 0
    // blank and null: shares of the region's own comparecimento (largest remainder against the rest of it)
    const brancosShare = splitShares([r.brancos, r.comparecimento - r.brancos], 1)[0] ?? 0
    const nulosShare = splitShares([r.nulos, r.comparecimento - r.nulos], 1)[0] ?? 0
    return {
      regiao,
      label: regionLabel(regiao),
      aptos: r.aptos,
      comparecimento: r.comparecimento,
      validos: r.validos,
      brancos: r.brancos,
      nulos: r.nulos,
      shareScaled: shares[i] ?? 0,
      shareText: pctText(shares[i] ?? 0, 1),
      candidates: candidatesOf(r.votes, input.candidates, 1),
      compareceramScaled,
      compareceramText: pctText(compareceramScaled, 1),
      naoText: pctText(1000 - compareceramScaled, 1),
      brancosText: pctText(brancosShare, 1),
      nulosText: pctText(nulosShare, 1),
    }
  })
  regionsView.sort((a, b) => (b.validos !== a.validos ? b.validos - a.validos : a.regiao.localeCompare(b.regiao)))

  return {
    ano,
    turno,
    validos: national.validos,
    nationalCandidates: candidatesOf(national.votes, input.candidates, 2),
    regions: regionsView,
    regionalValidos,
  }
}