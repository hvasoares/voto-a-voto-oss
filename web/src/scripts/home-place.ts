/**
 * Home: the "Sua cidade" shortcut and the places a tap on a state tile saves. The shortcut is in the page
 * pre-rendered and hidden; this reveals it for a visitor whose browser remembers a place. The search results
 * save their pick in their own island (components/CitySearch.tsx). All of it is guarded: with storage blocked
 * nothing is shown or saved and the page works as before.
 */
import { cityTarget, readDestination } from '@/lib/destinations'
import { HOME_SAY } from '@/lib/sentences/catalog-home'
import { forgetAll, placeHref, placeLabel, readPlace, savePlace } from '@/lib/place-store'

const card = document.querySelector<HTMLElement>('[data-place-shortcut]')

const render = (): void => {
  const place = readPlace()
  // The "Comparar" options that need a city (#101) go straight to the remembered one; otherwise they are links to the search.
  for (const a of document.querySelectorAll<HTMLAnchorElement>('[data-place-to]')) {
    a.dataset.home ??= a.getAttribute('href')!
    a.setAttribute('href', place?.kind === 'city' ? (card?.dataset.base ?? '/') + a.dataset.placeTo!.replace('{c}', `${place.uf}/${place.slug}`) : a.dataset.home)
  }
  // The sub-lines that ask for a city say which one is remembered (#105); without one they stay as the page wrote them.
  for (const sub of document.querySelectorAll<HTMLElement>('[data-ask-city]')) {
    sub.dataset.asked ??= sub.textContent!
    sub.textContent = place?.kind === 'city' ? HOME_SAY['home.place.remembered']!.replace('{nome}', place.nome) : sub.dataset.asked
  }
  if (!card) return
  card.hidden = !place
  if (!place) return
  const link = card.querySelector<HTMLAnchorElement>('[data-place-link]')
  const label = card.querySelector<HTMLElement>('[data-place-label]')
  if (link) {
    // A chosen destination (`?para=`, the closed list) takes the remembered city there; a state keeps its own page.
    const destination = place.kind === 'city' ? readDestination(location.search) : undefined
    const path = place.kind === 'city' && destination ? cityTarget(place.uf, place.slug, destination) : placeHref(place)
    link.href = (card.dataset.base ?? '/') + path.slice(1)
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
