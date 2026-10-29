/**
 * Astro client directive `client:slot`: a lazy island for a slot that is a map (#55).
 *   - 1024 px and up: hydrate when the island scrolls into view (like `client:visible`);
 *   - below 1024 px: hydrate on the first interaction with it (like `client:interaction`), so a phone downloads nothing before a tap.
 * Until then the island is its pre-rendered HTML. If loading fails the page keeps its HTML and shows the `[data-island-failed]` note.
 * What was typed or tapped before hydration is left to the component (`data-pending*`, same as client:interaction).
 */
import { markIslandFailed } from './island-failed.js'
export default (load, _options, el) => {
  let started = false
  const events = ['focusin', 'pointerdown', 'touchstart', 'keydown']
  let observer
  const start = async () => {
    if (started) return
    started = true
    observer?.disconnect()
    for (const e of events) el.removeEventListener(e, start)
    try {
      const hydrate = await load()
      await hydrate()
    } catch (error) {
      console.error('island failed to load', error)
      markIslandFailed(el)
    }
    if (el.hasAttribute('ssr')) markIslandFailed(el)
  }
  // Interaction is always honoured (a visitor on a wide screen can tap before the island is in view).
  for (const e of events) el.addEventListener(e, start, { once: true })
  if (matchMedia('(min-width: 1024px)').matches && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver((entries) => entries.some((x) => x.isIntersecting) && start())
    // <astro-island> is display:contents (no box of its own): observe what it renders, like Astro's client:visible.
    for (const child of el.children.length ? el.children : [el]) observer.observe(child)
  }
}
