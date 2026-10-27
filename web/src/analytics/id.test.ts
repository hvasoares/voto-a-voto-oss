import { afterEach, describe, expect, it } from 'vitest'
import { measurementId } from './id'

const env = import.meta.env as Record<string, string | undefined>

afterEach(() => {
  delete env.PUBLIC_GA_MEASUREMENT_ID
  delete env.GA_MEASUREMENT_ID
})

describe('measurementId()', () => {
  it('is empty without any configured id: analytics stays a strict no-op and the build passes', () => {
    expect(measurementId()).toBe('')
  })

  it('reads the deploy configuration (Astro exposes PUBLIC_* to the browser bundle)', () => {
    env.PUBLIC_GA_MEASUREMENT_ID = 'G-ABC123'
    expect(measurementId()).toBe('G-ABC123')
    delete env.PUBLIC_GA_MEASUREMENT_ID
    env.GA_MEASUREMENT_ID = 'G-ABC123' // the unprefixed alias still works when a build pipes it through
    expect(measurementId()).toBe('G-ABC123')
    delete env.GA_MEASUREMENT_ID
  })

  it('the PUBLIC id wins and whitespace is trimmed', () => {
    env.PUBLIC_GA_MEASUREMENT_ID = '  G-PUBLIC  '
    env.GA_MEASUREMENT_ID = 'G-ALIAS'
    expect(measurementId()).toBe('G-PUBLIC')
  })
})