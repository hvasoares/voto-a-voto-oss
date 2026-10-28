import { describe, expect, it } from 'vitest'
import { ARC_KINDS } from './arcs'
import { guessContent, guessResult } from './guess-card'
import { questionOf } from './question'
import { buildCityResult } from '@/shared/city-model'
import { shareContent } from './share-model'
import { textWidth } from './share-card'

const o = { origin: 'https://votoavoto.exemplo.br', base: '/', fixture: true }
const city = { uf: 'rj', slug: 'cidade-exemplo', nome: 'Cidade Exemplo' }
const switched = questionOf({ kind: 'switched2022' }, false)
const text = (svg: string) => [...svg.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((m) => m[1]!)

describe('the guess card', () => {
  it('a right guess says it matched, with the city, the question, the answer and the short link', () => {
    const c = guessContent(switched, 'yes', city, o)
    expect(text(c.svg).join(' ')).toContain('Cidade Exemplo mudou de lado em 2022?')
    expect(text(c.svg)).toEqual(expect.arrayContaining(['Cidade Exemplo', 'Palpite certo: Sim', 'Resposta: Sim · Mudou de lado em 2022', 'votoavoto.exemplo.br/rj/cidade-exemplo']))
    expect(c.text).toBe('Cidade Exemplo mudou de lado em 2022? Palpite: Sim. Resposta: Sim. O palpite estava certo. https://votoavoto.exemplo.br/rj/cidade-exemplo/')
    expect(c.address).toBe('votoavoto.exemplo.br/rj/cidade-exemplo')
  })
  it('a wrong guess says it did not match', () => {
    const c = guessContent(switched, 'no', city, o)
    expect(text(c.svg)).toContain('Palpite errado: Não')
    expect(c.variants.standard.alt).toContain('O palpite estava errado.')
    expect(guessResult(questionOf({ kind: 'same' }, false), 'no')).toBe('Palpite: Não. Resposta: Não. O palpite estava certo.')
  })
  it('has a text alternative that carries the question, the result and the answer, in both registers', () => {
    const c = guessContent(switched, 'yes', city, o)
    expect(c.svg).toContain('<title>Cidade Exemplo mudou de lado em 2022? Palpite: Sim. Resposta: Sim. O palpite estava certo. Mudou de lado em 2022.</title>')
    expect(c.variants.plain.alt).toBe('Em Cidade Exemplo, o lado com mais votos no 2º turno mudou em 2022? Palpite: Sim. Resposta: Sim. O palpite estava certo. Em 2022, o lado com mais votos no 2º turno mudou.')
  })
  it('the normal card never shows a guess, and the guess card never shows the bars', () => {
    const result = buildCityResult({
      turnout: { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 900, abstencoes: 100, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 900 },
      votes: [1, 2].map((n, i) => ({ ano: 2026, turno: 1 as const, uf: 'rj', cdMunicipio: '1', candidatoNumero: n, votos: 500 - i * 100 })),
      candidates: [1, 2].map((n) => ({ ano: 2026, turno: 1 as const, candidatoNumero: n, nomeUrna: `C${n}`, partido: 'P' })),
    })
    const normal = shareContent(result, city, o)
    expect(normal.svg).not.toMatch(/Palpite|Resposta/)
    expect(guessContent(switched, 'yes', city, o).svg).not.toMatch(/Votaram|Não votaram/)
  })
  it('the same short link as the normal card', () => {
    const result = buildCityResult({
      turnout: { ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', aptos: 10, comparecimento: 9, abstencoes: 1, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 9 },
      votes: [{ ano: 2026, turno: 1, uf: 'rj', cdMunicipio: '1', candidatoNumero: 1, votos: 9 }],
      candidates: [{ ano: 2026, turno: 1 as const, candidatoNumero: 1, nomeUrna: 'C1', partido: 'P' }],
    })
    const normal = shareContent(result, city, o)
    const guess = guessContent(switched, 'yes', city, o)
    expect({ url: guess.url, address: guess.address }).toEqual({ url: normal.url, address: normal.address })
  })
  it('fits the chat preview: every line of every question, in any arc, overseas too, stays inside the card and is not cut', () => {
    for (const overseas of [false, true])
      for (const kind of ARC_KINDS)
        for (const nome of ['Cidade Exemplo', 'São José do Rio Preto da Barra Grande do Sul']) {
          const q = questionOf({ kind, years: [2018, 2022] }, overseas)
          for (const guess of ['yes', 'no'] as const) {
            const c = guessContent(q, guess, { ...city, nome }, o)
            const lines = text(c.svg)
            expect(lines.some((l) => l.includes('…'))).toBe(false)
            for (const l of lines) expect(textWidth(l, 34)).toBeLessThanOrEqual(900 + 40)
          }
        }
  })
  it('the file is named for the guess, in ASCII', () => {
    expect(guessContent(switched, 'yes', city, o).filename).toBe('voto-a-voto-rj-cidade-exemplo-palpite.png')
  })
})
