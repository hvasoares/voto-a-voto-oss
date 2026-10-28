/**
 * The state page's search (#83): the box sits above the ONE list of municipalities (the island's coloured rows) and filters
 * those same rows by toggling `hidden` on them. Browser only; reads the rows already in the page (no request) and sends the
 * events through the one analytics interface.
 *
 * Where the query lives: in the input's value, nowhere else. The script is plain DOM, outside the React island, so it works
 * before hydration (the first keystroke may be the visitor's first interaction) and after it: React never sets `hidden`, so
 * hydration and re-renders leave the filter alone. The only thing that drops it is a fresh mount of the list (back from the
 * map view): the island announces `city-list:mounted` from a layout effect and the filter is applied again before paint.
 * Browsers that restore a typed value after a back navigation are covered by applying the current value at start.
 * `apply()` is synchronous, so the latest text is always the one drawn; nothing is async and nothing can arrive late.
 *
 * Tests wait on `data-filtered` of the search box: "off" (no filter), "none" (nothing matches) or the number of rows shown,
 * set after the DOM was updated.
 */
import { getAnalytics } from '@/analytics'
import { createStateSearch } from '@/slots/state/state-search'
import { countLabel } from '@/slots/state/state-list'

const DEBOUNCE_MS = 600

const box = document.querySelector<HTMLElement>('[data-state-search]')
const input = box?.querySelector<HTMLInputElement>('input')
const status = document.querySelector<HTMLElement>('[data-state-results]')
const area = document.querySelector<HTMLElement>('[data-map-area]')

if (box && input && status && area) {
  const label = (box.dataset.uf ?? '').toUpperCase()
  const rowsNow = () => [...area.querySelectorAll<HTMLAnchorElement>('nav a[data-cd]')]
  const slugOf = (a: HTMLAnchorElement) => a.getAttribute('href')!.split('/').filter(Boolean).pop()!
  /** The name is the row's first text span, after the colour chip. */
  const nameOf = (a: HTMLAnchorElement) => a.querySelectorAll('span')[1]?.textContent ?? ''
  const search = createStateSearch(
    rowsNow().map((a) => ({ slug: slugOf(a), nome: nameOf(a) })),
    box.dataset.uf ?? '',
    getAnalytics(),
  )
  let tracker: ReturnType<typeof setTimeout> | undefined

  /** Draws the filter for the text in the box, on the rows that exist right now. Returns the number of rows shown, or null when not filtering. */
  const apply = (): number | null => {
    const view = search.search(input.value, false)
    const anchors = rowsNow()
    const keep = view.state === 'short' ? null : new Set(view.hits.map((h) => h.slug))
    for (const a of anchors) a.hidden = keep !== null && !keep.has(slugOf(a))
    status.hidden = keep === null
    status.textContent = view.state === 'empty' ? `Nenhuma cidade encontrada em ${label}. Confira a grafia.` : keep ? `${countLabel(view.total)} ${view.total === 1 ? 'encontrado' : 'encontrados'}` : ''
    // Counted from what is drawn; with the list not mounted (map view) the index's own count stands in.
    const shown = keep ? (anchors.length ? anchors.filter((a) => !a.hidden).length : view.total) : null
    box.dataset.filtered = shown === null ? 'off' : shown === 0 ? 'none' : String(shown)
    return shown
  }

  input.addEventListener('input', () => {
    apply()
    clearTimeout(tracker)
    // One `search` event once typing pauses, not one per keystroke.
    const text = input.value
    tracker = setTimeout(() => search.search(text, true), DEBOUNCE_MS)
  })
  // Enter opens the city when exactly one is left; with several nothing happens (never a surprise jump).
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return
    const shown = rowsNow().filter((a) => !a.hidden)
    if (shown.length === 1 && box.dataset.filtered === '1') shown[0]!.click()
  })
  document.addEventListener('city-list:mounted', apply)

  // A tap on a row follows its link (no handler stops it); only the count leaves the page.
  area.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('nav a[data-cd]')
    if (!a) return
    const position = 1 + rowsNow().filter((r) => !r.hidden).indexOf(a)
    if (box.dataset.filtered === 'off') search.listTap(position)
    else search.resultTap(position)
  })
  document.querySelector('.state-links')?.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-link]')
    if (a) search.linkTap(a.dataset.link as 'map' | 'cycles' | 'recap')
  })

  apply()
  // Mark for the e2e specs: the deferred module script took over the page (helpers.waitReady).
  document.documentElement.dataset.ready = 'state-search'
}
