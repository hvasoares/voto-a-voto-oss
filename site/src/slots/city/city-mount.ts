/** Progressive enhancement of the card (browser only): switching cycle and round without a request or a reload. */
import type { SlotContext } from '../../shared/slot'
import { createCityTracker, parseView, viewHref, viewId, type View } from './city-view'

export function mountCity(root: HTMLElement, ctx: SlotContext): void {
  const card = root.querySelector<HTMLElement>('[data-city-card]')
  if (!card) return
  const panels = [...card.querySelectorAll<HTMLElement>('[data-view]')]
  const has = (ano: number, turno: number) => panels.some((p) => p.dataset.view === `${ano}-${turno}` && !p.querySelector('[data-nodata]'))
  const path = card.dataset.path ?? location.pathname
  const tracker = createCityTracker(card.dataset.uf ?? '', card.dataset.slug ?? '', ctx.analytics)
  const [ano, turno] = (card.dataset.view ?? '').split('-').map(Number) as [number, 1 | 2]
  let current: View = { ano, turno }

  const show = (v: View) => {
    current = v
    card.dataset.view = viewId(v)
    for (const p of panels) p.hidden = p.dataset.view !== viewId(v)
    for (const a of root.querySelectorAll<HTMLAnchorElement>('[data-ciclo]')) {
      const c = Number(a.dataset.ciclo)
      a.setAttribute('aria-current', String(c === v.ano))
      a.href = viewHref(path, { ano: c, turno: v.turno })
    }
    for (const a of root.querySelectorAll<HTMLAnchorElement>('[data-turno]')) {
      const t = Number(a.dataset.turno) as 1 | 2
      a.setAttribute('aria-current', String(t === v.turno))
      a.href = viewHref(path, { ano: v.ano, turno: t })
    }
    const share = root.querySelector<HTMLAnchorElement>('[data-share]')
    if (share) share.href = `${share.dataset.base}?ciclo=${v.ano}&turno=${v.turno}`
  }

  // The pre-rendered page shows the default view; the address may ask for another.
  const asked = parseView(new URLSearchParams(location.search), has)
  if (viewId(asked) !== viewId(current)) show(asked)
  tracker.viewed(current)

  root.addEventListener('click', (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('[data-ciclo], [data-turno]')
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const next: View = a.dataset.ciclo ? { ano: Number(a.dataset.ciclo), turno: current.turno } : { ano: current.ano, turno: Number(a.dataset.turno) as 1 | 2 }
    if (viewId(next) === viewId(current)) return
    const from = current
    show(next)
    history.pushState(null, '', viewHref(path, next))
    tracker.switched(from, next)
  })
  window.addEventListener('popstate', () => show(parseView(new URLSearchParams(location.search), has)))
}
