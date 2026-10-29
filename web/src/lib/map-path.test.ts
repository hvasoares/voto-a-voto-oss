import { describe, expect, it } from 'vitest'
import { toPath } from './map-path'

describe('toPath', () => {
  it('draws a closed polygon from its points', () => {
    expect(toPath([[0, 0], [4, 0], [4.5, 2.25]])).toBe('M0 0L4 0L4.5 2.25Z')
  })

  it('closes a single point and an empty list without throwing', () => {
    expect(toPath([[1, 2]])).toBe('M1 2Z')
    expect(toPath([])).toBe('MZ')
  })
})
