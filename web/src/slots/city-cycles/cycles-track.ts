import type { Turno } from '../../data'

type Props = Record<string, string | number | boolean>

/** Analytics of the three-cycle page, pure: a view event on load, one event per round switch. Properties are the city and the round; never anything typed. */
export function createCyclesTracker(uf: string, slug: string, analytics: { event(name: string, props?: Props): void }) {
  return {
    viewed: (turno: Turno) => analytics.event('city_cycles_view', { uf, slug, turno }),
    switched(from: Turno, to: Turno) {
      if (from !== to) analytics.event('round_switch', { uf, slug, turno: to, from_turno: from, view: 'tres-ciclos' })
    },
  }
}
