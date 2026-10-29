// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { gateReduce, gateStart, islandFailLine, takeHeldTaps, type GateState } from './island-ready'

type Key = string
const hold = (state: GateState<Key> | undefined, ...keys: Key[]): GateState<Key> =>
  keys.reduce<GateState<Key>>((s, key) => gateReduce(s, { type: 'tap', key }), state ?? gateStart)

describe('the held-tap gate (#122)', () => {
  it('keeps one tap and replays it exactly once at ready, then empties the queue', () => {
    const g = gateReduce(hold(gateStart, 'uf:sp'), { type: 'ready' })
    expect(g.status).toBe('ready')
    expect(g.replay).toEqual(['uf:sp'])
    expect(g.held).toEqual([])
  })

  it('replays three taps in arrival order', () => {
    const g = gateReduce(hold(gateStart, 'a', 'b', 'c'), { type: 'ready' })
    expect(g.replay).toEqual(['a', 'b', 'c'])
  })

  it('a second ready replays nothing', () => {
    const once = gateReduce(hold(gateStart, 'a', 'b'), { type: 'ready' })
    expect(once.replay).toEqual(['a', 'b'])
    const twice = gateReduce(once, { type: 'ready' })
    expect(twice.status).toBe('ready')
    expect(twice.replay).toEqual([])
  })

  it('failed discards the queue and keeps nothing to replay', () => {
    const g = gateReduce(hold(gateStart, 'a', 'b'), { type: 'failed' })
    expect(g.status).toBe('failed')
    expect(g.held).toEqual([])
    expect(g.replay).toEqual([])
    // and a late tap or ready changes nothing
    expect(gateReduce(g, { type: 'tap', key: 'c' })).toMatchObject({ status: 'failed', replay: [] })
    expect(gateReduce(g, { type: 'ready' })).toMatchObject({ status: 'failed', replay: [] })
  })

  it('a tap after ready passes straight through instead of being queued', () => {
    const ready = gateReduce(hold(gateStart, 'a'), { type: 'ready' })
    const g = gateReduce(ready, { type: 'tap', key: 'b' })
    expect(g.status).toBe('ready')
    expect(g.replay).toEqual(['b'])
    expect(g.held).toEqual([])
  })

  it('an empty queue at ready is a no-op', () => {
    const g = gateReduce(gateStart, { type: 'ready' })
    expect(g.status).toBe('ready')
    expect(g.replay).toEqual([])
  })

  it('ready is never reverted by a late failure', () => {
    const ready = gateReduce(hold(gateStart, 'a'), { type: 'ready' })
    const g = gateReduce(ready, { type: 'failed' })
    expect(g.status).toBe('ready')
    expect(g.replay).toEqual([])
  })

  it('never replays from the queue twice across repeated reads of the same state', () => {
    const g = gateReduce(hold(gateStart, 'a'), { type: 'ready' })
    expect(g.replay).toEqual(['a'])
    const again = gateReduce(g, { type: 'ready' })
    expect(again.replay).toEqual([])
  })
})

describe('takeHeldTaps', () => {
  it('reads the kept taps in storage order and deletes the attributes', () => {
    const host = document.createElement('astro-island')
    host.setAttribute('data-pending-uf', 'sp')
    host.setAttribute('data-pending-vista', 'mapa')
    expect(takeHeldTaps(host, ['pendingUf', 'pendingVista'])).toEqual([
      { storage: 'pendingUf', value: 'sp' },
      { storage: 'pendingVista', value: 'mapa' },
    ])
    expect(host.getAttribute('data-pending-uf')).toBeNull()
    expect(host.getAttribute('data-pending-vista')).toBeNull()
  })

  it('splits the overlay options on the vertical bar, one tap per option', () => {
    const host = document.createElement('astro-island')
    host.setAttribute('data-pending-options', 'Medida:margem|Ciclo:2026-2022|Tamanho:estado')
    expect(takeHeldTaps(host, ['pendingUf', 'pendingOptions'])).toEqual([
      { storage: 'pendingOptions', value: 'Medida:margem' },
      { storage: 'pendingOptions', value: 'Ciclo:2026-2022' },
      { storage: 'pendingOptions', value: 'Tamanho:estado' },
    ])
    expect(host.getAttribute('data-pending-options')).toBeNull()
  })

  it('ignores storage attributes the island does not read, and a missing island root', () => {
    const host = document.createElement('astro-island')
    host.setAttribute('data-pending-cd', '3304550')
    expect(takeHeldTaps(host, ['pendingUf'])).toEqual([])
    expect(host.getAttribute('data-pending-cd')).toBe('3304550')
    expect(takeHeldTaps(null, ['pendingUf'])).toEqual([])
  })
})

describe('islandFailLine', () => {
  it('writes the one console.error line naming the island', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    islandFailLine('share-sheet', 'guess store')
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0]![0]).toBe('share-sheet: guess store')
    spy.mockRestore()
  })
})
