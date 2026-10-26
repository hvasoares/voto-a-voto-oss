import type { DataStore } from './data'
import { fillPattern, matchPattern, paramNames, specificity, type Params } from './routes'
import type { Slot } from './shared/slot'

export interface ResolvedRoute {
  slot: Slot
  params: Params
}

export interface RoutePath {
  slot: Slot
  params: Params
  path: string
}

/**
 * Which concrete paths each slot is pre-rendered for:
 *  - no params             -> one page
 *  - :uf                   -> one per state (never the overseas post)
 *  - :uf + :slug           -> one per city (overseas posts included)
 *  - anything else (:report, :regiao) -> values listed in `meta.paramValues`
 */
export async function enumerateRoutes(slots: Slot[], data: DataStore): Promise<RoutePath[]> {
  const [states, cities] = [await data.states(), await data.cities()]
  const out: RoutePath[] = []
  for (const slot of slots) {
    const names = paramNames(slot.meta.route)
    let combos: Params[]
    if (names.length === 0) combos = [{}]
    else if (names.length === 1 && names[0] === 'uf') combos = states.map((s) => ({ uf: s.uf.toLowerCase() }))
    else if (names.length === 2 && names[0] === 'uf' && names[1] === 'slug') combos = cities.map((c) => ({ uf: c.uf.toLowerCase(), slug: c.slug }))
    else {
      const [name] = names
      const values = slot.meta.paramValues?.[name!]
      if (names.length !== 1 || !values) throw new Error(`slot ${slot.meta.id}: cannot enumerate ${slot.meta.route}; declare meta.paramValues`)
      combos = values.map((v) => ({ [name!]: v }))
    }
    for (const params of combos) out.push({ slot, params, path: fillPattern(slot.meta.route, params) })
  }
  return out
}

/** Finds the slot for a path and checks the params exist in the data (so '/rj/inexistente/' is "not found", not an error). */
export async function resolveRoute(path: string, slots: Slot[], data: DataStore): Promise<ResolvedRoute | undefined> {
  const ordered = [...slots].sort((a, b) => specificity(b.meta.route) - specificity(a.meta.route))
  for (const slot of ordered) {
    const params = matchPattern(slot.meta.route, path)
    if (!params) continue
    const names = paramNames(slot.meta.route)
    if (names.length === 0) return { slot, params }
    if (names.length === 1 && names[0] === 'uf') {
      return (await data.states()).some((s) => s.uf.toLowerCase() === params.uf) ? { slot, params } : undefined
    }
    if (names.length === 2 && names[0] === 'uf' && names[1] === 'slug') {
      return (await data.city(params.uf!, params.slug!)) ? { slot, params } : undefined
    }
    const [name] = names
    return slot.meta.paramValues?.[name!]?.includes(params[name!]!) ? { slot, params } : undefined
  }
  return undefined
}
