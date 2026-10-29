/**
 * Guarded browser storage (#141): every edge the stores relied on, pinned against the shared doubles of
 * #135 — storage that throws on read, on write, on remove; storage that is full (quota); corrupt JSON; a
 * missing key; and the privacy mode where the localStorage property itself throws or is absent.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryStorage, createThrowingStorage } from '../test/memory-storage'
import { browserStorage, readStored, readStoredJson, removeStored, writeStored } from './safe-storage'

const KEY = 'voto-a-voto:test'
const quota = () => new DOMException('quota', 'QuotaExceededError')

describe('browserStorage (#141)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('is the localStorage when there is one', () => {
    const storage = createMemoryStorage()
    vi.stubGlobal('localStorage', storage)
    expect(browserStorage()).toBe(storage)
  })

  it('is undefined in privacy mode (the property read throws)', () => {
    vi.stubGlobal('localStorage', undefined)
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError') } })
    expect(browserStorage()).toBeUndefined()
  })

  it('is undefined where localStorage does not exist (node)', async () => {
    expect(browserStorage()).toBeUndefined()
  })
})

describe('readStored / readStoredJson (#141)', () => {
  it('reads the stored value', () => {
    expect(readStored(createMemoryStorage({ [KEY]: 'v' }), KEY)).toBe('v')
  })

  it('is undefined on a missing key, an absent storage or a throwing read', () => {
    expect(readStored(createMemoryStorage(), KEY)).toBeUndefined()
    expect(readStored(undefined, KEY)).toBeUndefined()
    expect(readStored(createThrowingStorage({ get: new Error('blocked') }), KEY)).toBeUndefined()
  })

  it('parses JSON; the fallback answers a missing key', () => {
    expect(readStoredJson(createMemoryStorage({ [KEY]: '{"a":1}' }), KEY, () => ({}))).toEqual({ a: 1 })
    expect(readStoredJson(createMemoryStorage(), KEY, () => 'fresh')).toBe('fresh')
  })

  it('falls back on corrupt JSON and on a throwing read, calling the fallback each time', () => {
    const fallback = vi.fn(() => 'fresh')
    expect(readStoredJson(createMemoryStorage({ [KEY]: '{oops' }), KEY, fallback)).toBe('fresh')
    expect(readStoredJson(createThrowingStorage({ get: new Error('blocked') }), KEY, fallback)).toBe('fresh')
    expect(fallback).toHaveBeenCalledTimes(2)
  })
})

describe('writeStored (#141)', () => {
  it('writes and says so', () => {
    const storage = createMemoryStorage()
    expect(writeStored(storage, KEY, 'v')).toBe(true)
    expect(storage.getItem(KEY)).toBe('v')
  })

  it('is false on quota exceeded, a throwing write or absent storage — and never throws', () => {
    expect(writeStored(createThrowingStorage({ set: quota() }), KEY, 'v')).toBe(false)
    expect(writeStored(createThrowingStorage({ set: new Error('blocked') }), KEY, 'v')).toBe(false)
    expect(writeStored(undefined, KEY, 'v')).toBe(false)
  })
})

describe('removeStored (#141)', () => {
  it('removes the key', () => {
    const storage = createMemoryStorage({ [KEY]: 'v', other: 'kept' })
    removeStored(storage, KEY)
    expect(storage.getItem(KEY)).toBeNull()
    expect(storage.getItem('other')).toBe('kept')
  })

  it('ignores a throwing remove or absent storage', () => {
    expect(() => removeStored(createThrowingStorage({ remove: new Error('blocked') }), KEY)).not.toThrow()
    expect(() => removeStored(undefined, KEY)).not.toThrow()
  })
})
