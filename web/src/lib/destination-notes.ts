import type { Destination } from './destinations'

/**
 * What finishes the note under the search: "Ao escolher a cidade, você vai direto para <goes>." (#99, #101). Split from `destinations.ts`
 * (#105) so the Home script, which only needs the addresses, does not carry these words; only the search island imports this file.
 * Keyed by `Destination`, so a destination without its words (or words without a destination) fails the type check and `destinations.test.ts`.
 */
export const DESTINATION_GOES: Record<Destination, string> = {
  compartilhar: 'Compartilhar',
  'tres-ciclos': 'os três ciclos da cidade',
  'cara-a-cara': 'o Cara a cara, com essa cidade',
}
