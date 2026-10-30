/**
 * The page's one calculation entry (#155, after #61 and #87): a 🔍 icon whose accessible name is the catalog's "De onde vem este número?" ("fact.link", one wording on every page).
 * A page prints it once, at its title, and its address is the page's calculation view (`fato/...`); there is no link per figure or section.
 */
import { html, type Raw } from '../../shared/html'
import '../sentences/catalog-facts'
import { DEFAULT_LOCALE, message, type Locale } from '../sentences/catalog'

export function calcLink(href: string, locale: Locale = DEFAULT_LOCALE): Raw {
  return html`<a class="calc" data-calc href="${href}" aria-label="${message({ locale, register: 'standard' }, 'fact.link')}"><span aria-hidden="true">🔍</span></a>`
}

export { cameFromSite } from './way-back'
