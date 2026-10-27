import type { Turno } from '../../data'
import { CYCLES } from '../../shared/city-model'

/** One screen of the card: a cycle and a round. Chosen with `?ciclo=2018|2022|2026&turno=1|2`. */
export interface View {
  ano: number
  turno: Turno
}
export type HasData = (ano: number, turno: Turno) => boolean

export const viewId = (v: View) => `${v.ano}-${v.turno}`

const LATEST = CYCLES[CYCLES.length - 1]!
const latestTurno = (ano: number, has: HasData): Turno => (has(ano, 2) ? 2 : has(ano, 1) ? 1 : 2)

/** Latest cycle that has data in any round, and its latest round (2026 round 2 when nothing has data). */
export function defaultView(has: HasData): View {
  const ano = [...CYCLES].reverse().find((a) => has(a, 1) || has(a, 2)) ?? LATEST
  return { ano, turno: latestTurno(ano, has) }
}

/** The view asked for by the query string; anything missing or invalid falls back to the default. */
export function parseView(query: URLSearchParams, has: HasData): View {
  const fallback = defaultView(has)
  const ciclo = Number(query.get('ciclo'))
  const turno = Number(query.get('turno'))
  const ano = CYCLES.includes(ciclo) ? ciclo : fallback.ano
  const round: Turno = turno === 1 || turno === 2 ? turno : CYCLES.includes(ciclo) ? latestTurno(ano, has) : fallback.turno
  return { ano, turno: round }
}

/** `…/rj/x/?ciclo=2022&turno=1`: the plain link of a tab (also what the address bar shows after a switch). */
export const viewHref = (path: string, v: View) => `${path}?ciclo=${v.ano}&turno=${v.turno}`

type Props = Record<string, string | number | boolean>

/**
 * Analytics of the card, pure: a view event when the page opens, one event per tab switch. Properties are the city
 * (uf, slug) and the view; never anything typed.
 */
export function createCityTracker(uf: string, slug: string, analytics: { event(name: string, props?: Props): void }) {
  const props = (v: View): Props => ({ uf, slug, ciclo: v.ano, turno: v.turno })
  return {
    viewed: (v: View) => analytics.event('city_view', props(v)),
    switched(from: View, to: View) {
      if (to.turno !== from.turno) analytics.event('round_switch', { ...props(to), from_turno: from.turno })
      if (to.ano !== from.ano) analytics.event('cycle_switch', { ...props(to), from_ciclo: from.ano })
    },
  }
}
