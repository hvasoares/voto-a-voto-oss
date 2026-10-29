/**
 * The reader's choice of register, remembered in this browser only (localStorage; it never leaves the device and
 * is not sent anywhere). Every access goes through the safe-storage helper (#141): storage can be blocked or full,
 * and the page must work without it.
 */
import { DEFAULT_REGISTER, REGISTERS, type Register } from './register'

import { browserStorage, readStored, writeStored } from '../safe-storage'
import { REGISTER_KEY } from '../storage-keys'

export { REGISTER_KEY }

type Store = Pick<Storage, 'getItem' | 'setItem'>

export function readRegister(store: Store | undefined = browserStorage()): Register {
  const saved = readStored(store, REGISTER_KEY)
  return REGISTERS.find((r) => r === saved) ?? DEFAULT_REGISTER
}

export function saveRegister(register: Register, store: Store | undefined = browserStorage()): void {
  writeStored(store, REGISTER_KEY, register)
}

/** Inline script for a page's body: sets the remembered register on <html> before first paint, so a sentence does not change under the reader. */
export const registerBootScript = `try{if(localStorage.getItem(${JSON.stringify(REGISTER_KEY)})==='plain')document.documentElement.dataset.register='plain'}catch(e){}`
