import { createNodeStore } from '@/data/node'

/** Build time only (Node): the states the dataset has, to decide which UF tiles are links. */
export async function loadStateCodes(): Promise<string[]> {
  const store = createNodeStore()
  return (await store.states()).map((s) => s.uf)
}
