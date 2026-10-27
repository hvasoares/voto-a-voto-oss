import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNoticeStore, NOTICE_STORAGE_KEY, type StorageLike } from './consent'

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

describe('notice store (the metrics banner acknowledgment)', () => {
  it('starts unknown with nothing stored', () => {
    expect(createNoticeStore({ storage }).state()).toBe('unknown')
    expect(createNoticeStore({ storage: undefined }).state()).toBe('unknown')
  })

  it('an acknowledgment persists and survives a reload (a new store reads the same storage)', () => {
    const first = createNoticeStore({ storage })
    const seen: string[] = []
    first.onChange((s) => seen.push(s))
    first.acknowledge()
    expect(seen).toEqual(['acknowledged'])
    expect(storage.getItem(NOTICE_STORAGE_KEY)).toBe('acknowledged')
    expect(createNoticeStore({ storage }).state()).toBe('acknowledged')
  })

  it('notifies the subscribers on acknowledge and on forget (the privacy section re-shows the banner)', () => {
    const store = createNoticeStore({ storage })
    const seen: string[] = []
    const stop = store.onChange((s) => seen.push(s))
    store.acknowledge()
    store.forget()
    expect(seen).toEqual(['acknowledged', 'unknown'])
    stop()
    store.acknowledge()
    expect(seen).toEqual(['acknowledged', 'unknown'])
  })

  it('forget clears what was stored', () => {
    const store = createNoticeStore({ storage })
    store.acknowledge()
    store.forget()
    expect(store.state()).toBe('unknown')
    expect(storage.getItem(NOTICE_STORAGE_KEY)).toBeNull()
    expect(createNoticeStore({ storage }).state()).toBe('unknown')
  })

  it('a storage that throws leaves the site working: state unknown, acknowledgment not remembered', () => {
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
    const store = createNoticeStore({ storage: broken })
    expect(store.state()).toBe('unknown')
    expect(() => store.acknowledge()).not.toThrow()
    expect(store.state()).toBe('acknowledged') // still in memory, just not remembered
    expect(createNoticeStore({ storage: broken }).state()).toBe('unknown')
  })

  it('anything else in storage reads as unknown (an old consent-grant value shows the banner once more)', () => {
    storage.setItem(NOTICE_STORAGE_KEY, 'granted')
    expect(createNoticeStore({ storage }).state()).toBe('unknown')
  })

  it('acknowledge is observable with vi.fn subscribers unsubscribable', () => {
    const store = createNoticeStore({ storage })
    const cb = vi.fn()
    const stop = store.onChange(cb)
    store.acknowledge()
    stop()
    expect(cb).toHaveBeenCalledWith('acknowledged')
    expect(cb).toHaveBeenCalledTimes(1)
  })
})