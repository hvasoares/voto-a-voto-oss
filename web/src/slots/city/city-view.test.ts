import { describe, expect, it } from 'vitest'
import { createCityTracker, defaultView, parseView, viewHref, viewId } from './city-view'

const all = () => true
const only = (...ids: string[]) => (ano: number, turno: number) => ids.includes(`${ano}-${turno}`)

describe('which view (cycle, round) the card shows', () => {
  it('defaults to the latest cycle and the latest round that has data', () => {
    expect(defaultView(all)).toEqual({ ano: 2026, turno: 2 })
    expect(defaultView(only('2026-1', '2022-1', '2022-2'))).toEqual({ ano: 2026, turno: 1 })
    expect(defaultView(only('2022-1', '2022-2'))).toEqual({ ano: 2022, turno: 2 })
  })
  it('falls back to 2026 round 2 when there is no data at all', () => {
    expect(defaultView(() => false)).toEqual({ ano: 2026, turno: 2 })
  })
  it('?turno and ?ciclo choose the view', () => {
    expect(parseView(new URLSearchParams('turno=1'), all)).toEqual({ ano: 2026, turno: 1 })
    expect(parseView(new URLSearchParams('ciclo=2018&turno=2'), all)).toEqual({ ano: 2018, turno: 2 })
  })
  it('a missing round uses the latest round with data of the chosen cycle', () => {
    expect(parseView(new URLSearchParams('ciclo=2022'), only('2022-1', '2022-2'))).toEqual({ ano: 2022, turno: 2 })
    expect(parseView(new URLSearchParams('ciclo=2022'), only('2022-1'))).toEqual({ ano: 2022, turno: 1 })
  })
  it('a cycle with no data is kept (the card says so); invalid values are ignored', () => {
    expect(parseView(new URLSearchParams('ciclo=2018&turno=1'), only('2026-1', '2026-2'))).toEqual({ ano: 2018, turno: 1 })
    expect(parseView(new URLSearchParams('ciclo=1999&turno=7'), all)).toEqual({ ano: 2026, turno: 2 })
    expect(parseView(new URLSearchParams('ciclo=abc&turno='), all)).toEqual({ ano: 2026, turno: 2 })
  })
  it('has a stable id per view', () => {
    expect(viewId({ ano: 2026, turno: 1 })).toBe('2026-1')
  })
})

describe('tab links and analytics', () => {
  it('builds the plain link of a view', () => {
    expect(viewHref('/rj/x/', { ano: 2022, turno: 1 })).toBe('/rj/x/?ciclo=2022&turno=1')
  })
  it('emits a city view with uf, slug, cycle and round, and one event per switch', () => {
    const seen: [string, unknown][] = []
    const t = createCityTracker('rj', 'x', { event: (n, p) => void seen.push([n, p]) })
    t.viewed({ ano: 2026, turno: 2 })
    t.switched({ ano: 2026, turno: 2 }, { ano: 2026, turno: 1 })
    t.switched({ ano: 2026, turno: 1 }, { ano: 2022, turno: 1 })
    t.switched({ ano: 2022, turno: 1 }, { ano: 2022, turno: 1 })
    expect(seen).toEqual([
      ['city_view', { uf: 'rj', slug: 'x', ciclo: 2026, turno: 2 }],
      ['round_switch', { uf: 'rj', slug: 'x', ciclo: 2026, turno: 1, from_turno: 2 }],
      ['cycle_switch', { uf: 'rj', slug: 'x', ciclo: 2022, turno: 1, from_ciclo: 2026 }],
    ])
  })
  it('never sends text, only simple values', () => {
    const seen: Record<string, unknown>[] = []
    createCityTracker('rj', 'x', { event: (_n, p) => void seen.push(p!) }).viewed({ ano: 2026, turno: 1 })
    for (const v of Object.values(seen[0]!)) expect(['string', 'number']).toContain(typeof v)
  })
})
