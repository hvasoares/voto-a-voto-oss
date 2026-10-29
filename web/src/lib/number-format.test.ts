/**
 * Locale number formatting (#141): the separators, the decimal mark, the percent rounding and the edge
 * values are pinned here once, in the helper every module now calls.
 *
 * The expected strings are ICU's pt-BR output: ICU4X (node 22+) formats NaN as "NaN" in every locale and
 * groups pt-BR with a dot, the decimal mark a comma; en is the mirror check that the locale is honoured.
 */
import { describe, expect, it } from 'vitest'
import { formatDecimal, formatInteger, formatPoints, formatShare } from './number-format'

describe('formatInteger', () => {
  it('groups thousands with the pt-BR dot', () => {
    expect(formatInteger(1234567)).toBe('1.234.567')
    expect(formatInteger(0)).toBe('0')
  })

  it('honours the locale', () => {
    expect(formatInteger(1234567, 'en')).toBe('1,234,567')
  })

  it('formats NaN as ICU does (a missing number is never silent)', () => {
    expect(formatInteger(NaN)).toBe('NaN')
    expect(formatInteger(undefined as unknown as number)).toBe('NaN')
  })
})

describe('formatDecimal', () => {
  it('uses the decimal comma and rounds to the asked digits', () => {
    expect(formatDecimal(33.64)).toBe('33,6')
    expect(formatDecimal(0.05)).toBe('0,1')
    expect(formatDecimal(1.005, 'pt-BR', 2)).toBe('1,01')
  })

  it('honours the locale', () => {
    expect(formatDecimal(33.64, 'en')).toBe('33.6')
  })
})

describe('formatShare', () => {
  it('says a 0..1 share as a one-decimal percent', () => {
    expect(formatShare(0.3364)).toBe('33,6%')
    expect(formatShare(0.001)).toBe('0,1%')
    expect(formatShare(0.999)).toBe('99,9%')
    expect(formatShare(0)).toBe('0%')
  })

  it('honours the locale', () => {
    expect(formatShare(0.3364, 'en')).toBe('33.6%')
  })
})

describe('formatPoints', () => {
  it('adds the percent sign to a 0..100 number', () => {
    expect(formatPoints(33.6)).toBe('33,6%')
    expect(formatPoints(30)).toBe('30%')
    expect(formatPoints(0)).toBe('0%')
  })
})
