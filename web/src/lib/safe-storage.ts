/**
 * Guarded access to the visitor-keyed browser storage (#141): the guarded `try { ... } catch` around
 * localStorage lives here once instead of being recopied by every store. Storage can be blocked, full or
 * absent (a private window), and the site must keep working without remembering: reads return undefined,
 * writes return false, removes stay silent; nothing here ever throws. The five stores (place, register,
 * notice, game, guess) build on these calls; the shared-libs guard keeps the guarded block from being
 * re-added. Zero imports, so a page script can use it standalone.
 */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** The browser's localStorage, or undefined where it is blocked (the property read itself can throw). */
export function browserStorage(): StorageLike | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

/** Reads `key` once: the stored value, or undefined on a missing key or a throwing storage. */
export function readStored(storage: Pick<StorageLike, 'getItem'> | undefined, key: string): string | undefined {
  try {
    return storage?.getItem(key) ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Reads `key` as JSON, falling back on a throwing storage, a missing key or corrupt JSON. Validation of
 * the parsed value stays the caller's (the shapes are per-key).
 */
export function readStoredJson<T>(storage: Pick<StorageLike, 'getItem'> | undefined, key: string, fallback: () => T): T {
  const raw = readStored(storage, key)
  if (raw === undefined) return fallback()
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback()
  }
}

/** Writes `value` under `key`; false when the browser would not keep it (blocked or full). */
export function writeStored(storage: Pick<StorageLike, 'setItem'> | undefined, key: string, value: string): boolean {
  try {
    if (!storage) return false
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/** Removes `key`; a throwing storage is ignored. */
export function removeStored(storage: Pick<StorageLike, 'removeItem'> | undefined, key: string): void {
  try {
    storage?.removeItem(key)
  } catch {
    // Nothing persisted to forget.
  }
}
