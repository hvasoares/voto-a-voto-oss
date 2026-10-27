/**
 * Home: the "Sua cidade" shortcut and the places a tap on a state tile saves. The shortcut is in the page
 * pre-rendered and hidden; this reveals it for a visitor whose browser remembers a place. The search results
 * save their pick in their own island (components/CitySearch.tsx). All of it is guarded: with storage blocked
 * nothing is shown or saved and the page works as before.
 */
import { forgetAll, placeHref, placeLabel, readPlace, savePlace } from '@/lib/place-store'

const card = document.querySelector<HTMLElement>('[data-place-shortcut]')

const render = (): void => {
  const place = readPlace()
  if (!card) return
  card.hidden = !place
  if (!place) return
  const link = card.querySelector<HTMLAnchorElement>('[data-place-link]')
  const label = card.querySelector<HTMLElement>('[data-place-label]')
  if (link) {
    link.href = (card.dataset.base ?? '/') + placeHref(place).slice(1)
    link.textContent = `${placeLabel(place)} ›`
  }
  if (label) label.textContent = place.kind === 'city' ? 'Sua cidade' : 'Seu estado'
}

document.querySelector('[data-uf-grid]')?.addEventListener('click', (e) => {
  const tile = (e.target as Element).closest<HTMLAnchorElement>('a[data-uf]')
  if (tile?.dataset.uf && tile.dataset.nome) savePlace({ kind: 'state', uf: tile.dataset.uf, nome: tile.dataset.nome })
})

card?.querySelector('[data-place-forget]')?.addEventListener('click', () => {
  forgetAll()
  render()
})

render()
document.documentElement.dataset.ready = 'home'
