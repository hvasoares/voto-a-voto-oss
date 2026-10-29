// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { act, useEffect, useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIslandReady, type IslandReady } from './use-island-ready'

afterEach(cleanup)

/** A probe island: renders its gate value, exposes `markReady`/`markFailed`, records the replayed taps. */
function Probe({
  storage,
  taps,
  onGate,
  fail,
}: {
  storage?: NonNullable<Parameters<typeof useIslandReady>[1]>['storage']
  taps: string[]
  onGate?: (g: IslandReady) => void
  fail?: string
}) {
  const ref = useRef<HTMLElement | null>(null)
  const island = useIslandReady('probe', { host: ref, storage })
  useEffect(() => {
    onGate?.(island)
  }, [island.dataReady, island.dataError])
  useEffect(() => {
    if (fail) return island.markFailed(fail)
    island.markReady((tap) => taps.push(`${tap.storage}:${tap.value}`))
  }, [fail])
  return <section ref={ref} data-root data-ready={island.dataReady} data-error={island.dataError} />
}

const host = (attrs: Record<string, string>) => {
  const el = document.createElement('astro-island')
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
  document.body.appendChild(el)
  return el
}

describe('useIslandReady', () => {
  it('starts at no and settles at yes once the mount effect runs', async () => {
    const seen: string[] = []
    render(<Probe taps={[]} onGate={(g) => void seen.push(g.dataReady)} />)
    await waitFor(() => expect(document.querySelector('[data-root]')!.getAttribute('data-ready')).toBe('yes'))
    expect(seen[0]).toBe('no')
    expect(seen.at(-1)).toBe('yes')
    expect(document.querySelector('[data-root]')!.getAttribute('data-error')).toBeNull()
  })

  it('replays the kept taps before yes, in arrival order', async () => {
    const wrap = host({ 'data-pending-uf': 'sp', 'data-pending-vista': 'mapa', 'data-pending-options': 'A:1|B:2' })
    const taps: string[] = []
    render(<Probe taps={taps} storage={['pendingUf', 'pendingVista', 'pendingOptions']} />, { container: wrap })
    await waitFor(() => expect(document.querySelector('[data-root]')!.getAttribute('data-ready')).toBe('yes'))
    expect(taps).toEqual(['pendingUf:sp', 'pendingVista:mapa', 'pendingOptions:A:1', 'pendingOptions:B:2'])
    expect(wrap.getAttribute('data-pending-uf')).toBeNull()
    expect(wrap.getAttribute('data-pending-options')).toBeNull()
  })

  it('sets yes in the same commit as the replay: the taps are already applied when yes is observed', async () => {
    let gate: IslandReady | undefined
    const wrap = host({ 'data-pending-uf': 'rj' })
    const taps: string[] = []
    render(<Probe taps={taps} storage={['pendingUf']} onGate={(g) => void (gate = g)} />, { container: wrap })
    await waitFor(() => expect(gate?.dataReady).toBe('yes'))
    expect(taps).toEqual(['pendingUf:rj'])
  })

  it('a failed island sets failed with the reason and drops the kept taps, never replaying them', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrap = host({ 'data-pending-uf': 'sp' })
    const taps: string[] = []
    render(<Probe taps={taps} storage={['pendingUf']} fail="city shard" />, { container: wrap })
    await waitFor(() => expect(document.querySelector('[data-root]')!.getAttribute('data-ready')).toBe('failed'))
    const root = document.querySelector('[data-root]')!
    expect(root.getAttribute('data-error')).toBe('city shard')
    expect(taps).toEqual([])
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0]![0]).toBe('probe: city shard')
    spy.mockRestore()
  })

  it('a second markReady after a failed gate stays failed', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let gate: IslandReady | undefined
    render(<Probe taps={[]} fail="x" onGate={(g) => void (gate = g)} />)
    await waitFor(() => expect(gate?.dataReady).toBe('failed'))
    act(() => gate!.markReady())
    expect(gate!.dataReady).toBe('failed')
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})
