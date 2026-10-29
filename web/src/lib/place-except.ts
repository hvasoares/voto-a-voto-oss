/**
 * The stretches that hold a place word without naming the place (#184), from the dataset, at build time: a city whose name carries a state or a region
 * ("Boa Esperança do Norte", "Santa Cruz do Sul") and a party acronym that is also a UF code (the fixtures' "PA" and "PB"). `PlaceText` leaves them plain and
 * the guard that looks for a mention outside a link takes them out first, so the two read the same list.
 */
import { createNodeStore } from '@/data/node'
import { displayName } from '@/shared/city-search'
import { splitPlaces } from './place-link'

const holdsPlace = (text: string): boolean => splitPlaces(text).some((s) => s.place)

let memo: Promise<string[]> | undefined
export function placeExceptions(): Promise<string[]> {
  return (memo ??= (async () => {
    const store = createNodeStore()
    const [cities, candidates] = await Promise.all([store.cities(), store.candidates()])
    const names = [...cities.flatMap((c) => [c.nome, displayName(c.nome)]), ...candidates.map((c) => c.partido)]
    return [...new Set(names.filter((n) => n && holdsPlace(n)))].sort((a, b) => b.length - a.length)
  })())
}
