import { describe, expect, it } from 'vitest'
import { DECOY_COLOUR, runDecoyCheck, runDecoyNegativeControl } from './css-decoy-check'

/** #125: build-output folders left under web/ must not change the CSS bytes. Two astro builds each — allow the time. */
describe('css-decoy-check (#125), two fixture builds each', () => {
  it('a decoy build folder under web/ leaves the built CSS bytes identical', { timeout: 120_000 }, () => {
    const { before, after } = runDecoyCheck()
    expect(after.css.length).toBeGreaterThan(0)
    expect(after.css).toContain('text-step-1')
    expect(after.css).not.toContain(DECOY_COLOUR)
    expect(after.hash).toBe(before.hash)
  })

  it('the check can fail: without the source(none) pin the same decoys change the CSS', { timeout: 120_000 }, () => {
    const negative = runDecoyNegativeControl()
    expect(negative.css).toContain(DECOY_COLOUR)
  })
})
