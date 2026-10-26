/** Progressive enhancement of the three-cycle page (browser only): shows the round asked for in the address, without a request. */
import type { SlotContext } from '../../shared/slot'
import { parseTurno } from './cycles-model'

export function mountCycles(root: HTMLElement, _ctx: SlotContext): void {
  const host = root.querySelector<HTMLElement>('[data-cycles]')
  if (!host) return
  const show = (turno: 1 | 2) => {
    host.dataset.turno = String(turno)
    for (const p of host.querySelectorAll<HTMLElement>('.cycles__round')) p.hidden = p.dataset.turno !== String(turno)
  }
  show(parseTurno(new URLSearchParams(location.search)))
}
