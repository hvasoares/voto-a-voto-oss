/**
 * Keeps a pre-hydration tap from being lost (or from navigating away): the island markup is
 * served static, so the first tap on a tile can land before React is live. The page script
 * records the UF on the island root (`data-pending-uf`) and, when JavaScript is already running
 * but React is not yet attached, keeps the tap a selection instead of a navigation - the frames
 * say a tap selects the state. The island honours `data-pending-uf` right after hydration and
 * deletes it. Without JavaScript none of this runs and the tiles stay plain links.
 */
export {}

document.addEventListener(
  'pointerdown',
  (e) => {
    const island = islandOf(e)
    if (island && island.dataset.pendingUf === undefined) setIslandUf(island, e)
  },
  true,
)

document.addEventListener(
  'click',
  (e) => {
    if (e.defaultPrevented) return
    const island = islandOf(e)
    if (!island) return
    e.preventDefault()
    setIslandUf(island, e)
  },
  true,
)

function islandOf(e: Event): HTMLElement | null {
  const el = (e.target as Element | null)?.closest('[data-uf]')
  if (!el) return null
  return el.closest('astro-island') as HTMLElement | null
}

function setIslandUf(island: HTMLElement, e: Event): void {
  const target = e.target as Element | null
  island.dataset.pendingUf = island.dataset.pendingUf ?? target?.closest('[data-uf]')?.getAttribute('data-uf') ?? ''
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