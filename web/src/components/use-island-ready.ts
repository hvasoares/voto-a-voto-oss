import { useCallback, useRef, useState, type RefObject } from 'react'
import { gateReduce, gateStart, islandFailLine, takeHeldTaps, type GateState, type HeldStorage, type HeldTap } from '@/lib/island-ready'

/**
 * The island half of the held-tap contract (#122): a `data-ready` value in the shared vocabulary —
 * `no` before the island answers, `yes` once and never reverted, `failed` (with `dataError` and one
 * console.error line naming the island) when the data fetch fails terminally — and the replay of the
 * taps the page script kept on the `astro-island` host (`components/../scripts/island-pending.ts`).
 *
 * `markReady(apply)` hands every held tap to `apply`, in arrival order, and only then flips the value
 * to `yes` (the same commit carries both, so `yes` is never observed before the replay). `markFailed`
 * drops the queue; held taps are not replayed after a failure. Islands without a page-side queue omit
 * `storage`/`host` and call `markReady()`/`markFailed` on their own data.
 */
export interface IslandReady {
  /** The value of `data-ready` on the island root: `'no' | 'yes' | 'failed'`. */
  dataReady: 'no' | 'yes' | 'failed'
  /** The short reason of `failed` (the value of `data-error`). */
  dataError?: string
  /** Settle the gate: replay the held taps once through `apply`, then report `ready`. Idempotent. */
  markReady(apply?: (tap: HeldTap) => void): void
  /** Settle the gate as failed, once; held taps are dropped, not replayed. */
  markFailed(reason: string): void
}

export function useIslandReady(name: string, opts: { host?: RefObject<HTMLElement | null>; storage?: readonly HeldStorage[] } = {}): IslandReady {
  const [{ dataReady, dataError }, setState] = useState<{ dataReady: IslandReady['dataReady']; dataError?: string }>({ dataReady: 'no' })
  const gate = useRef<GateState<HeldTap> | undefined>(undefined)
  const conf = useRef({ name, ...opts })
  conf.current = { name, ...opts }

  /** The gate, seeded from the host's storage attributes the first time it is asked. */
  const held = useCallback((): GateState<HeldTap> => {
    if (!gate.current) {
      let g = gateStart as GateState<HeldTap>
      const host = conf.current.host?.current?.closest('astro-island')
      if (host) for (const tap of takeHeldTaps(host, conf.current.storage ?? [])) g = gateReduce(g, { type: 'tap', key: tap })
      gate.current = g
    }
    return gate.current
  }, [])

  const markReady = useCallback(
    (apply?: (tap: HeldTap) => void) => {
      const next = gateReduce(held(), { type: 'ready' })
      gate.current = next
      for (const tap of next.replay) apply?.(tap)
      if (next.status === 'ready') setState((s) => (s.dataReady === 'no' ? { dataReady: 'yes' } : s))
    },
    [held],
  )

  const markFailed = useCallback(
    (reason: string) => {
      const prev = held()
      const next = gateReduce(prev, { type: 'failed' })
      gate.current = next
      if (prev.status === 'pending' && next.status === 'failed') {
        islandFailLine(conf.current.name, reason)
        setState({ dataReady: 'failed', dataError: reason })
      }
    },
    [held],
  )

  return { dataReady, dataError, markReady, markFailed }
}
