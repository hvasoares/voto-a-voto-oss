/**
 * Astro client directive `client:interaction`: hydrate the island on the first interaction with it, never earlier.
 * Until then the island is the pre-rendered HTML and no JavaScript of the island is downloaded.
 * What was typed before React took over is kept on the island element (data-pending) for the component to pick up.
 */
export default (load, _options, el) => {
  let started = false
  const events = ['focusin', 'pointerdown', 'touchstart', 'keydown']
  const start = async () => {
    if (started) return
    started = true
    for (const e of events) el.removeEventListener(e, start)
    el.removeEventListener('input', remember)
    const hydrate = await load()
    await hydrate()
  }
  const remember = (e) => {
    if (e.target instanceof HTMLInputElement) el.dataset.pending = e.target.value
  }
  for (const e of events) el.addEventListener(e, start, { once: true })
  el.addEventListener('input', remember)
}
