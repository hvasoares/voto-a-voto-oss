/**
 * The names of everything the site writes to the visitor's device (localStorage). One tiny module with no
 * imports, so the Home script can clear them without pulling in the stores' code; the privacy text
 * (`stored-items.ts`) and "esquecer meus dados" (`place-store.ts`) both start from this list.
 */
export const PLACE_KEY = 'voto-a-voto:place'
export const REGISTER_KEY = 'voto-a-voto:register'
export const NOTICE_STORAGE_KEY = 'voto-a-voto:notice'

export const STORED_KEYS: readonly string[] = [PLACE_KEY, REGISTER_KEY, NOTICE_STORAGE_KEY]
