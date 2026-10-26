/** Search behaviour of the home slot: a testable controller (no DOM) plus the results markup. `mountSearch` wires it to the page. */
import type { Analytics } from '../../analytics'
import type { City } from '../../data'
import type { SlotContext } from '../../shared/slot'
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


const DEBOUNCE_MS = 600

/** Progressive enhancement: wires the pre-rendered search box and tile grid. Browser only; the page works without it. */
export function mountSearch(root: HTMLElement, ctx: SlotContext): void {
  const input = root.querySelector<HTMLInputElement>('.home-search__input')
  const box = root.querySelector<HTMLElement>('[data-home-results]')
  if (!input || !box) return
  let controller: ReturnType<typeof createSearchController> | undefined
  let loading: Promise<void> | undefined
  let tracker: ReturnType<typeof setTimeout> | undefined
  const href = (uf: string, slug: string) => ctx.href('/:uf/:slug/', { uf, slug })
  const load = () =>
    (loading ??= ctx.data.cities().then((cities) => {
      controller = createSearchController(cities, ctx.analytics)
    }))

  const update = async () => {
    await load()
    const text = input.value
    box.innerHTML = resultsMarkup(controller!.search(text, false), href)
    clearTimeout(tracker)
    // One `search` event once typing pauses, not one per keystroke.
    tracker = setTimeout(() => controller!.search(text, true), DEBOUNCE_MS)
  }
  input.addEventListener('focus', () => void load(), { once: true })
  input.addEventListener('input', () => void update())
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') box.querySelector<HTMLAnchorElement>('a.home-result')?.click()
  })
  box.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a.home-result')
    if (a) controller?.resultTap(Number(a.dataset.position), a.dataset.uf ?? '')
  })
  root.querySelector('[data-uf-grid]')?.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a.uf-tile')
    if (a) (controller ??= createSearchController([], ctx.analytics)).stateTap(a.dataset.uf ?? '')
  })
}
