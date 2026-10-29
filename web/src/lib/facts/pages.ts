/**
 * Every page of fact records of the site, at build time (#61, #62): the city card's, Brasil e regiões, Comparar com 2022 / 2018 and the
 * state three-cycles pages, each through the same gate. The seal of a page is made here from the build's own checks: a page whose facts name a
 * check that did not pass for its rounds does not build.
 */
import { candidateName } from '@/shared/candidate-name'
import { buildCompareRows, cycleBlocksFor, stateOrder, stateStats } from '../compare-data'
import { COMPARE_CYCLES } from '../compare'
import { isFixtureDataset, loadBrasil } from '../brasil-load'
import { loadCityRoutes } from '../city-routes'
import { loadRegionPages } from '../region-page'
import { currentEdition } from '../editions-load'
import { datasetFixture, loadArcsFile, loadStateShard, loadStateUfs } from '../shard-files'
import { CHECK_KINDS, sealLines, sealProblems, type CheckKind } from './checks'
import { loadChecks } from './checks-load'
import { assertPublishable } from './gate'
import { loadCityFacts } from './load'
import { CURIOSITIES_PAGE, LATEST_CYCLE } from './model'
import { brasilFacts, regionFacts, cohortFacts, compareFacts, deltaFacts, hubFacts, olderCyclesFacts, outlierFactPages, raceFacts, stateCountFacts, stateCyclesFacts, swingFacts, turnoutListFacts, type FactPage } from './other'
import { biggestSwing, closestRaces, computeReports, flipsToFlavio, flipsToLula, MIN_BIG_SWING_VALIDOS, MIN_FLIP_VALIDOS, MIN_TURNOUT_APTOS, rankedBigSwings, rankedFlipsToLula, rankedTurnout, rankedVoteDeltas, turnoutExtremes } from '../reports/compute'
import { loadCohortData } from '../cohorts-load'
import { stateRows } from '../../slots/state/state-list'
import { UF_NOME } from '../uf-names'
import { loadReportsData } from '../reports/load'
import { DEFAULT_MIN } from '../reports/outliers'
import { loadOutliers } from '../reports/outliers-load'
import { displayName } from '@/shared/city-search'
import { CYCLES } from '@/shared/city-model'
import { DEFAULT_LOCALE, message } from '../sentences/catalog'

const std = (key: Parameters<typeof message>[1], params?: Record<string, string | number>) => message({ locale: DEFAULT_LOCALE, register: 'standard' }, key, params)

/** Rows of the closest-races report the page shows (the page imports this, so the records and the rows cannot drift). */
export const RACES_SHOWN = 20
/** Rows per list of the turnout report and per gains/losses list of the votes report. */
export const TURNOUT_SHOWN = 10
export const DELTAS_SHOWN = 10

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
    for (const region of await loadRegionPages()) out.push(regionFacts(region, fixture))
    const stats = await stateStats()
    for (const ciclo of COMPARE_CYCLES) out.push(compareFacts((await buildCompareRows(stats, ciclo)).slice(0, 6), ciclo, fixture))
    const reportsData = await loadReportsData()
    const reports = computeReports(reportsData)
    const { margins, pair } = reports
    const names = { primeiro: candidateName(pair.nomePrimeiro), segundo: candidateName(pair.nomeSegundo) }
    const label = (nome: string, uf: string) => `${displayName(nome)}/${uf.toUpperCase()}`
    out.push(raceFacts(closestRaces(margins).slice(0, RACES_SHOWN), names, displayName, fixture))
    out.push(swingFacts(rankedFlipsToLula(margins), names, label, fixture, { slug: 'cidades-que-viraram', name: 'Cidades que viraram no 2º turno', min: MIN_FLIP_VALIDOS }))
    const big = rankedBigSwings(margins)
    out.push(swingFacts(big.toward, names, label, fixture, { slug: 'maiores-viradas', name: 'Maiores viradas, cidades de 100 mil+ votos', min: MIN_BIG_SWING_VALIDOS, away: big.awayCount }))
    const turnout = rankedTurnout(reportsData)
    out.push(turnoutListFacts(turnout.highest.slice(0, TURNOUT_SHOWN), turnout.lowest.slice(0, TURNOUT_SHOWN), turnout.compared, MIN_TURNOUT_APTOS, label, fixture))
    const section = (key: 'primeiro' | 'segundo') => {
      const ranked = rankedVoteDeltas(reports.voteDeltas[key])
      return { key, name: names[key], net: reports.netVotes[key], unchanged: ranked.unchanged, gains: ranked.gains.slice(0, DELTAS_SHOWN), losses: ranked.losses.slice(0, DELTAS_SHOWN) }
    }
    out.push(deltaFacts([section('primeiro'), section('segundo')], label, fixture))
    out.push(cohortFacts((await loadCohortData()).report, fixture))
    const outliers = await loadOutliers()
    const defaultCount = outliers.counts.find((k) => k.uf === undefined && k.min === DEFAULT_MIN)!.n
    out.push(...outlierFactPages(outliers.listed, outliers.counts, names, label, (uf) => UF_NOME[uf] ?? uf.toUpperCase(), fixture))
    out.push(hubFacts({ names, outliers: { n: defaultCount, min: DEFAULT_MIN }, flips: { primeiro: flipsToLula(margins).length, segundo: flipsToFlavio(margins).length }, biggest: biggestSwing(margins), net: reports.netVotes, race: closestRaces(margins)[0], turnout: turnoutExtremes(reportsData) }, label, fixture))
    for (const uf of await loadStateUfs()) {
      const state = await loadStateShard(uf)
      if (state) out.push(stateCountFacts(uf, UF_NOME[uf] ?? uf.toUpperCase(), stateRows(state.cities).length, fixture))
    }
    const arcsOf = await loadArcsFile()
    for (const { uf } of stateOrder(stats)) out.push(stateCyclesFacts(uf, cycleBlocksFor(stats.find((s) => s.uf === uf)!), fixture, arcsOf?.byState[uf]))
    for (const p of out) assertPublishable(p.facts, `/fato/${p.scope}/${p.page}/`)
    for (const p of out) await sealOf(p)
    return out
  })())
}

/** The records of every list of "Cidades fora da curva" (#34), from all the pages that hold them: a list links to a city's record in the page of that city's state. */
export async function getOutlierFacts(): Promise<{ facts: FactPage['facts']; rounds: FactPage['rounds']; scope: string; page: string }> {
  const pages = (await loadFactPages()).filter((p) => p.scope === 'relatorios/cidades-fora-da-curva')
  if (pages.length === 0) throw new Error('no fact pages /fato/relatorios/cidades-fora-da-curva/')
  return { facts: pages.flatMap((p) => p.facts), rounds: pages[0]!.rounds, scope: 'relatorios/cidades-fora-da-curva', page: 'cidades' }
}

/** One page of records by its scope and page key (what a page of the site links to); throws when the build has none, so a page cannot link to records that do not exist. */
export async function getFactPage(scope: string, page: string): Promise<FactPage> {
  const found = (await loadFactPages()).find((p) => p.scope === scope && p.page === page)
  if (!found) throw new Error(`no fact page /fato/${scope}/${page}/`)
  return found
}
