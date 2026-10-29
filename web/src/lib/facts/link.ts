/** The calculation link printed next to a figure (#61): the words are the catalog's ("De onde vem este número?", #87: one wording on every page), the address is its fact's. */
import { html, type Raw } from '../../shared/html'
import '../sentences/catalog-facts'
import { DEFAULT_LOCALE, message, type Locale } from '../sentences/catalog'

export function calcLink(href: string, locale: Locale = DEFAULT_LOCALE): Raw {
  return html`<a class="calc" href="${href}">${message({ locale, register: 'standard' }, 'fact.link')}</a>`
}

/**
 * Where did the visitor come from (#152): true when the referrer is another page of this site (not a calculation page, not an outside or empty
 * referrer, which is what a shared link has). Self-contained on purpose: `wayBackScript` ships its source to the page.
 */
export function cameFromSite(referrer: string, origin: string): boolean {
  try {
    const from = new URL(referrer)
    return from.origin === origin && !/\/fato\//.test(from.pathname)
  } catch {
    return false
  }
}

/** Inline script of the calculation page: the back link is a plain link to the page that prints the figure; when the visitor came from a page of the site, it steps back in history instead, so the card is where it was left. */
export const wayBackScript = `var cameFromSite=${cameFromSite.toString()};document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[data-back]');if(a&&!(e.ctrlKey||e.metaKey||e.shiftKey||e.button)&&history.length>1&&cameFromSite(document.referrer,location.origin)){e.preventDefault();history.back()}})`
