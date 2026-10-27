import { describe, expect, it } from 'vitest'
import { formatDecimal, formatFixedPct, formatInt, formatSignedDecimal, formatSignedInt, formatSignedPp } from './format'

describe('report formatters', () => {
  it('one fixed decimal with the pt-BR comma, trailing ",0" kept', () => {
    expect(formatDecimal(-4.5275)).toBe('-4,5')
    expect(formatDecimal(4.9737)).toBe('5,0')
    expect(formatDecimal(34.0)).toBe('34,0')
    expect(formatDecimal(0)).toBe('0,0')
    expect(formatDecimal(90.4615)).toBe('90,5')
    expect(formatDecimal(58.99)).toBe('59,0')
  })

  it('signed pp figures carry the + only when positive (São Vicente +0,7, Itabirito -4,5)', () => {
    expect(formatSignedDecimal(0.7498)).toBe('+0,7')
    expect(formatSignedDecimal(-7.6773)).toBe('-7,7')
    expect(formatSignedDecimal(0)).toBe('0,0')
    expect(formatSignedPp(9.8201)).toBe('+9,8 pp')
    expect(formatSignedPp(-0.1451)).toBe('-0,1 pp')
  })

  it('integers use the pt-BR thousands dot; signed integers keep 0 unsigned', () => {
    expect(formatInt(34159)).toBe('34.159')
    expect(formatInt(1234567)).toBe('1.234.567')
    expect(formatInt(0)).toBe('0')
    expect(formatSignedInt(3862039)).toBe('+3.862.039')
    expect(formatSignedInt(-1591101)).toBe('-1.591.101')
    expect(formatSignedInt(0)).toBe('0')
  })

  it('percentages with one fixed decimal', () => {
    expect(formatFixedPct(90.4615)).toBe('90,5%')
    expect(formatFixedPct(58.99)).toBe('59,0%')
  })
})