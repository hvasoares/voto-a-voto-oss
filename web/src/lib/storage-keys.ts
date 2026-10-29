/**
 * The names of everything the site writes to the visitor's device (localStorage). One tiny module with no
 * imports, so the Home script can clear them without pulling in the stores' code; the privacy text
 * (`stored-items.ts`) and "esquecer meus dados" (`place-store.ts`) both start from this list.
 */
export const PLACE_KEY = 'voto-a-voto:place'
export const REGISTER_KEY = 'voto-a-voto:register'
export const NOTICE_STORAGE_KEY = 'voto-a-voto:notice'
// The value NOTICE_STORAGE_KEY holds once the visitor has seen the one-line data notice (#132: the e2e
// acknowledgeNotice preset writes this exact pair).
export const NOTICE_ACKNOWLEDGED_VALUE = 'acknowledged'

export const GAME_KEY = 'voto-a-voto:game'

export const GUESS_KEY = 'voto-a-voto:guess'

export const SEASON_KEY = 'voto-a-voto:season'

export const STORED_KEYS: readonly string[] = [PLACE_KEY, REGISTER_KEY, NOTICE_STORAGE_KEY, GAME_KEY, GUESS_KEY, SEASON_KEY]
