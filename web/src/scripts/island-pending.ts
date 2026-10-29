/**
 * Keeps a tap that lands before hydration from being lost (or from navigating away): the island markup is
 * served static, so the first tap on a tile, a shape, a view toggle or an overlay option can land before
 * React is live. This is the page half of the held-tap contract (#122), one script replacing the former
 * `map-pending.ts` and `overlay-pending.ts`: what is tapped is kept on the island root through the shared
 * gate of `lib/island-ready.ts` — `data-pending-uf` for a state tile, `data-pending-cd` for a municipality
 * shape, `data-pending-vista` for the Mosaico | Mapa toggle (last direction kept wins, it is a flip), and,
 * on the overlay builder (#68), each tapped `data-option` in order on `data-pending-options` (`'|'-joined).
 * The islands take the kept taps through the same gate right after hydration (`useIslandReady`). Without
 * JavaScript none of this runs and the tiles stay plain links.
 */
import { gateReduce, type GateState, type HeldTap } from '@/lib/island-ready'

/** One gate per island instance on the page (never module-level, so islands cannot leak into each other). */
const gates = new WeakMap<HTMLElement, GateState<HeldTap>>()

/**
 * A row of the municipality LIST is a plain link to the City card (#83): a tap there is never kept or
 * swallowed, hydrated or not. Only the map shapes (SVG anchors, which exist after hydration) keep the
 * select-first behaviour.
 */
const isListRow = (e: Event): boolean => {
  const row = (e.target as Element | null)?.closest('a[data-cd]')
  return !!row && !row.closest('svg')
}

document.addEventListener(
  'pointerdown',
  (e) => {
    if (isListRow(e)) return
    const island = islandOf(e)
    if (!island) return
    const first = island.dataset.pendingUf === undefined && island.dataset.pendingCd === undefined
    if (first) keepSelection(island, e)
  },
  true,
)

document.addEventListener(
  'click',
  (e) => {
    if (e.defaultPrevented) return
    // The overlay builder's Medida / Ciclo / Tamanho / Fundo buttons: each choice tapped before React is
    // live is kept in order; the builder applies them on top of the address right after hydration.
    const option = (e.target as Element | null)?.closest('[data-option]')
    const optionHost = option?.closest('astro-island') as HTMLElement | null
    if (option && optionHost?.hasAttribute('ssr')) {
      keep(optionHost, { storage: 'pendingOptions', value: option.getAttribute('data-option')! })
      return
    }
    // The Mosaico | Mapa (or Lista | Mapa) toggle: a tap that lands while React is hydrating (its root
    // already listens, the tree is not attached yet) is swallowed, so it is kept here and the island
    // applies it right after hydration, URL included (data-pending-vista; the last direction wins).
    const toggle = (e.target as Element | null)?.closest('a[href^="?"]')
    const toggleHost = toggle?.closest('astro-island') as HTMLElement | null
    if (toggle && toggleHost?.hasAttribute('ssr')) {
      e.preventDefault()
      keep(toggleHost, { storage: 'pendingVista', value: toggle.getAttribute('href')!.includes('vista=mapa') ? 'mapa' : 'lista' })
      return
    }
    if (isListRow(e)) return
    const island = islandOf(e)
    if (!island) return
    e.preventDefault()
    keepSelection(island, e)
  },
  true,
)

function islandOf(e: Event): HTMLElement | null {
  const el = (e.target as Element | null)?.closest('[data-uf], [data-cd]')
  if (!el) return null
  return el.closest('astro-island') as HTMLElement | null
}

/** A state tap and a municipality tap each keep their own key; the first tap kept per key wins. */
function keepSelection(island: HTMLElement, e: Event): void {
  const uf = (e.target as Element | null)?.closest('[data-uf]')?.getAttribute('data-uf')
  if (uf && island.dataset.pendingUf === undefined) keep(island, { storage: 'pendingUf', value: uf })
  const cd = (e.target as Element | null)?.closest('[data-cd]')?.getAttribute('data-cd')
  if (cd && island.dataset.pendingCd === undefined) keep(island, { storage: 'pendingCd', value: cd })
}

/** Queue the tap in the island's gate and mirror the queue onto the storage attributes the islands read. */
function keep(island: HTMLElement, tap: HeldTap): void {
  const next = gateReduce(gates.get(island), { type: 'tap', key: tap })
  gates.set(island, next)
  const held = next.held
  const firstOf = (s: HeldTap['storage']) => held.find((t) => t.storage === s)?.value
  write(island, 'pendingUf', firstOf('pendingUf'))
  write(island, 'pendingCd', firstOf('pendingCd'))
  const vistas = held.filter((t) => t.storage === 'pendingVista')
  write(island, 'pendingVista', vistas.at(-1)?.value)
  const options = held.filter((t) => t.storage === 'pendingOptions').map((t) => t.value)
  write(island, 'pendingOptions', options.length === 0 ? undefined : options.join('|'))
}

function write(island: HTMLElement, key: keyof HTMLElement['dataset'], value: string | undefined): void {
  if (value === undefined) delete island.dataset[key]
  else island.dataset[key] = value
}

// A deep link (?vista=mapa) opens the map view without waiting for the first interaction: the
// `client:interaction` directive starts hydration on the first pointerdown INSIDE the island, so
// this synthetic one only plays the note the user already gave by following the "Mapa" toggle.
if (new URLSearchParams(window.location.search).get('vista') === 'mapa') {
  window.addEventListener('load', () => {
    document.querySelectorAll<HTMLElement>('astro-island').forEach((island) => {
      if (island.hasAttribute('ssr')) island.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    })
  })
}
