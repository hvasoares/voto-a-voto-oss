/** The addresses of the dashboard "Dados para nerds": Brasil at the root, then /regiao/<regiao>/ and /estado/<uf>/. The state of a view is the query string only (url-state.ts). */
export type Level = 'brasil' | 'regiao' | 'estado'

export interface Place {
  level: Level
  /** Region key ("sudeste") or lower-case UF ("sp"); absent for Brasil. */
  id?: string
}

export const NERDS_ROOT = 'dados-para-nerds'

/** Path under the site base, without a leading slash, always ending in a slash. */
export function nerdsPath(place: Place): string {
  if (place.level === 'brasil') return `${NERDS_ROOT}/`
  return `${NERDS_ROOT}/${place.level}/${place.id}/`
}
