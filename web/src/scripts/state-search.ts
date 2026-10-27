/** Progressive enhancement of the state page: reads the rows already in the page (no request), hides the full
 * list while a search shows results, and sends the events through the one analytics interface. Browser only. */
import { getAnalytics } from '@/analytics'
import { createStateSearch, resultsMarkup } from '@/slots/state/state-search'
import { rowMarkup } from '@/slots/state/state-list'

const DEBOUNCE_MS = 600

/**
 * ?fixture=sketch: the illustrative figures drawn in the Sketch frame "5 Estado" (the 92 fictional
 * municipalities, the banner text, the rows without the counter), only for the screenshot review —
 * the frame's map illustration stays reserved for #16/#17. Vanilla ?fixture=sketch rendered it
 * server-side; the pre-rendered page can only draw it in the browser.
 */
function applySketchFixture(): boolean {
  if (new URLSearchParams(location.search).get('fixture') !== 'sketch') return false
  const banner = document.querySelector<HTMLElement>('.banner')
  const subtitle = document.querySelector<HTMLElement>('.page__subtitle')
  const footer = document.querySelector<HTMLElement>('.source-footer')
  const list = document.querySelector<HTMLElement>('[data-state-list]')
  if (!banner || !subtitle || !list) return true
  banner.textContent = 'EXEMPLO  ·  NOMES E MAPA ILUSTRATIVOS'
  subtitle.textContent = '92 municípios (exemplo)'
  const anchors = [...list.querySelectorAll<HTMLAnchorElement>('a.state-row')]
  const keep = ['Cidade Exemplo A', 'Cidade Exemplo B', 'Cidade Exemplo C', 'Cidade Exemplo D', 'Cidade Exemplo E']
  list.innerHTML = anchors
    .filter((a) => keep.includes(a.querySelector('span')!.textContent!))
    .map((a) => rowMarkup(a.getAttribute('href')!, a.querySelector('span')!.textContent!, 'Município fictício').value)
    .join('')
  if (footer) footer.hidden = true
  return true
}

const box = document.querySelector<HTMLElement>('[data-state-search]')
const input = box?.querySelector<HTMLInputElement>('input')
const results = document.querySelector<HTMLElement>('[data-state-results]')
const list = document.querySelector<HTMLElement>('[data-state-list]')

if (box && input && results && list) {
  applySketchFixture()
  const uf = box.dataset.uf ?? ''
  const label = uf.toUpperCase()
  const anchors = [...list.querySelectorAll<HTMLAnchorElement>('a.state-row')]
  const slugOf = (a: HTMLAnchorElement) => a.getAttribute('href')!.split('/').filter(Boolean).pop()!
  const hrefs = new Map(anchors.map((a) => [slugOf(a), a.getAttribute('href')!]))
  const rows = anchors.map((a) => ({ slug: slugOf(a), nome: a.querySelector('span')!.textContent! }))
  const sub = anchors[0]?.querySelector('small')?.textContent ?? ''
  const search = createStateSearch(rows, uf, getAnalytics())
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
  document.querySelector('.state-links')?.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-link]')
    if (a) search.linkTap(a.dataset.link as 'map' | 'cycles' | 'recap')
  })
  // Mark for the e2e specs: the deferred module script took over the page (helpers.waitReady).
  document.documentElement.dataset.ready = 'state-search'
}