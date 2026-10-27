/**
 * The reader's choice of register, remembered in this browser only (localStorage; it never leaves the device and
 * is not sent anywhere). Every access is guarded: storage can be blocked or full, and the page must work without it.
 */
import { DEFAULT_REGISTER, REGISTERS, type Register } from './register'

import { REGISTER_KEY } from '../storage-keys'

export { REGISTER_KEY }

type Store = Pick<Storage, 'getItem' | 'setItem'>

const browserStore = (): Store | undefined => {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function readRegister(store: Store | undefined = browserStore()): Register {
  try {
    const saved = store?.getItem(REGISTER_KEY)
    return REGISTERS.find((r) => r === saved) ?? DEFAULT_REGISTER
  } catch {
    return DEFAULT_REGISTER
  }
}

export function saveRegister(register: Register, store: Store | undefined = browserStore()): void {
  try {
    store?.setItem(REGISTER_KEY, register)
  } catch {
    // Blocked or full storage: the choice then lasts only until the page closes.
  }
}

/** Inline script for a page's body: sets the remembered register on <html> before first paint, so a sentence does not change under the reader. */
export const registerBootScript = `try{if(localStorage.getItem(${JSON.stringify(REGISTER_KEY)})==='plain')document.documentElement.dataset.register='plain'}catch(e){}`
