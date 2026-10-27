/**
 * Build-time loader of the /brasil/ screen (ticket #10): the pure numbers of lib/brasil built over the
 * chosen dataset (DATA_DIR, the same store the other pages read). No browser involvement: the page
 * pre-renders everything, so this runs during `astro build` / dev only.
 */
import { createStore } from '@site/data/store'
import { diskSource } from '@site/data/node'
import { dataDir } from './data-dir'
import { buildBrasil, type BrasilView } from './brasil'

/** The ticket's screen is the national runoff: 2026, 2º turno. */
export async function loadBrasil(ano = 2026, turno: 1 | 2 = 2): Promise<BrasilView> {
  const store = createStore(diskSource(dataDir()))
  const [states, turnout, votes, candidates] = await Promise.all([store.states(), store.turnout({ ano, turno }), store.votes({ ano, turno }), store.candidates({ ano, turno })])
  return buildBrasil({ ano, turno, states, turnout, votes, candidates })
}

/** True when the chosen dataset is the small committed fixture set (the page shows its banner then). */
export async function isFixtureDataset(): Promise<boolean> {
  const store = createStore(diskSource(dataDir()))
  return Boolean((await store.manifest()).fixture)
}