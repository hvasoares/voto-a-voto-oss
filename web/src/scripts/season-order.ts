/** The order switch of the state season (#43): reads the order (the visitor's choice kept in this browser, else the default constant), puts the pre-rendered episodes and the pivot in it, and
 * wires the two buttons. The episodes and their anchors are the same in both orders (the DOM is reordered, so reading order and tab order follow what is seen); a link to an anchor
 * lands on its episode after the reorder. Without scripts the page stays chronological and the switch stays hidden. Nothing is fetched or sent. Browser only. */
import { orderSeason, readOrder, saveOrder, type SeasonOrder } from '@/lib/season-order'

const host = document.querySelector<HTMLElement>('[data-season]')
if (host) {
  const chronological = [...host.children] as HTMLElement[]
  const switcher = document.querySelector<HTMLElement>('[data-season-order]')
  const sub = document.querySelector<HTMLElement>('[data-season-sub]')
  const note = document.querySelector<HTMLElement>('[data-season-note]')
  const status = document.querySelector<HTMLElement>('[data-season-status]')
  const storage = (() => {
    try {
      return globalThis.localStorage
    } catch {
      return undefined
    }
  })()
  const text = (el: HTMLElement | null, key: string) => (el?.dataset[key] ?? '') || undefined

  const apply = (order: SeasonOrder, announce: boolean) => {
    const key = order === 'reverse' ? 'reverse' : 'chrono'
    host.append(...orderSeason(chronological, order))
    host.dataset.order = order
    for (const b of switcher?.querySelectorAll<HTMLElement>('[data-order]') ?? []) b.setAttribute('aria-pressed', String(b.dataset.order === order))
    if (sub) sub.textContent = text(sub, key) ?? sub.textContent
    if (note) note.textContent = text(note, key) ?? note.textContent
    if (announce && status) status.textContent = text(status, key) ?? ''
  }

  apply(readOrder(storage), false)
  if (switcher) switcher.hidden = false
  switcher?.addEventListener('click', (e) => {
    const order = (e.target as Element).closest<HTMLElement>('[data-order]')?.dataset.order
    if (order !== 'chronological' && order !== 'reverse') return
    apply(order, true)
    saveOrder(order, storage)
  })
  // A shared link lands on the episode it names, wherever the order put it.
  if (location.hash.length > 1) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()
  host.dataset.seasonReady = 'true'
  document.documentElement.dataset.ready = 'season'
}
