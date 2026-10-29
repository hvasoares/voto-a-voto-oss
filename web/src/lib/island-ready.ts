/**
 * The held-tap gate of the hydrated islands (#122): taps that land before an island is ready are kept, in
 * arrival order, and replayed exactly once when the island marks itself ready — `data-ready="yes"` is set
 * only AFTER that replay has been handed to the island. A second "ready" replays nothing, `yes` never
 * reverts, and a `failed` gate discards the queue (the taps are dropped, not replayed).
 *
 * This module is the pure part: a reducer over tap/ready/failed events plus the storage-attribute
 * vocabulary (`data-pending-uf`, `data-pending-cd`, `data-pending-vista`, `data-pending-options`) both
 * halves of the contract share (the page script `scripts/island-pending.ts` writes, the React hook
 * `components/use-island-ready.ts` takes). No DOM and no React here beyond attribute reads/writes.
 */

/** A tap kept for later: which storage attribute carried it and its value. */
export interface HeldTap {
  storage: HeldStorage
  value: string
}

/**
 * The storage attribute names of the held taps, unchanged from what the islands already honour, in the
 * order they replay. `pendingOptions` is the overlay builder's `'|'-joined list; the others hold one value.
 */
export type HeldStorage = 'pendingUf' | 'pendingCd' | 'pendingVista' | 'pendingOptions'

export const HELD_STORAGE: readonly (readonly [HeldStorage, string])[] = [
  ['pendingUf', 'data-pending-uf'],
  ['pendingCd', 'data-pending-cd'],
  ['pendingVista', 'data-pending-vista'],
  ['pendingOptions', 'data-pending-options'],
]

export type GateStatus = 'pending' | 'ready' | 'failed'

export type GateEvent<K> = { type: 'tap'; key: K } | { type: 'ready' } | { type: 'failed' }

/**
 * The gate's state: the kept queue plus the taps a `ready` (or a post-ready `tap`) releases this step.
 * `replay` is consumed by the caller once and never repeats.
 */
export interface GateState<K> {
  status: GateStatus
  held: readonly K[]
  replay: readonly K[]
}

export const gateStart: GateState<never> = Object.freeze({ status: 'pending', held: [], replay: [] }) as GateState<never>

/**
 * The contract as a pure function:
 * - a tap before ready joins the queue (arrival order, nothing de-duplicated); a tap after ready passes
 *   straight through as the one-tap replay; a tap after failed is dropped;
 * - ready flips pending -> ready and releases the whole queue exactly once; a second ready (or one on an
 *   already failed or ready gate) releases nothing;
 * - failed is terminal: the queue is discarded, and a ready gate is never reverted by a late failure.
 */
export function gateReduce<K>(prev: GateState<K> | undefined, ev: GateEvent<K>): GateState<K> {
  const state = (prev ?? gateStart) as GateState<K>
  switch (ev.type) {
    case 'tap':
      if (state.status === 'pending') return { ...state, held: [...state.held, ev.key], replay: [] }
      if (state.status === 'ready') return { ...state, replay: [ev.key] }
      return { ...state, replay: [] }
    case 'ready':
      if (state.status === 'pending') return { status: 'ready', held: [], replay: state.held }
      return { ...state, replay: [] }
    case 'failed':
      if (state.status === 'pending') return { status: 'failed', held: [], replay: [] }
      return { ...state, replay: [] }
  }
}

/**
 * Reads the taps the page script kept on the island's `astro-island` host, in [`data-pending-...`] order,
 * and deletes the attributes (the island owns them now). `pendingOptions` splits into one tap per option.
 */
export function takeHeldTaps(host: Element | null | undefined, storage: readonly HeldStorage[]): HeldTap[] {
  const taps: HeldTap[] = []
  if (!host) return taps
  for (const [key, attr] of HELD_STORAGE) {
    if (!storage.includes(key)) continue
    const value = host.getAttribute(attr)
    if (value === null) continue
    host.removeAttribute(attr)
    if (key === 'pendingOptions') {
      for (const option of value.split('|').filter(Boolean)) taps.push({ storage: key, value: option })
    } else taps.push({ storage: key, value })
  }
  return taps
}

/**
 * The one console.error line the contract wants on `failed`, naming the island: `city-search: search.json`.
 */
export function islandFailLine(name: string, reason: string): void {
  console.error(`${name}: ${reason}`)
}
