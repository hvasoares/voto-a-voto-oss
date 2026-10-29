// @vitest-environment jsdom
/**
 * Fidelity contract of the shared storage doubles (#135): the same operation script must produce
 * the same observations on `createMemoryStorage()` and on the browser storage jsdom gives the
 * suite, and the throwing variant must throw only where it is asked to.
 */
import { describe, expect, it } from 'vitest'
import { createMemoryStorage, createThrowingStorage } from './memory-storage'

const script = (s: Storage): unknown[] => {
  const seen: unknown[] = []
  seen.push(s.getItem('missing')) // a missing key reads null
  s.setItem('one', '1')
  seen.push(s.getItem('one'))
  s.setItem('one', 'uno') // overwriting keeps the one slot
  seen.push(s.getItem('one'), s.length, s.key(0))
  s.setItem('num', 42 as unknown as string) // values are coerced to strings
  seen.push(s.getItem('num'), s.length)
  s.removeItem('one')
  seen.push(s.getItem('one'), s.length, s.key(0), s.key(7)) // key(0) follows insertion order; out of range is null
  s.clear()
  seen.push(s.length, s.getItem('num'))
  return seen
}

describe('the shared memory storage', () => {
  it('behaves exactly like the jsdom storage on the same operation script', () => {
    window.localStorage.clear()
    expect(script(createMemoryStorage())).toEqual(script(window.localStorage))
  })

  it('honours an initial content and is fresh on every call', () => {
    const a = createMemoryStorage({ kept: 'yes' })
    expect(a.getItem('kept')).toBe('yes')
    expect(createMemoryStorage().getItem('kept')).toBeNull()
    a.setItem('x', '1')
    expect(createMemoryStorage({ kept: 'yes' }).getItem('x')).toBeNull()
  })
})

describe('the throwing storage', () => {
  it('throws the read error on getItem, the write error on setItem, and removes work', () => {
    const get = new Error('SecurityError')
    const set = new Error('QuotaExceededError')
    const s = createThrowingStorage({ get, set })
    expect(() => s.getItem('k')).toThrow(get)
    expect(() => s.setItem('k', 'v')).toThrow(set)
    expect(() => s.removeItem('k')).not.toThrow()
    expect(s.length).toBe(0)
  })

  it('throws on remove only when asked, and reads work otherwise', () => {
    const remove = new Error('SecurityError')
    const s = createThrowingStorage({ remove })
    expect(() => s.removeItem('k')).toThrow(remove)
    s.setItem('k', 'v')
    expect(s.getItem('k')).toBe('v')
  })
})
