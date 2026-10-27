/**
 * Build-time loader of the state recap (#28): reads the per-state aggregates of the three-cycle screen (`compare-data.ts`, which
 * already excludes the overseas posts) and shapes them with `recap.ts`. Node only.
 */
import { electPair, cycleBlocksFor, roundOf, stateStats } from './compare-data'
import { buildRecap, type Recap } from './recap'

/** Every state the dataset has, as the recap's pages. */
export async function recapUfs(): Promise<string[]> {
  return (await stateStats()).map((s) => s.uf)
}

export async function loadRecap(uf: string): Promise<Recap | undefined> {
  const state = (await stateStats()).find((s) => s.uf === uf)
  if (!state) return undefined
  const old = roundOf(state, 2018, 2)
  const pt2018 = !!old && electPair(old.votesByCandidate, 2018).rule === 'ticket'
  return buildRecap(uf, cycleBlocksFor(state), { pt2018 })
}
