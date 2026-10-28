/**
 * Where the city search sends the visitor after a pick (#99). The destination travels as a plain query parameter
 * on the Home (`/?para=compartilhar`) and is looked up in this CLOSED list: the value is never used as an address,
 * so there is no open redirect, and an unknown value is ignored (the pick opens the City card as usual).
 * One list for both the Home entry and the search island. Keep it tiny: it ships inside the search island.
 */
export const DESTINATION_PARAM = 'para'

/** Parameter value -> path below the city (`/<uf>/<slug>/` + suffix). */
export const DESTINATIONS = { compartilhar: 'compartilhar/' } as const
export type Destination = keyof typeof DESTINATIONS

/** The destination named by a location's search string, or undefined for no parameter or an unknown value. */
export function readDestination(search: string): Destination | undefined {
  const value = new URLSearchParams(search).get(DESTINATION_PARAM) ?? ''
  return Object.hasOwn(DESTINATIONS, value) ? (value as Destination) : undefined
}

/** The Home address that makes the search apply a destination; `#busca` brings the search box into view. */
export const destinationLink = (destination: Destination): string => `?${DESTINATION_PARAM}=${destination}#busca`
