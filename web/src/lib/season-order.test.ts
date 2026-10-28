import { describe, expect, it } from 'vitest'
import { readOrder, saveOrder, SEASON_DEFAULT_ORDER } from './season-order'
import { SEASON_KEY } from './storage-keys'

const memory = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }
}
const blocked = {
  getItem: () => {
    throw new Error('blocked')
  },
  setItem: () => {
    throw new Error('blocked')
  },
}

describe('season order store', () => {
  it('is the default until a visitor chooses', () => {
    expect(readOrder(memory())).toBe(SEASON_DEFAULT_ORDER)
  })
  it('keeps the choice, and only the word', () => {
    const s = memory()
    expect(saveOrder('reverse', s)).toBe(true)
    expect(readOrder(s)).toBe('reverse')
    expect(s.m.get(SEASON_KEY)).toBe('reverse')
    saveOrder('chronological', s)
    expect(readOrder(s)).toBe('chronological')
  })
  it.each(['', 'sideways', '{"a":1}'])('ignores a stored value that is %j', (raw) => {
    const s = memory()
    s.setItem(SEASON_KEY, raw)
    expect(readOrder(s)).toBe(SEASON_DEFAULT_ORDER)
  })
  it('works with no storage or one that throws', () => {
    for (const s of [undefined, blocked]) {
      expect(readOrder(s)).toBe(SEASON_DEFAULT_ORDER)
      expect(saveOrder('reverse', s)).toBe(false)
    }
  })
})
