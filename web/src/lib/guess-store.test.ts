import { describe, expect, it } from 'vitest'
import { createMemoryStorage, createThrowingStorage } from '@/test/memory-storage'
import { browserStorage, readGuess, saveGuess } from './guess-store'
import { GUESS_KEY } from './storage-keys'

const blocked = createThrowingStorage({ get: new Error('blocked'), set: new Error('blocked') })

describe('guess store', () => {
  it('has no guess until one is given, and keeps it per city', () => {
    const s = createMemoryStorage()
    expect(readGuess('rj/a', s)).toBeUndefined()
    expect(saveGuess('rj/a', 'yes', s)).toBe(true)
    saveGuess('sp/b', 'no', s)
    expect(readGuess('rj/a', s)).toBe('yes')
    expect(readGuess('sp/b', s)).toBe('no')
  })
  it('keeps only the answer: no time, no counter, nothing else', () => {
    const s = createMemoryStorage()
    saveGuess('rj/a', 'yes', s)
    expect(JSON.parse(s.getItem(GUESS_KEY)!)).toEqual({ 'rj/a': 'yes' })
  })
  it('a new guess replaces the old one, and undefined takes it back', () => {
    const s = createMemoryStorage()
    saveGuess('rj/a', 'yes', s)
    saveGuess('rj/a', 'no', s)
    expect(readGuess('rj/a', s)).toBe('no')
    saveGuess('rj/a', undefined, s)
    expect(readGuess('rj/a', s)).toBeUndefined()
  })
  it('keeps the last 30 cities only', () => {
    const s = createMemoryStorage()
    for (let i = 0; i < 35; i++) saveGuess(`rj/c${i}`, 'yes', s)
    expect(Object.keys(JSON.parse(s.getItem(GUESS_KEY)!))).toHaveLength(30)
    expect(readGuess('rj/c0', s)).toBeUndefined()
    expect(readGuess('rj/c34', s)).toBe('yes')
  })
  it.each(['{', '[]', '"x"', '{"rj/a":"maybe"}', '{"../x":"yes"}'])('ignores a stored value that is %s', (raw) => {
    const s = createMemoryStorage()
    s.setItem(GUESS_KEY, raw)
    expect(readGuess('rj/a', s)).toBeUndefined()
    expect(readGuess('../x', s)).toBeUndefined()
  })
  it('refuses a city key that is not uf/slug', () => {
    expect(saveGuess('../etc', 'yes', createMemoryStorage())).toBe(false)
  })
  it('works with no storage at all, or one that throws on every call', () => {
    for (const s of [undefined, blocked]) {
      expect(readGuess('rj/a', s)).toBeUndefined()
      expect(saveGuess('rj/a', 'yes', s)).toBe(false)
    }
  })
  it('browserStorage does not throw outside a browser', () => {
    expect(() => browserStorage()).not.toThrow()
  })
})
