/** Pure logic of the state page: what rows to list. No DOM, no I/O. */
import { displayName, fold } from '../../shared/city-search'
import { html } from '../../shared/html'

export interface StateRow {
  slug: string
  /** Display name (Title Case). */
  nome: string
}

/** Every municipality of the state, alphabetical ignoring accents and case. Nothing is dropped or capped. */
export function stateRows(cities: readonly { nome: string; slug: string }[]): StateRow[] {
  return cities
    .map((c) => ({ slug: c.slug, nome: displayName(c.nome), key: fold(c.nome) }))
    .sort((a, b) => a.key.localeCompare(b.key) || a.slug.localeCompare(b.slug))
    .map(({ slug, nome }) => ({ slug, nome }))
}

export const countLabel = (n: number): string => `${n} ${n === 1 ? 'município' : 'municípios'}`

/** Row markup shared by the pre-rendered list and the search results. Kept tiny: SP has 645 rows. The chevron is CSS. */
export function rowMarkup(href: string, nome: string, sub: string) {
  return html`<li><a class="state-row" href="${href}"><span>${nome}</span><small>${sub}</small></a></li>`
}
