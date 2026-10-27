/** Progressive enhancement of the three-cycle page: shows the round asked for and switches rounds without
 * a request. Both rounds are pre-rendered in the page; without JavaScript they show stacked. Browser only. */
import type { Turno } from '@/data'
import { getAnalytics, onAnalyticsReady } from '@/analytics'
import { parseTurno } from '@/slots/city-cycles/cycles-model'
import { createCyclesTracker } from '@/slots/city-cycles/cycles-track'

const host = document.querySelector<HTMLElement>('[data-cycles]')
if (host) {
  const path = host.dataset.path ?? location.pathname
  const tracker = createCyclesTracker(host.dataset.uf ?? '', host.dataset.slug ?? '', getAnalytics())
  const link = document.querySelector<HTMLAnchorElement>('[data-switch]')
  let current: Turno = Number(host.dataset.turno) as Turno

  const show = (turno: Turno) => {
    current = turno
    host.dataset.turno = String(turno)
    for (const p of host.querySelectorAll<HTMLElement>('.cycles__round')) p.hidden = p.dataset.turno !== String(turno)
    if (link) {
      const other: Turno = turno === 1 ? 2 : 1
      link.textContent = `Ver o ${other}º turno ›`
      link.href = `${path}?turno=${other}`
      link.dataset.turno = String(other)
    }
  }
  show(parseTurno(new URLSearchParams(location.search)))
  // A view event when the page opens (the boot settles first, see report-analytics.ts).
  onAnalyticsReady(() => tracker.viewed(current))
  // Mark for the e2e specs: the deferred module script took over the page.
  document.documentElement.dataset.ready = 'city-cycles'

  link?.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const from = current
    const to: Turno = from === 1 ? 2 : 1
    show(to)
    history.pushState(null, '', `${path}?turno=${to}`)
    tracker.switched(from, to)
  })
  addEventListener('popstate', () => show(parseTurno(new URLSearchParams(location.search))))
}