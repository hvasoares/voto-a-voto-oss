import { createStore } from '@site/data/store'
import { diskSource } from '@site/data/node'
import { dataDir } from './data-dir'

/** Build time only (Node): the states the dataset has, to decide which UF tiles are links. */
export async function loadStateCodes(): Promise<string[]> {
  const store = createStore(diskSource(dataDir()))
  return (await store.states()).map((s) => s.uf)
}
