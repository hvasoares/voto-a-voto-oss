/**
 * Build-time (Node) input for `buildCohorts` (ticket #15): the runoff-2 votes of every cycle keyed
 * by the integer TSE municipality code, the two runoff candidates per cycle and the city registry.
 * Reads the dataset of DATA_DIR through the shared store (default: the committed fixtures;
 * real data: DATA_DIR=../data), so development, tests and captures never need the network.
 */
import { createNodeStore } from '@/data/node'
import { buildCohorts, candidateLabels, RUNOFF_CYCLES, type CandidateRowLike, type CohortReport, type Cycle, type CityRef, type PersonLabel, type RunoffVotes } from './cohorts'

const runoffPerCity = (rows: { ano: number; cdMunicipio: string; candidatoNumero: number; votos: number }[]): RunoffVotes => {
  const out: RunoffVotes = new Map()
  for (const r of rows) {
    const code = Number(r.cdMunicipio)
    if (!Number.isInteger(code)) throw new Error(`cohorts-load: cd_municipio is not an integer: "${r.cdMunicipio}"`)
    const per = out.get(code) ?? new Map<number, number>()
    per.set(r.candidatoNumero, (per.get(r.candidatoNumero) ?? 0) + r.votos)
    out.set(code, per)
  }
  return out
}

const pairOf = (rows: CandidateRowLike[], ano: Cycle): [number, number] => {
  const numbers = rows.filter((c) => c.ano === ano && c.turno === 2).map((c) => c.candidatoNumero)
  if (numbers.length !== 2) throw new Error(`cohorts-load: ${ano} runoff does not have exactly 2 candidates (${numbers.length})`)
  return [numbers[0]!, numbers[1]!]
}

export async function loadCohortData(dirOverride?: string): Promise<{ report: CohortReport; labels: Record<string, PersonLabel> }> {
  const store = createNodeStore(dirOverride)
  const [votesByCycle, candidates, cities] = await Promise.all([
    Promise.all(RUNOFF_CYCLES.map((ano) => store.votes({ ano, turno: 2 }))),
    store.candidates(),
    store.cities(),
  ])
  const votes = Object.fromEntries(RUNOFF_CYCLES.map((ano, i) => [ano, runoffPerCity(votesByCycle[i]!)])) as Record<Cycle, RunoffVotes>
  const registry = new Map<number, CityRef & { overseas: boolean }>()
  for (const c of cities) {
    const code = Number(c.cdMunicipio)
    if (!Number.isInteger(code)) throw new Error(`cohorts-load: cd_municipio is not an integer: "${c.cdMunicipio}"`)
    registry.set(code, { nome: c.nome, uf: c.uf, overseas: c.uf === 'zz' })
  }
  const candidateRows: CandidateRowLike[] = candidates.map((c) => ({
    ano: c.ano, turno: c.turno, candidatoNumero: c.candidatoNumero, nomeUrna: c.nomeUrna, partido: c.partido,
  }))
  const runoffCandidates = {
    2018: pairOf(candidateRows, 2018),
    2022: pairOf(candidateRows, 2022),
    2026: pairOf(candidateRows, 2026),
  } as Record<Cycle, [number, number]>
  const labels = candidateLabels(candidateRows)
  return { report: buildCohorts({ votes, runoffCandidates, cities: registry }, labels), labels }
}

/** The report alone (what the tests and the default page path need). */
export async function loadCohortReport(dirOverride?: string): Promise<CohortReport> {
  return (await loadCohortData(dirOverride)).report
}