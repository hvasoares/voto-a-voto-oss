/**
 * Keeps a tap that lands before hydration from being lost (or from navigating away): the island markup is
 * served static, so the first tap on a tile, a shape, a view toggle or an overlay option can land before
 * React is live. This is the page half of the held-tap contract (#122), one script replacing the former
 * `map-pending.ts` and `overlay-pending.ts`: what is tapped is kept on the island root —
 * `data-pending-uf` for a state tile, `data-pending-cd` for a municipality shape, `data-pending-vista` for
 * the Mosaico | Mapa toggle (last direction kept wins, it is a flip), and, on the overlay builder (#68),
 * each tapped `data-option` in order on `data-pending-options` (`'|'-joined). The islands take the kept
 * taps through the gate right after hydration (`useIslandReady` / `takeHeldTaps` in
 * `lib/island-ready.ts`). Without JavaScript none of this runs and the tiles stay plain links.
 *
 * Two deliveries of the ONE installer below: the map pages import this file as a module (as the old
 * map-pending did), and the overlay page inlines `installPendingCapture` verbatim
 * (`is:inline`, as the old overlay-pending was) — the overlay island is `client:load`, so its builder
 * can be tapped while no module of the page has loaded yet; the capture must exist during parsing.
 * For that the installer is deliberately self-contained: no imports, no free variables, its
 * `toString()` is a runnable script — it therefore uses plain function declarations inside (a
 * `const fn = () => {}` would survive compilation wrapped in a bundler name-inference helper, no
 * longer standalone), and `island-pending.test.ts` asserts the stringified source runs by itself.
 *
 * The attribute names and the queueing semantics below are the pending branch of the gate reducer of
 * `lib/island-ready.ts` (taps kept in arrival order, nothing de-duplicated); the test drives both halves.
 * The ready/failed branches of the gate live on the island side only.
 */

import type { HeldStorage, HeldTap } from '@/lib/island-ready'

/** Installs the document-level capture listeners. Runs once per document, however delivered. */
export function installPendingCapture(): void {
  const MARK = Symbol.for('voto-a-voto.pending')
  const doc = document as unknown as Record<symbol, true | undefined>
  if (doc[MARK]) return
  doc[MARK] = true

  // In [HELD_STORAGE] order — the order the island replays them.
  const ATTR: Record<HeldStorage, string> = {
    pendingUf: 'data-pending-uf',
    pendingCd: 'data-pending-cd',
    pendingVista: 'data-pending-vista',
    pendingOptions: 'data-pending-options',
  }

  /** The kept taps of one island instance (never module-level, so islands cannot leak into each other). */
  const queues = new WeakMap<Element, HeldTap[]>()

  /**
   * A row of the municipality LIST is a plain link to the City card (#83): a tap there is never kept or
   * swallowed, hydrated or not. Only the map shapes (SVG anchors, which exist after hydration) keep the
   * select-first behaviour.
   */
  function isListRow(e: Event): boolean {
    const row = (e.target as Element | null)?.closest('a[data-cd]')
    return !!row && !row.closest('svg')
  }

  function islandOf(e: Event): HTMLElement | null {
    const el = (e.target as Element | null)?.closest('[data-uf], [data-cd]')
    if (!el) return null
    return el.closest('astro-island') as HTMLElement | null
  }

  /** Queue the tap on the island and mirror the queue onto the storage attributes the islands read. */
  function keep(island: HTMLElement, tap: HeldTap): void {
    const held = [...(queues.get(island) ?? []), tap]
    queues.set(island, held)
    write(island, 'pendingUf', firstOf(held, 'pendingUf'))
    write(island, 'pendingCd', firstOf(held, 'pendingCd'))
    const vistas = held.filter((t) => t.storage === 'pendingVista')
    write(island, 'pendingVista', vistas.at(-1)?.value)
    const options = held.filter((t) => t.storage === 'pendingOptions').map((t) => t.value)
    write(island, 'pendingOptions', options.length === 0 ? undefined : options.join('|'))
  }

  function write(island: HTMLElement, key: HeldStorage, value: string | undefined): void {
    if (value === undefined) island.removeAttribute(ATTR[key])
    else island.setAttribute(ATTR[key], value)
  }

  function firstOf(held: HeldTap[], storage: HeldStorage): string | undefined {
    return held.find((t) => t.storage === storage)?.value
  }

  /** A state tap and a municipality tap each keep their own key; the first tap kept per key wins. */
  function keepSelection(island: HTMLElement, e: Event): void {
    const uf = (e.target as Element | null)?.closest('[data-uf]')?.getAttribute('data-uf')
    if (uf && island.getAttribute(ATTR.pendingUf) === null) keep(island, { storage: 'pendingUf', value: uf })
    const cd = (e.target as Element | null)?.closest('[data-cd]')?.getAttribute('data-cd')
    if (cd && island.getAttribute(ATTR.pendingCd) === null) keep(island, { storage: 'pendingCd', value: cd })
  }

  document.addEventListener('pointerdown', onPointerDown, true)

  function onPointerDown(e: Event): void {
    if (isListRow(e)) return
    const island = islandOf(e)
    if (!island) return
    const first = island.getAttribute(ATTR.pendingUf) === null && island.getAttribute(ATTR.pendingCd) === null
    if (first) keepSelection(island, e)
  }

  document.addEventListener('click', onClick, true)

  function onClick(e: MouseEvent): void {
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
  }
}

// The module delivery: imported by the script tag of the map pages. The overlay page does not import it —
// it inlines the installer instead, so nothing here (in particular the kick below) must run there.
if (typeof document !== 'undefined') {
  installPendingCapture()
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
}
