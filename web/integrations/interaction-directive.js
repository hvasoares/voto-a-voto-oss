/**
 * Astro client directive `client:interaction`: hydrate the island on the first interaction with it, never earlier.
 * Until then the island is the pre-rendered HTML and no JavaScript of the island is downloaded.
 * If loading fails the page keeps its HTML and shows the `[data-island-failed]` note.
 * What was typed before React took over is kept on the island element (data-pending) for the component to pick up.
 */
import { markIslandFailed } from './island-failed.js'
export default (load, _options, el) => {
  let started = false
  const events = ['focusin', 'pointerdown', 'touchstart', 'keydown']
  const start = async () => {
    if (started) return
    started = true
    for (const e of events) el.removeEventListener(e, start)
    el.removeEventListener('input', remember)
    try {
      const hydrate = await load()
      await hydrate()
    } catch (error) {
      console.error('island failed to load', error)
      markIslandFailed(el)
    }
    // Astro catches hydration errors itself (it logs "Error hydrating" and returns): a hydrated island has lost its `ssr` attribute.
    if (el.hasAttribute('ssr')) markIslandFailed(el)
  }
  const remember = (e) => {
    if (e.target instanceof HTMLInputElement) el.dataset.pending = e.target.value
  }
  for (const e of events) el.addEventListener(e, start, { once: true })
  el.addEventListener('input', remember)
}
