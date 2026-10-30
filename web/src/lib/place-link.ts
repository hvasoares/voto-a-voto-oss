/**
 * The catalog half of the link helper for states and regions (#184): the accessible name of a mention ("Página do estado RJ · Rio de Janeiro") and the markup builders
 * that need it. Everything pure (the addresses, the words, `splitPlaces`, the anchor) is in `place-words.ts`, which has no catalog, so a page whose script must not carry
 * the catalog (the calculation page's stub) imports that file; every other caller imports this one, which re-exports it.
 */
import type { Raw } from '../shared/html'
import { message } from './sentences/catalog'
import './sentences/catalog-region'
import { placeAnchor, placeName, type PlaceRef } from './place-words'

export * from './place-words'

/** What a screen reader says for the link: where it goes ("Página do estado RJ · Rio de Janeiro"). */
export function placeLabel(place: PlaceRef, locale: 'pt-BR' = 'pt-BR'): string {
  return message({ locale, register: 'standard' }, place.kind === 'uf' ? 'place.uf' : 'place.region', { name: placeName(place) })
}

/** The link as markup, for the builders that write HTML strings (a card, a slot): the same anchor `PlaceLink` draws; `plain` draws the text only. */
export function placeLinkHtml(place: PlaceRef, options: { text?: string; plain?: boolean } = {}): Raw {
  return placeAnchor(place, placeLabel(place), options)
}

/** The accessible name with its `{name}` slot left open, for a script that retargets the link (the panel of the state-map fragment fills the name it hovers). */
export const placeLabelTemplate = (kind: PlaceRef['kind'], locale: 'pt-BR' = 'pt-BR'): string => message({ locale, register: 'standard' }, kind === 'uf' ? 'place.uf' : 'place.region')

/**
 * Inline script source of the state-map fragments (the Mapa por estado panel and the Ficaram em casa panel): `retargetPlace(link, mapLink)` points the panel's state link
 * (a `PlaceLink` with `data-label-template`) at the state of the map link the visitor hovers or focuses: its text, its address and its accessible name.
 */
export const retargetPlaceSource =
  "function retargetPlace(l,a){var uf=a.getAttribute('data-map-uf').toUpperCase();l.textContent=uf;l.setAttribute('href',a.getAttribute('href'));l.setAttribute('aria-label',l.getAttribute('data-label-template').replace('{name}',uf+' · '+a.getAttribute('data-name')))}"

