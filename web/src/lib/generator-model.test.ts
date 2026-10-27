import { describe, expect, it } from 'vitest'
import { choiceQuery, DEFAULT_CHOICE, parseChoice, statFilename } from './generator-model'

describe('the generator address', () => {
  it('round-trips a full choice', () => {
    const c = { city: { uf: 'rj', slug: 'cidade-exemplo' }, measure: 'margin', size: 'story' } as const
    expect(choiceQuery(c)).toBe('?cidade=rj/cidade-exemplo&medida=margem&tamanho=story')
    expect(parseChoice(choiceQuery(c))).toEqual(c)
  })
  it('leaves the defaults out and asks nothing when nothing is chosen', () => {
    expect(choiceQuery({ ...DEFAULT_CHOICE })).toBe('')
    expect(choiceQuery({ city: { uf: 'sp', slug: 'x' }, ...DEFAULT_CHOICE })).toBe('?cidade=sp/x')
  })
  it('anything unknown falls back to the defaults without throwing', () => {
    expect(parseChoice('?cidade=../../etc&medida=lixo&tamanho=enorme')).toEqual({ city: undefined, ...DEFAULT_CHOICE })
    expect(parseChoice('')).toEqual({ city: undefined, ...DEFAULT_CHOICE })
    expect(parseChoice('?cidade=RJ/Cidade')).toEqual({ city: undefined, ...DEFAULT_CHOICE })
  })
  it('names the file by city, measure, view and size, ASCII only', () => {
    expect(statFilename({ uf: 'rj', slug: 'cidade-exemplo' }, 'nonVoters', { ano: 2026, turno: 1 }, 'square')).toBe('voto-a-voto-rj-cidade-exemplo-nao-votou-2026-turno-1-quadrado.png')
    expect(statFilename({ uf: 'rj', slug: 'a' }, 'turnout', { ano: 2022, turno: 2 }, 'preview', 'svg')).toBe('voto-a-voto-rj-a-comparecimento-2022-turno-2-previa.svg')
  })
})
