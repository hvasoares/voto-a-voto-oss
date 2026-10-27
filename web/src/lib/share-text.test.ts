import { describe, expect, it } from 'vitest'
import type { Candidate, Turnout, Vote } from '@/data'
import { buildCityResult, type CityResult } from '@/shared/city-model'
import { shareText, shortAddress } from './share-text'
import { headline } from './sentences/headline'
import { marginLine } from './sentences/margin'

const turnout = (o: Partial<Turnout> = {}): Turnout => ({ ano: 2026, turno: 2, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 20, nulos: 30, anuladosApuSep: 0, validos: 750, ...o })
const cand = (numero: number, nome: string, turno: 1 | 2 = 2): Candidate => ({ ano: 2026, turno, candidatoNumero: numero, nomeUrna: nome, partido: 'X' })
const vote = (numero: number, votos: number, turno: 1 | 2 = 2): Vote => ({ ano: 2026, turno, uf: 'rj', cdMunicipio: '1', candidatoNumero: numero, votos })
const result = (t: Partial<Turnout>, votes: [number, number][], names: string[] = ['Ana Souza', 'Bruno Lima', 'Carla', 'Dario', 'Eva']): CityResult => {
  const turno = (t.turno ?? 2) as 1 | 2
  return buildCityResult({ turnout: turnout(t), votes: votes.map(([n, v]) => vote(n, v, turno)), candidates: votes.map(([n], i) => cand(n, names[i]!, turno)) })
}

const two = result({}, [[13, 450], [22, 300]])

describe('shortAddress', () => {
  it('drops the scheme and any trailing slash, keeps the base path', () => {
    expect(shortAddress('https://votoavoto.exemplo.br/rj/cidade-exemplo/')).toBe('votoavoto.exemplo.br/rj/cidade-exemplo')
    expect(shortAddress('http://x.github.io/voto-a-voto/rj/a/')).toBe('x.github.io/voto-a-voto/rj/a')
  })
})

describe('shareText', () => {
  const url = 'https://votoavoto.exemplo.br/rj/cidade-teste/'

  it('is the card headline, the margin line and the link', () => {
    const txt = shareText(two, { cityName: 'Cidade Teste', url })
    expect(txt).toBe(`${headline(two, { cityName: 'Cidade Teste' })} ${marginLine(two, { cityName: 'Cidade Teste' })} ${url}`)
    expect(txt).toContain('Faltaram 150 votos para virar')
    expect(txt).toMatch(/^Em Cidade Teste, no 2º turno de 2026, \d+(,\d)?% do eleitorado não votou/)
  })

  it('treats the candidates the same way whoever leads', () => {
    const a = shareText(result({}, [[13, 450], [22, 300]]), { cityName: 'X', url: 'u' })
    const b = shareText(result({}, [[13, 300], [22, 450]]), { cityName: 'X', url: 'u' })
    const shape = (t: string) => t.replace(/Ana Souza|Bruno Lima/g, 'N').replace(/\d+/g, '#')
    expect(shape(a)).toBe(shape(b))
  })

  it('a round with nothing to turn has no margin line: the text is the headline and the link', () => {
    const one = result({ aptos: 1000, comparecimento: 500, validos: 500 }, [[13, 500]])
    expect(shareText(one, { cityName: 'X', url: 'u' })).toBe(`${headline(one, { cityName: 'X' })} u`)
  })

  it('zero turnout and no electorate have their own neutral sentence', () => {
    const none = result({ aptos: 400, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0 }, [[13, 0], [22, 0]])
    expect(shareText(none, { cityName: 'X', url: 'u' })).toBe('Em X, no 2º turno de 2026, nenhum dos 400 eleitores aptos compareceu. u')
    const empty = result({ aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0 }, [])
    expect(shareText(empty, { cityName: 'X', url: 'u' })).toBe('Em X, no 2º turno de 2026, não há eleitores aptos registrados. u')
  })

  it('a tie is a tie', () => {
    expect(shareText(result({ aptos: 1000, comparecimento: 600, validos: 600 }, [[13, 300], [22, 300]]), { cityName: 'X', url: 'u' })).toContain('Ana Souza e Bruno Lima empataram na frente, com 30% do eleitorado cada um')
  })

  it('an overseas post says "no exterior"', () => {
    expect(shareText(two, { cityName: 'Katmandu', overseas: true, url: 'u' })).toMatch(/^No exterior, em Katmandu, no 2º turno de 2026, /)
  })

  it('over the fixture city: the sentence matches the numbers of the city card', async () => {
    const { loadCityResult } = await import('./shard-files')
    const r = (await loadCityResult('rj', 'cidade-exemplo', 2026, 1))!
    expect(shareText(r, { cityName: 'Cidade Exemplo', url })).toBe(`Em Cidade Exemplo, no 1º turno de 2026, 30% do eleitorado não votou, quase tanto quanto o Candidato B recebeu (33,6%). Faltaram 2.800 votos para virar: cabem 10 vezes nos 30.000 que não votaram. ${url}`)
  })

  it('is a plain single line, fits a WhatsApp message and keeps only simple characters in its own words', () => {
    const txt = shareText(two, { cityName: 'São João d’Aliança', url: 'https://votoavoto.exemplo.br/go/sao-joao/' })
    expect(txt).not.toMatch(/[\n\r\t]/)
    expect(txt.length).toBeLessThanOrEqual(600)
    expect(txt).not.toMatch(/</)
  })
})
