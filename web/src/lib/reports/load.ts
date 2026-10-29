import { createNodeStore } from '@/data/node'
import type { City, Vote, Turnout, Candidate } from '@/data/types'

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
  const store = createNodeStore()
  const [cities, votes, turnout, candidates] = await Promise.all([store.cities(), store.votes(), store.turnout(), store.candidates()])
  return { cities, votes, turnout, candidates }
}