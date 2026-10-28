/**
 * Build-time (Node) assembly for the two state-map pages: the dataset of `DATA_DIR` becomes the
 * island's props. Everything else is pure (`src/lib/margins.ts`, `src/lib/scale.ts`,
 * `src/lib/uf-polygons.ts`). The cycle is the newest one the dataset has; no election number is
 * hard-coded here.
 */
import { candidateName } from '@/shared/candidate-name'
import { createStore } from '@/data/store'
import { diskSource } from '@/data/node'
import type { Candidate, Turnout, Vote } from '@/data'
import { computeMargins, formatSwing, type NationalMargin, type PairMember, type StateMargin } from './margins'
import { dataDir } from './data-dir'

export interface StateMapRow {
  uf: string
  validos1: number
  validos2: number
  margin1: number
  margin2: number
  swing: number
}

export interface StateMapData {
  ano: number
  /** Short names as the pages write them ("Lula", "Flavio"; fixtures: "Candidato"). */
  ladoANome: string
  ladoBNome: string
  /** Full display names for the selected-state sentences and the tooltip. */
  ladoANomeCompleto: string
  ladoBNomeCompleto: string
  rows: StateMapRow[]
  national: NationalMargin
}

/** The short form of the table (#84): "Lula", "Flávio" (not the full urna name). */
export const shortName = (nomeUrna: string): string => candidateName(nomeUrna, 'short')

export async function loadStateMapData(): Promise<StateMapData> {
  const store = createStore(diskSource(dataDir()))
  const [turnout, votes, candidates] = await Promise.all([store.turnout(), store.votes(), store.candidates()])
  const ano = Math.max(...new Set(turnout.map((t: Turnout) => t.ano)))
  return stateMapData(turnout, votes, candidates, ano)
}

/** Same assembly, pure (unit-tested with fixtures; the loader above only reads the dataset). */
export function stateMapData(turnout: readonly Turnout[], votes: readonly Vote[], candidates: readonly Candidate[], ano: number): StateMapData {
  const m = computeMargins({ ano, turnout, votes, candidates })
  return {
    ano,
    ladoANome: shortName(m.ladoA.nome),
    ladoBNome: shortName(m.ladoB.nome),
    ladoANomeCompleto: candidateName(m.ladoA.nome),
    ladoBNomeCompleto: candidateName(m.ladoB.nome),
    rows: m.states.map((s: StateMargin) => ({ uf: s.uf, validos1: s.validos1, validos2: s.validos2, margin1: s.margin1, margin2: s.margin2, swing: s.swing })),
    national: m.national,
  }
}