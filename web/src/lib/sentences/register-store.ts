/**
 * The register a reader chose before the city card became plain-only (#157), read from this browser only (localStorage;
 * it never leaves the device and is not sent anywhere). Nothing writes it any more: the surfaces that still read it
 * (the fact pages and the share cards of the duel, Meu Brasil and the generator) keep honouring an earlier choice.
 * Every access goes through the safe-storage helper (#141): storage can be blocked or full, and the page must work without it.
 */
import { DEFAULT_REGISTER, REGISTERS, type Register } from './register'

import { browserStorage, readStored } from '../safe-storage'
import { REGISTER_KEY } from '../storage-keys'

export { REGISTER_KEY }

type Store = Pick<Storage, 'getItem'>

export function readRegister(store: Store | undefined = browserStorage()): Register {
  const saved = readStored(store, REGISTER_KEY)
  return REGISTERS.find((r) => r === saved) ?? DEFAULT_REGISTER
}

/** Inline script for a fact page's body: sets the remembered register on <html> before first paint, so a sentence does not change under the reader. */
export const registerBootScript = `try{if(localStorage.getItem(${JSON.stringify(REGISTER_KEY)})==='plain')document.documentElement.dataset.register='plain'}catch(e){}`
