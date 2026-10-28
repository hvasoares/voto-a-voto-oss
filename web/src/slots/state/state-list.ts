/** Pure logic of the state page: the alphabetical rows (the page's count, the story and fact data). No DOM, no I/O. */
import { displayName, fold } from '../../shared/city-search'

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
