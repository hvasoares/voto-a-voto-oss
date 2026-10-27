/**
 * Every page of fact records of the site, at build time (#61, #62): the city card's, Brasil e regiões, Comparar com 2022 / 2018 and the
 * state three-cycles pages, each through the same gate. The seal of a page is made here from the build's own checks: a page whose facts name a
 * check that did not pass for its rounds does not build.
 */
import { buildCompareRows, cycleBlocksFor, stateOrder, stateStats } from '../compare-data'
import { COMPARE_CYCLES } from '../compare'
import { isFixtureDataset, loadBrasil } from '../brasil-load'
import { loadCityRoutes } from '../city-routes'
import { currentEdition } from '../editions-load'
import { datasetFixture } from '../shard-files'
import { CHECK_KINDS, sealLines, sealProblems, type CheckKind } from './checks'
import { loadChecks } from './checks-load'
import { assertPublishable } from './gate'
import { loadCityFacts } from './load'
import { CURIOSITIES_PAGE, LATEST_CYCLE } from './model'
import { brasilFacts, compareFacts, olderCyclesFacts, raceFacts, stateCyclesFacts, type FactPage } from './other'
import { closestRaces, computeReports } from '../reports/compute'
import { loadReportsData } from '../reports/load'
import { displayName } from '@/shared/city-search'
import { CYCLES } from '@/shared/city-model'
import { DEFAULT_LOCALE, message } from '../sentences/catalog'

const std = (key: Parameters<typeof message>[1], params?: Record<string, string | number>) => message({ locale: DEFAULT_LOCALE, register: 'standard' }, key, params)

/** Rows of the closest-races report the page shows (the page imports this, so the records and the rows cannot drift). */
export const RACES_SHOWN = 20

export type { FactPage }
/** A page of records with its seal written. */
export interface SealedPage extends FactPage {
  seal: string[]
}

export const kindsOf = (page: Pick<FactPage, 'facts'>): CheckKind[] => CHECK_KINDS.filter((k) => page.facts.some((f) => f.checks?.includes(k)))

/** The seal of a page, from the checks: throws when a check the page's facts name did not pass for the rounds the page uses. */
export async function sealOf(page: Pick<FactPage, 'facts' | 'rounds' | 'scope' | 'page'>): Promise<string[]> {
  const checks = await loadChecks()
  const kinds = kindsOf(page)
  const problems = sealProblems(checks, kinds, page.rounds)
  if (problems.length > 0) throw new Error(`seal of /fato/${page.scope}/${page.page}/: ${problems.join('; ')}`)
  return sealLines(checks, kinds, page.rounds, await currentEdition())
}

let memo: Promise<FactPage[]> | undefined
/** The pages of records of the whole site, each checked by the gate. Memoised per build. */
export function loadFactPages(): Promise<FactPage[]> {
  return (memo ??= (async () => {
    const out: FactPage[] = []
    const fixture = await datasetFixture()
    for (const city of await loadCityRoutes()) {
      const found = await loadCityFacts(city.uf, city.slug)
      if (!found) continue
      for (const [page, facts] of found.pages) {
        const curiosities = page === CURIOSITIES_PAGE
        const [ano, turno] = curiosities ? [0, 0] : page.split('-').map(Number)
        // Only the latest cycle has a page per city and round; the earlier ones are explained by the one page `olderCyclesFacts` builds (the records are still gated in load.ts).
        if (!curiosities && ano! < LATEST_CYCLE) continue
        out.push({
          scope: `${city.uf}/${city.slug}`,
          page,
          title: found.place.name,
          subtitle: curiosities ? std('fact.sub.curio', { city: found.place.name }) : std('fact.sub', { city: found.place.name, turno: turno!, ano: ano! }),
          back: { path: curiosities || !CYCLES.includes(ano!) ? `${city.uf}/${city.slug}/` : `${city.uf}/${city.slug}/?ciclo=${ano}&turno=${turno}`, label: std('fact.back') },
          fixture,
          facts,
          rounds: curiosities ? CYCLES.map((a) => ({ ano: a, turno: 1 })) : [{ ano: ano!, turno: turno! }],
        })
      }
    }
    out.push(olderCyclesFacts(fixture, CYCLES.filter((a) => a < LATEST_CYCLE).flatMap((ano) => [1, 2].map((turno) => ({ ano, turno })))))
    out.push(brasilFacts(await loadBrasil(), await isFixtureDataset()))
    const stats = await stateStats()
    for (const ciclo of COMPARE_CYCLES) out.push(compareFacts((await buildCompareRows(stats, ciclo)).slice(0, 6), ciclo, fixture))
    const { margins, pair } = computeReports(await loadReportsData())
    out.push(raceFacts(closestRaces(margins).slice(0, RACES_SHOWN), { primeiro: displayName(pair.nomePrimeiro), segundo: displayName(pair.nomeSegundo) }, displayName, fixture))
    for (const { uf } of stateOrder(stats)) out.push(stateCyclesFacts(uf, cycleBlocksFor(stats.find((s) => s.uf === uf)!), fixture))
    for (const p of out) assertPublishable(p.facts, `/fato/${p.scope}/${p.page}/`)
    for (const p of out) await sealOf(p)
    return out
  })())
}

/** One page of records by its scope and page key (what a page of the site links to); throws when the build has none, so a page cannot link to records that do not exist. */
export async function getFactPage(scope: string, page: string): Promise<FactPage> {
  const found = (await loadFactPages()).find((p) => p.scope === scope && p.page === page)
  if (!found) throw new Error(`no fact page /fato/${scope}/${page}/`)
  return found
}
