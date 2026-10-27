import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONSENT_STORAGE_KEY, createConsentStore, type StorageLike } from './consent'

function fakeStorage(): StorageLike & { clear(): void } {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    clear: () => map.clear(),
  }
}

let storage = fakeStorage()
afterEach(() => {
  storage = fakeStorage()
})

describe('consent store', () => {
  it('starts unknown with nothing stored', () => {
    expect(createConsentStore({ storage }).state()).toBe('unknown')
    expect(createConsentStore({ storage: undefined }).state()).toBe('unknown')
  })

  it('a grant persists and survives a reload (a new store reads the same storage)', () => {
    const first = createConsentStore({ storage })
    const seen: string[] = []
    first.onChange((s) => seen.push(s))
    first.choose('granted')
    expect(seen).toEqual(['granted'])
    expect(storage.getItem(CONSENT_STORAGE_KEY)).toBe('granted')
    expect(createConsentStore({ storage }).state()).toBe('granted')
  })

  it('a refusal persists the same way', () => {
    createConsentStore({ storage }).choose('refused')
    expect(storage.getItem(CONSENT_STORAGE_KEY)).toBe('refused')
    expect(createConsentStore({ storage }).state()).toBe('refused')
  })

  it('notifies the subscribers on every choice and on reset', () => {
    const store = createConsentStore({ storage })
    const seen: string[] = []
    const stop = store.onChange((s) => seen.push(s))
    store.choose('refused')
    // The consent-change flow: back to unknown, the banner would show again.
    store.reset()
    expect(seen).toEqual(['refused', 'unknown'])
    stop()
    store.choose('granted')
    expect(seen).toEqual(['refused', 'unknown'])
  })

  it('reset forgets what was stored', () => {
    const store = createConsentStore({ storage })
    store.choose('granted')
    store.reset()
    expect(store.state()).toBe('unknown')
    expect(storage.getItem(CONSENT_STORAGE_KEY)).toBeNull()
    expect(createConsentStore({ storage }).state()).toBe('unknown')
  })

  it('a storage that throws leaves the site working: state unknown, choice not remembered', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('private window')
      },
      setItem: () => {
        throw new Error('private window')
      },
      removeItem: () => {
        throw new Error('private window')
      },
    }
    const store = createConsentStore({ storage: broken })
    expect(store.state()).toBe('unknown')
    expect(() => store.choose('granted')).not.toThrow()
    expect(store.state()).toBe('granted') // still in memory, just not remembered
    expect(createConsentStore({ storage: broken }).state()).toBe('unknown')
  })

  it('anything else in storage reads as unknown', () => {
    storage.setItem(CONSENT_STORAGE_KEY, 'sim')
    expect(createConsentStore({ storage }).state()).toBe('unknown')
  })

  it('choose is observable with vi.fn subscribers unsubscribable', () => {
    const store = createConsentStore({ storage })
    const cb = vi.fn()
    const stop = store.onChange(cb)
    store.choose('refused')
    stop()
    expect(cb).toHaveBeenCalledWith('refused')
    expect(cb).toHaveBeenCalledTimes(1)
  })
})