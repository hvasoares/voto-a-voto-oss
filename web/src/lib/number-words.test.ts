import { describe, expect, it } from 'vitest'
import { spell, spellPercent } from './number-words'

describe('spell', () => {
  it.each([
    [0, 'zero'], [1, 'um'], [11, 'onze'], [16, 'dezesseis'], [20, 'vinte'], [21, 'vinte e um'], [99, 'noventa e nove'],
    [100, 'cem'], [101, 'cento e um'], [110, 'cento e dez'], [200, 'duzentos'], [999, 'novecentos e noventa e nove'],
    [1000, 'mil'], [1001, 'mil e um'], [1100, 'mil e cem'], [1234, 'mil duzentos e trinta e quatro'], [2000, 'dois mil'],
    [10_500, 'dez mil e quinhentos'], [12_345, 'doze mil trezentos e quarenta e cinco'], [100_000, 'cem mil'], [101_000, 'cento e um mil'],
    [1_000_000, 'um milhão'], [2_000_000, 'dois milhões'], [2_000_200, 'dois milhões e duzentos'], [1_234_567, 'um milhão duzentos e trinta e quatro mil quinhentos e sessenta e sete'],
  ])('%i', (n, words) => expect(spell(n)).toBe(words))

  it('refuses what it cannot read out', () => {
    expect(() => spell(-1)).toThrow(RangeError)
    expect(() => spell(1.5)).toThrow(RangeError)
    expect(() => spell(1e9)).toThrow(RangeError)
  })

  it('never leaves a digit', () => {
    for (let n = 0; n < 5000; n += 7) expect(spell(n)).not.toMatch(/\d/)
  })
})

describe('spellPercent', () => {
  it.each([[33.6, 'trinta e três vírgula seis por cento'], [5, 'cinco por cento'], [100, 'cem por cento'], [0, 'zero por cento'], [0.04, 'zero por cento'], [12.25, 'doze vírgula três por cento']])('%f', (x, words) => expect(spellPercent(x)).toBe(words))
})
