/**
 * The order the season of a state is read in (#43) and where the choice is kept: the browser's storage, one key (`SEASON_KEY`, listed on the data page, cleared by "esquecer meus dados"), the
 * words `chronological` or `reverse` and nothing else. No imports (the page's small script reads this file; the sentences are in `season.ts`, which the build uses). Guarded: with storage
 * blocked the choice lives until the page closes. Nothing here sends anything.
 */
import { SEASON_KEY } from './storage-keys'

export type SeasonOrder = 'chronological' | 'reverse'
/** The order a visitor with no choice gets. ONE constant: a later test of which order opens better changes this line. (Without scripts the page is always chronological.) */
export const SEASON_DEFAULT_ORDER: SeasonOrder = 'chronological'
export const SEASON_ORDERS: readonly SeasonOrder[] = ['chronological', 'reverse']

export interface OrderStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** The visitor's choice, or the default. */
export function readOrder(storage?: OrderStorage): SeasonOrder {
  try {
    const raw = storage?.getItem(SEASON_KEY)
    return SEASON_ORDERS.find((o) => o === raw) ?? SEASON_DEFAULT_ORDER
  } catch {
    return SEASON_DEFAULT_ORDER
  }
}

/** Keeps the choice; false when the browser would not (storage blocked). */
export function saveOrder(order: SeasonOrder, storage?: OrderStorage): boolean {
  try {
    if (!storage) return false
    storage.setItem(SEASON_KEY, order)
    return true
  } catch {
    return false
  }
}

/** The episodes in the order asked: the same three episodes and the pivot between the 2nd and the 3rd, reversed or not. `items` is [episode 1, episode 2, pivot, episode 3]. Never changes `items`. */
export function orderSeason<T>(items: readonly T[], order: SeasonOrder): T[] {
  return order === 'reverse' ? [...items].reverse() : [...items]
}
