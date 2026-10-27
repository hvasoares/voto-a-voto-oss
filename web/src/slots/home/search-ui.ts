/** Search behaviour of the home slot: a testable controller (no DOM) plus the results markup. The page wires the controller. */
import type { Analytics } from '../../analytics'
import type { City } from '../../data'
import { html } from '../../shared/html'
import { buildIndex, fold, MIN_QUERY, searchCities, type SearchHit } from '../../shared/city-search'

export interface SearchView {
  state: 'short' | 'empty' | 'results'
  total: number
  hits: SearchHit[]
}

export function createSearchController(cities: City[], analytics: Analytics) {
  const index = buildIndex(cities)
  return {
    search(text: string, track = true): SearchView {
      const key = fold(text)
      if (key.length < MIN_QUERY) return { state: 'short', total: 0, hits: [] }
      const { total, hits } = searchCities(index, text)
      // Only counts leave the page: never the text itself.
      if (track) analytics.event('search', { results: total, query_length: text.trim().length })
      return { state: total === 0 ? 'empty' : 'results', total, hits }
    },
    resultTap: (position: number, uf: string) => analytics.event('search_result_tap', { position, uf }),
    stateTap: (uf: string) => analytics.event('state_tile_tap', { uf }),
  }
}

export function resultsMarkup(view: SearchView, href: (uf: string, slug: string) => string): string {
  if (view.state === 'short') return ''
  if (view.state === 'empty') return html`<p class="home-results__note">Nenhuma cidade encontrada. Confira a grafia ou escolha um estado abaixo.</p>`.value
  const cut = view.total > view.hits.length
  return html`<ul class="home-results" aria-label="Cidades encontradas">${view.hits.map(
    (h, i) => html`<li><a class="home-result" href="${href(h.uf, h.slug)}" data-position="${i + 1}" data-uf="${h.uf}"><span class="home-result__name">${h.nome}</span><span class="home-result__uf">${h.ufLabel}</span></a></li>`,
  )}</ul>${cut ? html`<p class="home-results__note">Mostrando ${view.hits.length} de ${view.total}. Digite mais letras para refinar.</p>` : ''}`.value
}
