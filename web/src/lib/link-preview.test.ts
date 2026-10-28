/**
 * The head contract of a city page (ticket #8): what the tags say and where the preview image lives. Every
 * figure in the wording has to be a number of the city's own result — locked here with a synthetic result
 * built the same way the card builds one (buildCityResult).
 */
import { describe, expect, it } from 'vitest'
import { buildCityResult, type CityResult } from '../shared/city-model'
import { SHARE_CARD_SIZE } from './share-card'
import { headline } from './sentences/headline'
import {
  PREVIEW_HEIGHT,
  PREVIEW_WIDTH,
  previewDescription,
  previewHead,
  previewPath,
  previewSvg,
  previewUrl,
} from './link-preview'

const turnout = {
  ano: 2026, turno: 2 as const, uf: 'rj', cdMunicipio: '1',
  aptos: 50000, comparecimento: 35000, abstencoes: 15000, brancos: 1800, nulos: 1900, anuladosApuSep: 300, validos: 31300,
}
const votes = [
  { ano: 2026, turno: 2 as const, uf: 'rj', cdMunicipio: '1', candidatoNumero: 10, votos: 16700 },
  { ano: 2026, turno: 2 as const, uf: 'rj', cdMunicipio: '1', candidatoNumero: 20, votos: 14600 },
]
const candidates = [
  { ano: 2026, turno: 2 as const, candidatoNumero: 10, nomeUrna: 'CANDIDATO A', partido: 'PT' },
  { ano: 2026, turno: 2 as const, candidatoNumero: 20, nomeUrna: 'CANDIDATO B', partido: 'PSD' },
]
const result = buildCityResult({ turnout, votes, candidates })
const city = { uf: 'rj', slug: 'cidade-exemplo', nome: 'CIDADE EXEMPLO' }
const opts = { origin: 'https://votoavoto.org.br', base: '/voto-a-voto/' } as const

describe('preview image path and url', () => {
  it('the path is preview/<uf>/<slug>.png (slugs are unique within each UF, so paths never collide)', () => {
    expect(previewPath('rj', 'cidade-exemplo')).toBe('preview/rj/cidade-exemplo.png')
    expect(previewPath('xx', 'sao-paulo')).toBe('preview/xx/sao-paulo.png')
  })

  it('the url is absolute and carries the base (og:image is fetched by the crawler)', () => {
    expect(previewUrl('https://votoavoto.org.br', '/voto-a-voto/', 'rj', 'cidade-exemplo')).toBe('https://votoavoto.org.br/voto-a-voto/preview/rj/cidade-exemplo.png')
    expect(previewUrl('https://votoavoto.org.br', '/', 'rj', 'cidade-exemplo')).toBe('https://votoavoto.org.br/preview/rj/cidade-exemplo.png')
    // a relative base without the trailing slash is normalised the same way every other link is
    expect(previewUrl('https://votoavoto.org.br', 'voto-a-voto/', 'rj', 'cidade-exemplo')).toBe('https://votoavoto.org.br/voto-a-voto/preview/rj/cidade-exemplo.png')
  })
})

