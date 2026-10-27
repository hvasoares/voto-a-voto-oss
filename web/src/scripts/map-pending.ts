/**
 * Keeps a pre-hydration tap from being lost (or from navigating away): the island markup is
 * served static, so the first tap on a tile or row can land before React is live. The page script
 * records the key of what was tapped on the island root (`data-pending-uf` for a state tile,
 * `data-pending-cd` for a municipality row/shape) and, when JavaScript is already running but React
 * is not yet attached, keeps the tap a selection instead of a navigation - the frames say a tap
 * selects. The islands honour the attribute right after hydration and delete it. Without JavaScript
 * none of this runs and the tiles stay plain links.
 */
export {}

const KEYS: (keyof HTMLElement['dataset'])[] = ['pendingUf', 'pendingCd']

document.addEventListener(
  'pointerdown',
  (e) => {
    const island = islandOf(e)
    if (!island) return
    const first = KEYS.every((k) => island.dataset[k] === undefined)
    if (first) setIslandKey(island, e)
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
    setIslandKey(island, e)
  },
  true,
)

function islandOf(e: Event): HTMLElement | null {
  const el = (e.target as Element | null)?.closest('[data-uf], [data-cd]')
  if (!el) return null
  return el.closest('astro-island') as HTMLElement | null
}

function setIslandKey(island: HTMLElement, e: Event): void {
  if (island.dataset.pendingUf === undefined) {
    const uf = (e.target as Element | null)?.closest('[data-uf]')?.getAttribute('data-uf')
    if (uf) island.dataset.pendingUf = uf
  }
  if (island.dataset.pendingCd === undefined) {
    const cd = (e.target as Element | null)?.closest('[data-cd]')?.getAttribute('data-cd')
    if (cd) island.dataset.pendingCd = cd
  }
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