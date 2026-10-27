import { getAnalytics } from '@site/analytics'

/** One delegated listener on the plain-HTML UF grid. Event: state_tile_tap {uf}. No island, no React. */
document.querySelector('[data-uf-grid]')?.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-uf]')
  if (a) getAnalytics().event('state_tile_tap', { uf: a.dataset.uf ?? '' })
})
