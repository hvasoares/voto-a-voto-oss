/**
 * Build-time assembly of what the head-to-head needs besides the cities (#30): the states and regions of the latest cycle, read from the
 * same functions as the pages whose figures they must equal (`computeMargins` for the state map of #11, `buildBrasil` for /brasil/ of #10).
 * The page hands the result to its island as props, so choosing two states or two regions fetches nothing. A few kB for 27 states and
 * 5 regions; the overseas posts are in neither list. The cycle is the newest one the dataset has: no election number is hard-coded.
 */
import { createStore } from '@/data/store'
import { diskSource } from '@/data/node'
import type { Candidate, State, Turnout, Vote } from '@/data'
import { buildBrasil, splitShares } from './brasil'
import { dataDir } from './data-dir'
import type { DuelData } from './duel-model'
import { computeMargins } from './margins'

export const PREVIOUS_CYCLE_OFFSET = 4

/** Pure: the data of the head-to-head from the rows of the dataset (unit-tested on the fixtures). */
export function duelData(input: { states: readonly State[]; turnout: readonly Turnout[]; votes: readonly Vote[]; candidates: readonly Candidate[]; ano: number }): DuelData {
  const { ano, turnout, votes, candidates } = input
  const margins = computeMargins({ ano, turnout, votes, candidates })
  const round2 = turnout.filter((t) => t.ano === ano && t.turno === 2)
  const sums = new Map<string, { aptos: number; validos: number }>()
  for (const t of round2) {
    const s = sums.get(t.uf) ?? { aptos: 0, validos: 0 }
    s.aptos += t.aptos
    s.validos += t.validos
    sums.set(t.uf, s)
  }
  const brasil = buildBrasil({ ano, turno: 2, states: [...input.states], turnout: [...turnout], votes: [...votes], candidates: [...candidates] })
  return {
    ano,
    prev: ano - PREVIOUS_CYCLE_OFFSET,
    pair: { a: { numero: margins.ladoA.numero, nome: margins.ladoA.nome }, b: { numero: margins.ladoB.numero, nome: margins.ladoB.nome } },
    states: margins.states.map((m) => {
      const s = sums.get(m.uf)!
      return { uf: m.uf, votedTenths: splitShares([s.validos, s.aptos - s.validos], 1)[0] ?? 0, margin2: m.margin2, swing: m.swing }
    }),
    regions: brasil.regions.map((r) => ({
      regiao: r.regiao,
      turnedOutTenths: r.compareceramScaled,
      shareTenths: r.shareScaled,
      votosA: r.candidates[0]?.votos ?? 0,
      votosB: r.candidates[1]?.votos ?? 0,
    })).sort((x, y) => (x.regiao < y.regiao ? -1 : 1)),
  }
}

/** The configured dataset's head-to-head data (build time only). */
export async function loadDuelData(): Promise<DuelData> {
  const store = createStore(diskSource(dataDir()))
  const [states, turnout, votes, candidates] = await Promise.all([store.states(), store.turnout(), store.votes(), store.candidates()])
  const ano = Math.max(...new Set(turnout.map((t) => t.ano)))
  return duelData({ states, turnout, votes, candidates, ano })
}
