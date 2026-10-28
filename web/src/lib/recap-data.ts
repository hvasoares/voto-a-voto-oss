/**
 * Build-time loader of the state recap (#28): reads the per-state aggregates of the three-cycle screen (`compare-data.ts`, which
 * already excludes the overseas posts) and shapes them with `recap.ts`. Node only.
 */
import { cycleBlocksFor, stateStats } from './compare-data'
import { buildRecap, type Recap } from './recap'

/** Every state the dataset has, as the recap's pages. */
export async function recapUfs(): Promise<string[]> {
  return (await stateStats()).map((s) => s.uf)
}

export async function loadRecap(uf: string): Promise<Recap | undefined> {
  const state = (await stateStats()).find((s) => s.uf === uf)
  if (!state) return undefined
  return buildRecap(uf, cycleBlocksFor(state))
}
