/**
 * Astro client directive `client:panel`: the lazy island of a dashboard panel ("Dados para nerds", #75). It is `client:media="(min-width: 1024px)"` AND `client:visible` in one:
 *   - below 1024 px the island is never loaded (a phone reads the server-rendered table; no chart code is requested);
 *   - from 1024 px up it hydrates when its markup scrolls into view; resizing a window up to 1024 px arms it then.
 * Until then the island is its pre-rendered HTML (the table). If loading fails the page keeps its HTML and the island root gets `data-failed`.
 */
export default (load, _options, el) => {
  const media = matchMedia('(min-width: 1024px)')
  let started = false
  let observer
  const start = async () => {
    if (started) return
    started = true
    observer?.disconnect()
    media.removeEventListener('change', arm)
    try {
      const hydrate = await load()
      await hydrate()
    } catch (error) {
      console.error('island failed to load', error)
      el.dataset.failed = '1'
    }
  }
  function arm() {
    if (started || !media.matches || !('IntersectionObserver' in window)) return
    observer ??= new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && start())
    observer.disconnect()
    // <astro-island> is display:contents (no box of its own): observe what it renders, like Astro's client:visible.
    for (const child of el.children.length ? el.children : [el]) observer.observe(child)
  }
  media.addEventListener('change', arm)
  arm()
}
