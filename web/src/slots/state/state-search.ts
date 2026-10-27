/** Search of the state page: the shared city search, scoped to the rows of ONE state, plus its analytics. */
import type { Analytics } from '../../analytics'
import { buildIndex, fold, MIN_QUERY, searchCities, type SearchHit } from '../../shared/city-search'
import { countLabel, rowMarkup, type StateRow } from './state-list'

export interface StateSearchView {
  state: 'short' | 'empty' | 'results'
  total: number
  hits: SearchHit[]
}

type Props = Record<string, string | number | boolean>

export function createStateSearch(rows: StateRow[], uf: string, analytics: Analytics) {
  const index = buildIndex(rows.map((r) => ({ uf, cdMunicipio: r.slug, cdIbge: '', nome: r.nome, slug: r.slug, regiao: '', ciclos: [] })))
  const emit = (name: string, props: Props) => analytics.event(name, props)
  return {
    search(text: string, track = true): StateSearchView {
      if (fold(text).length < MIN_QUERY) return { state: 'short', total: 0, hits: [] }
      const { total, hits } = searchCities(index, text, { limit: rows.length })
      // Only counts leave the page: never the text itself.
      if (track) emit('search', { scope: 'state', uf, results: total, query_length: text.trim().length })
      return { state: total === 0 ? 'empty' : 'results', total, hits }
    },
    resultTap: (position: number) => emit('search_result_tap', { scope: 'state', uf, position }),
    listTap: (position: number) => emit('city_list_tap', { uf, position }),
    linkTap: (link: 'map' | 'cycles') => emit('state_link_tap', { uf, link }),
  }
}

export function resultsMarkup(view: StateSearchView, label: string, sub: string, href: (slug: string) => string): string {
  if (view.state === 'short') return ''
  if (view.state === 'empty') return `<p class="state-note">Nenhuma cidade encontrada em ${label}. Confira a grafia.</p>`
  const found = `<p class="state-note">${countLabel(view.total)} ${view.total === 1 ? 'encontrado' : 'encontrados'}</p>`
  return `${found}<ul aria-label="Municípios encontrados">${view.hits.map((h) => rowMarkup(href(h.slug), h.nome, sub).value).join('')}</ul>`
}
