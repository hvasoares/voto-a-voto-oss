import { siteBase, stripBase } from '@/paths'
import { classifyPath } from '@/lib/fallback'
import { loadSearchCities } from '@/lib/search-data'

/**
 * Runs on 404.html only. GitHub Pages serves it for any path without a file. If the path is a valid route
 * (its state or city exists in the data) the visitor is told the page exists, not "not found".
 * Pages are ported one by one (#50): until a page is ported it is not pre-rendered, so this is the message.
 * When a page is ported it adds its client renderer here, like the vanilla 404 did.
 */
const base = siteBase()
const main = document.querySelector<HTMLElement>('[data-fallback]')!
const path = stripBase(base, location.pathname)

try {
  const cities = await loadSearchCities(base)
  const states = [...new Set(cities.filter((c) => c.uf !== 'zz').map((c) => c.uf))]
  const result = classifyPath(path, { states, cities })
  if (result.kind === 'valid') {
    main.dataset.fallback = 'valid'
    main.querySelector('[data-fallback-title]')!.textContent = 'Página em construção'
    main.querySelector('[data-fallback-text]')!.textContent = 'Este endereço é válido, mas a página ainda não foi migrada para o novo site.'
  } else main.dataset.fallback = 'not-found'
} catch {
  main.dataset.fallback = 'not-found'
}
