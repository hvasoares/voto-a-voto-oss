import { describe, expect, it } from 'vitest'
import { createMemoryStorage, createThrowingStorage } from '@/test/memory-storage'
import { readRegister, saveRegister, REGISTER_KEY } from './register-store'

const broken = createThrowingStorage({ get: new Error('blocked'), set: new Error('blocked') })

describe('register store', () => {
  it('starts on the standard register', () => {
    expect(readRegister(createMemoryStorage())).toBe('standard')
  })
  it('remembers the choice', () => {
    const s = createMemoryStorage()
    saveRegister('plain', s)
    expect(s.getItem(REGISTER_KEY)).toBe('plain')
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
    expect(() => saveRegister('plain', broken)).not.toThrow()
    expect(() => saveRegister('plain', undefined)).not.toThrow()
  })
})
