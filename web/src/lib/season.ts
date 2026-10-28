/**
 * The season of a state (#42, #43), PURE: the three cycles of the three-cycle page told as three episodes, the pivot sentence between the 2nd and the 3rd, and the order they are read in.
 *
 *   episode n = the cycle n of 2018, 2022, 2026 (the page's block for it); its anchor is the year (`#2018`), so a shared link lands on the episode;
 *   the pivot sits between episodes 2 and 3: how the share of the page's first candidate moved between 2022 and 2026 (the page's own pp) and in how many cities of the state the side with
 *   the most votes changed in 2026 (the city arcs of #41: `switched2026`, `returned`, `switchedTwice`, over the cities with the three cycles and no tie), or that nothing changed,
 *   a missing cycle, or a state with one city. The order is chronological, or reversed: the same episodes, the same anchors.
 */
import type { ArcCounts } from './arcs'
import type { CycleBlock } from './compare'
import { CATALOG, DEFAULT_LOCALE, DEFAULT_REGISTER, message, type Locale, type MessageKey, type Register } from './sentences/catalog'
import { SEASON_PLAIN, SEASON_STANDARD } from './sentences/catalog-season'

Object.assign(CATALOG['pt-BR'].standard, SEASON_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, SEASON_PLAIN)

import { orderSeason, SEASON_DEFAULT_ORDER, SEASON_ORDERS, type SeasonOrder } from './season-order'
export { orderSeason, SEASON_DEFAULT_ORDER, SEASON_ORDERS, type SeasonOrder }

/** The cities the arcs count for the pivot: `total` = three cycles and no tie, `changed` = the side changed in 2026. */
export function citiesChanged(arcs: ArcCounts): { n: number; total: number } {
  const n = arcs.switched2026 + arcs.returned + arcs.switchedTwice
  return { n, total: n + arcs.same + arcs.switched2022 }
}

export type Pivot =
  | { kind: 'change'; label: string; pp: string; cities?: { n: number; total: number } }
  | { kind: 'steady'; label: string; pct: string; total: number }
  | { kind: 'single'; changed: boolean }
  | { kind: 'missing'; years: number[] }

const ZERO = /^[+−-]?0,0$/

/** The pivot between episodes 2 (2022) and 3 (2026) of `blocks` (the three cycles in order); `arcs` are the state's city arcs, `cities` how many municipalities it has. */
export function seasonPivot(blocks: readonly CycleBlock[], arcs: ArcCounts | undefined, cities: number): Pivot {
  const [, from, to] = blocks
  const years = [from, to].flatMap((b, i) => (!b || b.status !== 'data' || !b.left ? [[2022, 2026][i]!] : []))
  if (!from || !to || years.length) return { kind: 'missing', years }
  const counted = arcs ? citiesChanged(arcs) : undefined
  if (counted && cities === 1 && counted.total === 1) return { kind: 'single', changed: counted.n === 1 }
  const pp = to.changePp ?? ''
  if (counted && counted.total > 0 && counted.n === 0 && ZERO.test(pp)) return { kind: 'steady', label: to.left!.label, pct: to.left!.pct, total: counted.total }
  return { kind: 'change', label: to.left!.label, pp, cities: counted && counted.total > 0 ? counted : undefined }
}

interface Voice {
  locale?: Locale
  register?: Register
}
const voice = (v: Voice) => ({ locale: v.locale ?? DEFAULT_LOCALE, register: v.register ?? DEFAULT_REGISTER })
const say = (v: Voice, key: string, params: Record<string, string | number> = {}) => message(voice(v), key as MessageKey, params)
const list = (v: Voice, items: number[]) => new Intl.ListFormat(voice(v).locale, { style: 'long', type: 'conjunction' }).format(items.map(String))

export function pivotText(p: Pivot, v: Voice = {}): string {
  switch (p.kind) {
    case 'missing':
      return say(v, 'season.pivot.missing', { years: list(v, p.years) })
    case 'single':
      return say(v, 'season.pivot.single', { changed: say(v, p.changed ? 'season.pivot.single.yes' : 'season.pivot.single.no') })
    case 'steady':
      return say(v, 'season.pivot.steady', { label: p.label, pct: p.pct, total: p.total })
    case 'change': {
      const cities = p.cities ? say(v, p.cities.n === 0 ? 'season.cities.zero' : p.cities.n === 1 ? 'season.cities.one' : 'season.cities.other', { n: p.cities.n, total: p.cities.total }) : ''
      return say(v, 'season.pivot.change', { label: p.label, pp: p.pp, cities }).trim()
    }
  }
}

export const episodeLabel = (n: number, ano: number, v: Voice = {}) => say(v, 'season.episode', { n, ano })
export const seasonSay = (key: string, v: Voice = {}, params: Record<string, string | number> = {}) => say(v, key, params)
