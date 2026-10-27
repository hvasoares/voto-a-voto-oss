import { describe, expect, it } from 'vitest'
import { readRegister, saveRegister, REGISTER_KEY } from './register-store'

const memory = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }
}
const broken = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('register store', () => {
  it('starts on the standard register', () => {
    expect(readRegister(memory())).toBe('standard')
  })
  it('remembers the choice', () => {
    const s = memory()
    saveRegister('plain', s)
    expect(s.m.get(REGISTER_KEY)).toBe('plain')
    expect(readRegister(s)).toBe('plain')
  })
  it('ignores a value it does not know', () => {
    const s = memory()
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
