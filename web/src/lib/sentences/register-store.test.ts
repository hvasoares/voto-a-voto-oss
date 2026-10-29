import { describe, expect, it } from 'vitest'
import { createMemoryStorage, createThrowingStorage } from '@/test/memory-storage'
import { readRegister, REGISTER_KEY } from './register-store'

const broken = createThrowingStorage({ get: new Error('blocked'), set: new Error('blocked') })

describe('register store', () => {
  it('starts on the standard register', () => {
    expect(readRegister(createMemoryStorage())).toBe('standard')
  })
  it('reads an earlier choice', () => {
    const s = createMemoryStorage()
    s.setItem(REGISTER_KEY, 'plain')
    expect(readRegister(s)).toBe('plain')
  })
  it('ignores a value it does not know', () => {
    const s = createMemoryStorage()
    s.setItem(REGISTER_KEY, 'whatever')
    expect(readRegister(s)).toBe('standard')
  })
  it('works without storage: no store, or one that throws', () => {
    expect(readRegister(undefined)).toBe('standard')
    expect(readRegister(broken)).toBe('standard')
  })
})
