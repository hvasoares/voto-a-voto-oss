/**
 * The metrics notice of the site (formerly the LGPD consent gate of ticket #20, changed 2026-10-27 to
 * the Globo/g1-style notice-only model): measurement is implied by the use of the site — the boot
 * script installs analytics on every page — and the banner (components/ConsentBanner.astro) is
 * informational, with a single "Prosseguir" button that only records the acknowledgment so it does not
 * reappear. Nothing is refused here; a visitor who does not want the measurement blocks the Google
 * origins in the browser (disclosed in the privacy section).
 *
 * The storage access sits behind try/catch: a private window (or a cleaned/blocked site data) must leave
 * the site fully working; the acknowledgment is then just not remembered and the banner asks again.
 * Unit tests run in plain node and inject the storage, so the store itself never touches jsdom.
 */

export type NoticeState = 'unknown' | 'acknowledged'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export const NOTICE_STORAGE_KEY = 'voto-a-voto:notice'

export interface NoticeStore {
  /** The current state; `'unknown'` until the visitor advances the banner (or after `forget()`). */
  state(): NoticeState
  /** Records the acknowledgment ("Prosseguir"), persists it and notifies the subscribers. */
  acknowledge(): void
  /** Back to `'unknown'`: the banner shows again (the privacy section uses it). */
  forget(): void
  /** Subscribes to state changes; returns the unsubscribe function. */
  onChange(callback: (state: NoticeState) => void): () => void
}

const STATES: NoticeState[] = ['acknowledged']

function load(storage: () => StorageLike | undefined): NoticeState {
  const st = storage()
  if (!st) return 'unknown'
  try {
    const raw = st.getItem(NOTICE_STORAGE_KEY)
    return STATES.includes(raw as NoticeState) ? (raw as NoticeState) : 'unknown'
  } catch {
    return 'unknown'
  }
}

export function createNoticeStore(overlay?: { storage?: StorageLike | undefined }): NoticeStore {
  // The browser storage is looked up lazily: unit tests run in node (no window) and a page whose
  // localStorage is unavailable (try/catch below) must keep working, just not remembering the banner.
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

  let current: NoticeState = load(remembered)
  const listeners = new Set<(state: NoticeState) => void>()

  const notify = () => {
    for (const cb of listeners) cb(current)
  }

  return {
    state: () => current,
    acknowledge() {
      current = 'acknowledged'
      try {
        remembered?.()?.setItem(NOTICE_STORAGE_KEY, 'acknowledged')
      } catch {
        // Not remembered (browser without storage): the banner shows again on the next visit.
      }
      notify()
    },
    forget() {
      current = 'unknown'
      try {
        remembered?.()?.removeItem(NOTICE_STORAGE_KEY)
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
 * Shared browser instance used by the boot script and anything else that needs the acknowledgment.
 * Plain node unit tests never import this lazy path by default; they build stores with
 * `createNoticeStore({ storage })`.
 */
let shared: NoticeStore | undefined
export function notice(): NoticeStore {
  shared ??= createNoticeStore()
  return shared
}