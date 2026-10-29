/**
 * Test-only doubles for the browser Storage contract (#135). `createMemoryStorage()` is a fresh
 * in-memory Storage on every call (never a module singleton), with the same semantics jsdom's
 * Storage has: keys and values are coerced to strings, reading a missing key gives null, and
 * `key(i)` follows insertion order. `createThrowingStorage()` models a blocked or full browser:
 * it throws the given error on read, write and/or remove, exactly where asked, and works
 * everywhere else. The fidelity contract lives in memory-storage.test.ts.
 */

export function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map<string, string>()
  for (const [key, value] of Object.entries(initial)) data.set(key, String(value))
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key: string) => (data.has(String(key)) ? data.get(String(key))! : null),
    setItem: (key: string, value: string) => void data.set(String(key), String(value)),
    removeItem: (key: string) => void data.delete(String(key)),
    key: (index: number) => [...data.keys()][index] ?? null,
  }
}

export function createThrowingStorage(errors: { get?: Error; set?: Error; remove?: Error } = {}): Storage {
  const inner = createMemoryStorage()
  const orThrow =
    <Args extends unknown[], R>(error: Error | undefined, fn: (...args: Args) => R): ((...args: Args) => R) =>
    error
      ? (..._args: Args): R => {
          throw error
        }
      : fn
  return {
    get length() {
      return inner.length
    },
    clear: inner.clear,
    key: inner.key,
    getItem: orThrow(errors.get, inner.getItem),
    setItem: orThrow(errors.set, inner.setItem),
    removeItem: orThrow(errors.remove, inner.removeItem),
  }
}
