import { describe, expect, it } from 'vitest'
import { createCyclesTracker } from './cycles-track'

const spy = () => {
  const calls: [string, unknown][] = []
  return { calls, analytics: { event: (n: string, p?: unknown) => void calls.push([n, p]) } }
}

describe('city-cycles tracker (events through ctx.analytics, never typed text)', () => {
  it('a view event with uf, slug and round', () => {
    const { calls, analytics } = spy()
    createCyclesTracker('rj', 'cidade-exemplo', analytics).viewed(2)
    expect(calls).toEqual([['city_cycles_view', { uf: 'rj', slug: 'cidade-exemplo', turno: 2 }]])
  })

  it('a switch event names both rounds', () => {
    const { calls, analytics } = spy()
    createCyclesTracker('rj', 'x', analytics).switched(2, 1)
    expect(calls).toEqual([['round_switch', { uf: 'rj', slug: 'x', turno: 1, from_turno: 2, view: 'tres-ciclos' }]])
  })

  it('no event when the round did not change', () => {
    const { calls, analytics } = spy()
    createCyclesTracker('rj', 'x', analytics).switched(1, 1)
    expect(calls).toEqual([])
  })
})
