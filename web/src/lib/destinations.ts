/**
 * Where the city search sends the visitor after a pick (#99, #101). The destination travels as a plain query parameter
 * on the Home (`/?para=compartilhar`) and is looked up in this CLOSED list: the value is never used as an address,
 * so there is no open redirect, and an unknown value is ignored (the pick opens the City card as usual).
 * One list for the Home entries and the search island. Keep it tiny: it ships inside the search island.
 *
 * ONE shape: `to` is an address template below the site root where `{c}` is the chosen city as `<uf>/<slug>`. A page of the city
 * is `{c}/compartilhar/`; a different route that takes the city as a parameter is `cara-a-cara/?nivel=cidade&a={c}`.
 * The hint line shown above the search for each key (#147) lives in the sentence catalog (`catalog-home.ts`, both registers),
 * one per key here (#105: the Home script imports this file, so it carries only the addresses).
 */
export const DESTINATION_PARAM = 'para'

export const DESTINATIONS = {
  cidade: { to: '{c}/' },
  compartilhar: { to: '{c}/compartilhar/' },
  'tres-ciclos': { to: '{c}/tres-ciclos/' },
  'cara-a-cara': { to: 'cara-a-cara/?nivel=cidade&a={c}' },
} as const
export type Destination = keyof typeof DESTINATIONS

/** The destination named by a location's search string, or undefined for no parameter or an unknown value. */
export function readDestination(search: string): Destination | undefined {
  const value = new URLSearchParams(search).get(DESTINATION_PARAM) ?? ''
  return Object.hasOwn(DESTINATIONS, value) ? (value as Destination) : undefined
}

/** The address (without the base) a pick leads to: the destination's, or the City card when there is none. */
export const cityTarget = (uf: string, slug: string, destination?: Destination): string =>
  `/${destination ? DESTINATIONS[destination].to : '{c}/'}`.replace('{c}', `${uf}/${slug}`)

/** The Home address that makes the search apply a destination; `#busca` brings the search box into view. */
export const destinationLink = (destination: Destination): string => `?${DESTINATION_PARAM}=${destination}#busca`

/**
 * The destination that asks for the search to be focused and hinted (#147): a visitor arriving from an entry that needs a city, with none
 * remembered (with one, the entries go straight to the destination). The Home script uses it to focus and hint at load; the search island
 * uses it to focus again once it has hydrated, because hydration drops the focus the script gave the pre-rendered field.
 */
export const landingDestination = (search: string, hasCity: boolean): Destination | undefined => (hasCity ? undefined : readDestination(search))
