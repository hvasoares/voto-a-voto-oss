/**
 * The one import block of a report page (ticket #118): what every page under `src/pages/relatorios/` used to import
 * and wire by hand. A page imports from here the loaders and formatters it needs, and `ReportLayout.astro` draws the rest.
 *
 *  - `loadReports()`     the dataset, the computed reports and the pair's two names (`lula`, `flavio`);
 *  - `reportFacts(...)`  the fact records of the page: `calc(key)` is the calculation link beside a figure,
 *                        `seal` is the "conferido" seal, both written from the build's own checks (the gate throws
 *                        when a record or a check is missing);
 *  - the formatters of `./format` (pt-BR numbers), re-exported so a page has one place to import from.
 */
import { candidateName } from '@/shared/candidate-name'
import { siteBase } from '@/paths'
import { calcLink } from '@/lib/facts/link'
import { factLinks } from '@/lib/facts/gate'
import { getFactPage, sealOf } from '@/lib/facts/pages'
import { computeReports } from './compute'
import { loadReportsData } from './load'

export { formatDecimal, formatFixedPct, formatInt, formatSignedInt, formatSignedPp } from './format'
export { RANK_BADGE } from './layout'

/** The dataset, the reports computed from it and the two candidates' names as the pages write them. */
export async function loadReports() {
  const input = await loadReportsData()
  const computed = computeReports(input)
  return { input, ...computed, lula: candidateName(computed.pair.nomePrimeiro), flavio: candidateName(computed.pair.nomeSegundo) }
}

/** The records of a page: the calculation link of a figure and the seal. */
export interface ReportFacts {
  facts: Awaited<ReturnType<typeof getFactPage>>['facts']
  /** The calculation-link markup of the figure with this anchor (throws when it has no record). */
  calc: (anchor: string) => ReturnType<typeof calcLink>
  seal: string[]
}

/**
 * The fact records of the report at `/relatorios/<slug>/` (scope `relatorios/<slug>`, or `relatorios` for the hub).
 * `source` replaces the stored page when the records are not one stored page (the outlier lists: a union of pages).
 */
export async function reportFacts(scope: string, page: string, source?: Pick<Awaited<ReturnType<typeof getFactPage>>, 'facts' | 'rounds' | 'scope' | 'page'>): Promise<ReportFacts> {
  const found = source ?? (await getFactPage(scope, page))
  const links = factLinks(found.facts, `/${scope}/`, siteBase())
  return { facts: found.facts, calc: (anchor) => calcLink(links(anchor)), seal: await sealOf(found) }
}
