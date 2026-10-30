import { describe, expect, it } from 'vitest'
import { template } from './catalog'
import './catalog-headline'
import './catalog-margin'
import './catalog-facts'
import { catalogSubset, drawPhrase, phrase, phraseKeys, phraseWord, subsetTemplate } from './phrase'

const voice = (register: 'standard' | 'plain') => ({ locale: 'pt-BR' as const, register })

describe('drawing a phrase', () => {
  it('fills the slots of the key in the register asked', () => {
    const part = phrase('fact.out.where.uf', { name: 'Rio de Janeiro' })
    expect(drawPhrase(part, voice('standard'), template)).toBe(drawPhrase(phrase('fact.out.where.uf', { name: 'Rio de Janeiro' }), voice('standard'), template))
    expect(drawPhrase(part, voice('plain'), template)).toContain('Rio de Janeiro')
  })

  it('draws a phrase held in a slot in the same register as the sentence around it', () => {
    const part = phrase('fact.count.outliers', { where: phrase('fact.out.where.all'), min: '1.000', n: '3' })
    for (const register of ['standard', 'plain'] as const) {
      const inner = drawPhrase(phrase('fact.out.where.all'), voice(register), template)
      expect(drawPhrase(part, voice(register), template)).toContain(inner)
    }
  })

  it('picks the plural form from the count, with zero as "other"', () => {
    const one = drawPhrase(phrase('votes.count', { n: '1' }, 1), voice('standard'), template)
    const many = drawPhrase(phrase('votes.count', { n: '2' }, 2), voice('standard'), template)
    const none = drawPhrase(phrase('votes.count', { n: '0' }, 0), voice('standard'), template)
    expect(one).not.toBe(many)
    expect(none.replace('0', '2')).toBe(many)
  })

  it('writes a list one part after the other and picks a word of a "a|b|c" template, or the position when there is none', () => {
    expect(drawPhrase(['a', 1, ['b', 'c']], voice('standard'), template)).toBe('a1bc')
    expect(drawPhrase(phraseWord('numberWords', 2), voice('standard'), template)).toBe(template(voice('standard'), 'numberWords').split('|')[2])
    expect(drawPhrase(phraseWord('numberWords', 999), voice('standard'), template)).toBe('999')
  })

  it('is data: it survives JSON and draws the same', () => {
    const part = [phrase('margin.gap', { n: '640' }, 640), phrase('margin.fits', { times: '49', m: '31.566' }, 49)]
    expect(drawPhrase(JSON.parse(JSON.stringify(part)), voice('plain'), template)).toBe(drawPhrase(part, voice('plain'), template))
  })
})

describe('the subset of the catalog', () => {
  const part = [phrase('margin.gap', { n: '640' }, 640), phrase('fact.count.outliers', { where: phrase('fact.out.where.all'), min: '1', n: '2' })]

  it('names every key asked for, a plural key in both forms and a nested one too', () => {
    expect([...phraseKeys(part)].sort()).toEqual(['fact.count.outliers', 'fact.out.where.all', 'margin.gap.one', 'margin.gap.other'])
  })

  it('draws the same as the whole catalog, in both registers, from nothing else', () => {
    const subset = catalogSubset([part], 'pt-BR', template)
    expect(Object.keys(subset.standard)).toEqual(Object.keys(subset.plain))
    for (const register of ['standard', 'plain'] as const) expect(drawPhrase(part, voice(register), subsetTemplate(subset))).toBe(drawPhrase(part, voice(register), template))
  })
})
