/**
 * LGPD consent of ticket #20: a visitor chooses once — "Aceitar" or "Recusar" on the banner — and the
 * choice is remembered (localStorage) so analytics only ever runs after an explicit "granted".
 * Unknown = no choice yet: NOTHING may request Google (see src/analytics), and the banner shows.
 *
 * The storage access sits behind try/catch: a private window (or a cleaned/blocked site data) must leave
 * the site fully working; the choice is then just not remembered and the banner asks again.
 * Unit tests run in plain node and inject the storage, so the store itself never touches jsdom.
 */

export type ConsentDecision = 'granted' | 'refused'
export type ConsentState = 'unknown' | ConsentDecision

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const CONSENT_STORAGE_KEY = 'voto-a-voto:consent'

export interface ConsentStore {
  /** The current state; `'unknown'` until the visitor makes a choice (or after `reset()`). */
  state(): ConsentState
  /** Records the visitor's choice, persists it and notifies the subscribers. */
  choose(decision: ConsentDecision): void
  /** Back to `'unknown'`: the banner shows again and the previous choice is forgotten. */
  reset(): void
  /** Subscribes to state changes; returns the unsubscribe function. */
  onChange(callback: (state: ConsentState) => void): () => void
}

const DECISIONS: ConsentState[] = ['granted', 'refused']

function load(storage: () => StorageLike | undefined): ConsentState {
  const st = storage()
  if (!st) return 'unknown'
  try {
    const raw = st.getItem(CONSENT_STORAGE_KEY)
    return DECISIONS.includes(raw as ConsentState) ? (raw as ConsentState) : 'unknown'
  } catch {
    return 'unknown'
  }
}

export function createConsentStore(overlay?: { storage?: StorageLike | undefined }): ConsentStore {
  // The browser storage is looked up lazily: unit tests run in node (no window) and a page whose
  // localStorage is unavailable (try/catch below) must keep working, just not remembering the choice.
  let remembered: (() => StorageLike | undefined) | undefined
  if (overlay && 'storage' in overlay) remembered = () => overlay.storage
  else
    remembered = () => {
      try {
        return typeof localStorage === 'undefined' ? undefined : localStorage
      } catch {
        return undefined
      }
    }

  let current: ConsentState = load(remembered)
  const listeners = new Set<(state: ConsentState) => void>()

  const notify = () => {
    for (const cb of listeners) cb(current)
  }

  return {
    state: () => current,
    choose(decision) {
      current = decision
      try {
        remembered?.()?.setItem(CONSENT_STORAGE_KEY, decision)
      } catch {
        // Not remembered (browser without storage): the banner shows again on the next visit.
      }
      notify()
    },
    reset() {
      current = 'unknown'
      try {
        remembered?.()?.removeItem(CONSENT_STORAGE_KEY)
      } catch {
        // Nothing persisted to forget.
      }
      notify()
    },
    onChange(callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
  }
}

/**
 * Shared browser instance used by the boot script and the banner (and by anything else that needs the
 * visitor's choice, e.g. the consent-change affordance). Plain node unit tests never import this lazy
 * path by default; they build stores with `createConsentStore({ storage })`.
 */
let shared: ConsentStore | undefined
export function consent(): ConsentStore {
  shared ??= createConsentStore()
  return shared
}