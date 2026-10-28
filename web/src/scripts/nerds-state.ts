/**
 * The address is the only state of the dashboard (#74): this page script reads `?ciclo=` and shows the cycle block asked for (the HTML carries all three, the latest is the default
 * one), marks the matching cycle link, and prints a visible note when the address held a value that does not exist. It stores nothing anywhere.
 */
import { parseQuery } from '@/lib/nerds/url-state'

const main = document.querySelector<HTMLElement>('[data-page="nerds"]')
if (main) {
  const cycles = (main.dataset.cycles ?? '').split(',').map(Number).filter(Boolean)
  const { state, notes } = parseQuery(location.search, cycles)
  const latest = Math.max(...cycles)
  for (const block of main.querySelectorAll<HTMLElement>('[data-ciclo-block]')) {
    const shown = Number(block.dataset.cicloBlock) === state.ciclo
    if (state.ciclo !== latest) {
      if (shown) block.dataset.shown = ''
      else block.dataset.off = ''
    }
  }
  main.dataset.ready = 'yes'
  main.dataset.ciclo = String(state.ciclo)
  for (const link of main.querySelectorAll<HTMLElement>('[data-cycle-link]')) {
    if (Number(link.dataset.cycleLink) === state.ciclo) link.setAttribute('aria-current', 'true')
  }
  const note = main.querySelector<HTMLElement>('[data-notes]')
  if (note && notes.length) {
    note.textContent = notes.join(' ')
    note.hidden = false
  }
}
