/** The "ver cálculo" link printed next to a figure (#61): the words are the catalog's, the address is its fact's. */
import { html, type Raw } from '../../shared/html'
import '../sentences/catalog-facts'
import { DEFAULT_LOCALE, message, type Locale } from '../sentences/catalog'

export function calcLink(href: string, locale: Locale = DEFAULT_LOCALE): Raw {
  return html`<a class="calc" href="${href}">${message({ locale, register: 'standard' }, 'fact.link')}</a>`
}
