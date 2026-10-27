import { describe, expect, it } from 'vitest'
import type { Candidate, Turnout, Vote } from '@site/data'
import { buildCityResult, type CityResult } from '@site/shared/city-model'
import { shareText, shortAddress } from './share-text'

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
  it('round 2: both candidates with their shares of the valid votes, the non-voters, then the link', () => {
    const txt = shareText(two, { cityName: 'Cidade Teste', ufLabel: 'RJ', url: 'https://votoavoto.exemplo.br/rj/cidade-teste/' })
    expect(txt).toBe(`Resultado de Cidade Teste/RJ, 2026, 2º turno: Ana Souza ${two.voted[0]!.pct}% · Bruno Lima ${two.voted[1]!.pct}% dos votos válidos; ${two.notVotedPct}% do eleitorado não votou. https://votoavoto.exemplo.br/rj/cidade-teste/`)
  })

  it('round 1: the two leaders plus "outros"', () => {
    const r = result({ turno: 1 }, [[13, 300], [22, 250], [30, 100], [40, 60]])
    const txt = shareText(r, { cityName: 'Cidade Teste', ufLabel: 'RJ', url: 'https://x.br/rj/a/' })
    expect(txt).toContain('1º turno: Ana Souza')
    expect(txt).toMatch(/Bruno Lima \d+% · outros \d+% dos votos válidos/)
    expect(txt.endsWith(' https://x.br/rj/a/')).toBe(true)
  })

  it('treats the candidates the same way whoever leads', () => {
    const a = shareText(result({}, [[13, 450], [22, 300]]), { cityName: 'X', ufLabel: 'RJ', url: 'u' })
    const b = shareText(result({}, [[13, 300], [22, 450]]), { cityName: 'X', ufLabel: 'RJ', url: 'u' })
    const shape = (t: string) => t.replace(/Ana Souza|Bruno Lima/g, 'N').replace(/\d+/g, '#')
    expect(shape(a)).toBe(shape(b))
  })

  it('zero turnout and no electorate have their own neutral sentence', () => {
    const none = result({ aptos: 400, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0 }, [[13, 0], [22, 0]])
    expect(shareText(none, { cityName: 'X', ufLabel: 'Exterior', url: 'u' })).toBe('Resultado de X/Exterior, 2026, 2º turno: nenhum voto válido; 100% do eleitorado não votou. u')
    const empty = result({ aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, validos: 0 }, [])
    expect(shareText(empty, { cityName: 'X', ufLabel: 'RJ', url: 'u' })).toBe('Resultado de X/RJ, 2026, 2º turno: sem eleitores aptos registrados. u')
  })

  it('a single candidate with votes', () => {
    const one = result({}, [[13, 750]])
    expect(shareText(one, { cityName: 'X', ufLabel: 'RJ', url: 'u' })).toContain('Ana Souza 100% dos votos válidos')
  })

  it('over the fixture city: the sentence matches the numbers of the city card', async () => {
    const { createNodeStore } = await import('@site/data/node')
    const { loadCityResult } = await import('@site/shared/city-figures')
    const { dataDir } = await import('./data-dir')
    const data = createNodeStore(dataDir())
    const city = (await data.city('rj', 'cidade-exemplo'))!
    const r = (await loadCityResult(data, city, 2026, 1))!
    expect(shareText(r, { cityName: 'Cidade Exemplo', ufLabel: 'RJ', url: 'https://votoavoto.exemplo.br/rj/cidade-exemplo/' })).toBe(
      'Resultado de Cidade Exemplo/RJ, 2026, 1º turno: Candidato A 52% · Candidato B 48% dos votos válidos; 30% do eleitorado não votou. https://votoavoto.exemplo.br/rj/cidade-exemplo/',
    )
  })

  it('is a plain single line, fits a WhatsApp message and keeps only simple characters in its own words', () => {
    const txt = shareText(two, { cityName: 'São João d’Aliança', ufLabel: 'GO', url: 'https://votoavoto.exemplo.br/go/sao-joao/' })
    expect(txt).not.toMatch(/[\n\r\t]/)
    expect(txt.length).toBeLessThanOrEqual(600)
    expect(txt).not.toMatch(/</)
  })
})