/** Search of the state page: the shared city search, scoped to the rows of ONE state, plus its analytics. `mountStateSearch` wires it to the pre-rendered page. */
import type { Analytics } from '../../analytics'
import { buildIndex, fold, MIN_QUERY, searchCities, type SearchHit } from '../../shared/city-search'
import type { SlotContext } from '../../shared/slot'
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

const DEBOUNCE_MS = 600

/** Progressive enhancement. Reads the rows already in the page (no request), hides the full list while a search shows results. Browser only. */
export function mountStateSearch(root: HTMLElement, ctx: SlotContext): void {
  const box = root.querySelector<HTMLElement>('[data-state-search]')
  const input = box?.querySelector<HTMLInputElement>('input')
  const results = root.querySelector<HTMLElement>('[data-state-results]')
  const list = root.querySelector<HTMLElement>('[data-state-list]')
  if (!box || !input || !results || !list) return
  const uf = box.dataset.uf ?? ''
  const label = uf.toUpperCase()
  const anchors = [...list.querySelectorAll<HTMLAnchorElement>('a.state-row')]
  const hrefs = new Map(anchors.map((a) => [a.getAttribute('href')!.split('/').filter(Boolean).pop()!, a.getAttribute('href')!]))
  const rows = anchors.map((a) => ({ slug: a.getAttribute('href')!.split('/').filter(Boolean).pop()!, nome: a.querySelector('span')!.textContent! }))
  const sub = anchors[0]?.querySelector('small')?.textContent ?? ''
  const search = createStateSearch(rows, uf, ctx.analytics)
  let tracker: ReturnType<typeof setTimeout> | undefined

  const update = () => {
    const text = input.value
    const view = search.search(text, false)
    results.innerHTML = resultsMarkup(view, label, sub, (slug) => hrefs.get(slug) ?? '#')
    results.hidden = view.state === 'short'
    list.hidden = view.state !== 'short'
    clearTimeout(tracker)
    // One `search` event once typing pauses, not one per keystroke.
    tracker = setTimeout(() => search.search(text, true), DEBOUNCE_MS)
  }
  input.addEventListener('input', update)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') results.querySelector<HTMLAnchorElement>('a.state-row')?.click()
  })
  const position = (a: HTMLAnchorElement) => 1 + [...(a.closest('ul')?.querySelectorAll('a.state-row') ?? [])].indexOf(a)
  results.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a.state-row')
    if (a) search.resultTap(position(a))
  })
  list.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a.state-row')
    if (a) search.listTap(position(a))
  })
  root.querySelector('.state-links')?.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-link]')
    if (a) search.linkTap(a.dataset.link as 'map' | 'cycles')
  })
}
