/** The switching of the three-cycle page (private#216): shows the round asked for and switches rounds without a request, on the panels the page draws
 * (`lib/cycles-page-draw.ts`). The one copy of this code; `scripts/city-cycles.ts` hands it to the loader. Browser only. */
import type { Turno } from '@/data'
import { getAnalytics, onAnalyticsReady } from '@/analytics'
import { parseTurno } from '@/slots/city-cycles/cycles-model'
import { createCyclesTracker } from '@/slots/city-cycles/cycles-track'
import { mountReplay, type ReplayHandle } from '@/scripts/city-replay'

/** Wires the drawn page: the round on show, the switch link, the replay and the events. The one copy of the switching code. */
export function mountCycles(host: HTMLElement): void {
  const path = host.dataset.path ?? location.pathname
  const tracker = createCyclesTracker(host.dataset.uf ?? '', host.dataset.slug ?? '', getAnalytics())
  const link = document.querySelector<HTMLAnchorElement>('[data-switch]')
  let current: Turno = Number(host.dataset.turno) as Turno

  let replay: ReplayHandle | undefined
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
    // The replay of the round on show, drawn from that round's own blocks (a switch draws it again, and the old one is gone).
    replay?.destroy()
    const panel = host.querySelector<HTMLElement>(`.cycles__round[data-turno="${turno}"]`)
    replay = panel ? mountReplay(panel, host.dataset.name ?? '', turno) : undefined
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
