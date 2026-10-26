/** Progressive enhancement of the three-cycle page (browser only): shows the round asked for and switches rounds without a request. */
import type { Turno } from '../../data'
import type { SlotContext } from '../../shared/slot'
import { parseTurno } from './cycles-model'
import { createCyclesTracker } from './cycles-track'

export function mountCycles(root: HTMLElement, ctx: SlotContext): void {
  const host = root.querySelector<HTMLElement>('[data-cycles]')
  if (!host) return
  const path = host.dataset.path ?? location.pathname
  const tracker = createCyclesTracker(host.dataset.uf ?? '', host.dataset.slug ?? '', ctx.analytics)
  const link = root.querySelector<HTMLAnchorElement>('[data-switch]')
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
  tracker.viewed(current)

  link?.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    const from = current
    const to: Turno = from === 1 ? 2 : 1
    show(to)
    history.pushState(null, '', `${path}?turno=${to}`)
    tracker.switched(from, to)
  })
  window.addEventListener('popstate', () => show(parseTurno(new URLSearchParams(location.search))))
}
