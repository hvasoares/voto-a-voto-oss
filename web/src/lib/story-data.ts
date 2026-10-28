/**
 * Build-time loader of the state story (#47): the facts the cards are made of (the municipalities of the state, its city arcs from `arcs.json`, its recap) shaped by `story-content.ts`.
 * A state whose sequence would not have six to eight cards has no story page. Node only.
 */
import { loadRecap, recapUfs } from './recap-data'
import { loadArcsFile, loadStateShard, loadStateUfs } from './shard-files'
import { stateRows } from '@/slots/state/state-list'
import { storyContent, type StoryCardContent } from './story-content'
import { UF_NOME } from './uf-names'
import { siteOrigin } from './share-url'
import { currentEdition } from './editions-load'
import { datasetFixture } from './shard-files'

export interface StoryPage {
  uf: string
  stateName: string
  cards: StoryCardContent[]
}

export async function loadStory(uf: string, base: string): Promise<StoryPage | undefined> {
  const state = await loadStateShard(uf)
  if (!state) return undefined
  const recapData = (await recapUfs()).includes(uf) ? await loadRecap(uf) : undefined
  const stateName = UF_NOME[uf] ?? uf.toUpperCase()
  const cards = storyContent({
    uf,
    stateName,
    cities: stateRows(state.cities).length,
    arcs: (await loadArcsFile())?.byState[uf],
    recapData: recapData && recapData.rows.some((r) => r.status === 'data') ? recapData : undefined,
    origin: siteOrigin(),
    base,
    fixture: await datasetFixture(),
    edition: (await currentEdition()).id,
  })
  return cards && { uf, stateName, cards }
}

/** Whether a state has a story page: the one predicate behind both `getStaticPaths` of `/<uf>/historia/` and the link on `/<uf>/` (#100), so the link and the page cannot disagree. */
export async function hasStory(uf: string, base: string): Promise<boolean> {
  return (await loadStory(uf, base)) !== undefined
}

/** The states that have a story (a sequence of six to eight cards). */
export async function storyUfs(base: string): Promise<string[]> {
  const out: string[] = []
  for (const uf of await loadStateUfs()) if (await hasStory(uf, base)) out.push(uf)
  return out
}
