import { createStore } from '@site/data/store'
import { diskSource } from '@site/data/node'
import { dataDir } from '../data-dir'
import type { City, Vote, Turnout, Candidate } from '@site/data/types'

/**
 * Build-time loader of the report computations (web/src/lib/reports/compute.ts). Like src/lib/states.ts,
 * it reads DATA_DIR through the existing store: the pages stay pure markup and nothing is fetched in the browser.
 */
export interface ReportsData {
  cities: City[]
  votes: Vote[]
  turnout: Turnout[]
  candidates: Candidate[]
}

export async function loadReportsData(): Promise<ReportsData> {
  const store = createStore(diskSource(dataDir()))
  const [cities, votes, turnout, candidates] = await Promise.all([store.cities(), store.votes(), store.turnout(), store.candidates()])
  return { cities, votes, turnout, candidates }
}