describe('the head of a city with data', () => {
  const head = previewHead(city, result, opts)

  it('title and og:title name the city, its UF and the result cycle; the title carries the brand', () => {
    expect(head.title).toBe('Cidade Exemplo (RJ): resultado das eleições de 2026 · Voto a Voto')
    expect(head.ogTitle).toBe('Cidade Exemplo (RJ): resultado das eleições de 2026')
  })

  it('the description is one sentence of the result, every figure from the dataset, nothing invented', () => {
    expect(head.description).toBe('Resultado de Cidade Exemplo (RJ), 2026, 2º turno: votaram 63% do eleitorado; dos votos válidos, Candidato A recebeu 53% e Candidato B 47%.')
  })

  it('og:url is the page itself (origin and base)', () => {
    expect(head.url).toBe('https://votoavoto.org.br/voto-a-voto/rj/cidade-exemplo/')
  })

  it('og:image points at the preview raster of THIS city, sized at the constant, with the svg title as alt', () => {
    expect(head.image?.url).toBe(previewUrl(opts.origin, opts.base, 'rj', 'cidade-exemplo'))
    expect(head.image?.type).toBe('image/png')
    expect(head.image?.width).toBe(PREVIEW_WIDTH)
    expect(head.image?.height).toBe(PREVIEW_HEIGHT)
    expect(head.image?.alt).toBe(headline(result, { cityName: 'Cidade Exemplo' }))
    expect(head.image?.alt).toMatch(/^Em Cidade Exemplo, no 2º turno de 2026, 37,4% do eleitorado não votou/)
  })

  it('the svg the build rasterises is the SAME drawing the share sheet inlines, at the preview display size', () => {
    const svg = previewSvg(result, city, opts)
    expect(svg).toContain(`<svg xmlns="http://www.w3.org/2000/svg" width="${PREVIEW_WIDTH}" height="${PREVIEW_HEIGHT}"`)
    expect(svg).toContain(`viewBox="0 0 ${SHARE_CARD_SIZE.width} ${SHARE_CARD_SIZE.height}"`)
    expect(svg).toContain('Cidade Exemplo') // the drawing carries the city name
    expect(svg).not.toContain('>EXEMPLO<') // not fictitious: no EXEMPLO tag without the fixture flag
  })

  it('a long runner-up name is wrapped in the preview drawing, never cut (#85)', () => {
    const long = buildCityResult({ turnout, votes, candidates: candidates.map((c, i) => (i ? { ...c, nomeUrna: 'FLAVIO BOLSONARO' } : c)) })
    const svg = previewSvg(long, city, opts)
    expect(svg).not.toContain('…')
    expect(svg).toContain('>Bolsonaro 47%<')
  })

  it('fixture data says so in the description and in the drawing (the EXEMPLO tag)', () => {
    const fixture = previewHead(city, result, { ...opts, fixture: true })
    expect(fixture.description).toContain('Dados fictícios (EXEMPLO).')
    expect(previewSvg(result, city, { ...opts, fixture: true })).toContain('>EXEMPLO<')
  })
})

describe('the head of edge-case cities', () => {
  it('a round with no valid vote describes the turnout only', () => {
    const noVotesResult = buildCityResult({ turnout: { ...turnout, nulos: 31800, validos: 0, comparecimento: 35000, brancos: 1800, anuladosApuSep: 1400 }, votes: [], candidates })
    const noVotes = previewHead(city, noVotesResult, opts)
    expect(noVotes.title).toBe('Cidade Exemplo (RJ): resultado das eleições de 2026 · Voto a Voto')
    expect(noVotes.description).toBe('Resultado de Cidade Exemplo (RJ), 2026, 2º turno: nenhum voto válido; 100% do eleitorado não votou.')
    expect(previewDescription(noVotesResult, city)).toBe(noVotes.description)
  })

  it('a city with no electorate at all says so and tags no result figures', () => {
    const head = previewHead(city, buildCityResult({ turnout: { ...turnout, aptos: 0, comparecimento: 0, abstencoes: 0, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 0 }, votes: [], candidates }), opts)
    expect(head.description).toBe('Resultado de Cidade Exemplo (RJ), 2026, 2º turno: sem eleitores aptos registrados.')
  })

  it('a city the dataset has no result for (the card is "sem dados") gets a page head without og:image', () => {
    const head = previewHead(city, undefined, opts)
    expect(head.title).toBe('Cidade Exemplo (RJ): resultados das eleições · Voto a Voto')
    expect(head.ogTitle).toBe('Cidade Exemplo (RJ): resultados das eleições')
    expect(head.description).toBe('Resultado de Cidade Exemplo (RJ): o arquivo do TSE não traz votação para os ciclos do site.')
    expect(head.image).toBeUndefined()
  })

  it('overseas posts read "Exterior" as their UF', () => {
    const head = previewHead({ uf: 'zz', slug: 'exterior-exemplo', nome: 'EXTERIOR (POSTO EXEMPLO)' }, undefined, opts)
    expect(head.title).toBe('Exterior (posto Exemplo) (Exterior): resultados das eleições · Voto a Voto')
  })
})