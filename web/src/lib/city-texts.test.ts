import { describe, expect, it } from 'vitest'
import { buildCityResult } from '@/shared/city-model'
import { rawSentenceInput, sentenceInput } from '@/test/sentence-input'
import { radioBulletin, textProblems, whatsappText, WHATSAPP_LIMIT, type CityTextsInput } from './city-texts'
const input = (r: CityTextsInput['result'], o: Partial<CityTextsInput> = {}): CityTextsInput => ({
  result: r, cityName: 'Cidade Exemplo', ufLabel: 'RJ', url: 'https://voto-a-voto.com/rj/cidade-exemplo/', edition: { date: '2026-11-03' }, fixture: false, ano: 2026, turno: 2, ...o,
})
const CAUSE = /\b(porque|por causa|devido|culpa|protesto|vence|venceu|lidera|derrota|ganhou|perdeu|apático|desinteress)/i

const common = sentenceInput({ aptos: 100000, votos: [36400, 33600], turno: 2, comparecimento: 76600, nomes: ['Candidato A', 'Candidato B'] })

describe('WhatsApp block', () => {
  it('has the headline, the turnout numbers, the margin, the source line and the short link, one per line', () => {
    const lines = whatsappText(input(common)).split('\n')
    expect(lines[0]).toContain('Em Cidade Exemplo, no 2º turno de 2026')
    expect(lines[1]).toBe('Votaram 70.000 de 100.000 eleitores (70%). Não votaram 30.000 (30%).')
    expect(lines[2]).toContain('2.800 votos')
    expect(lines[3]).toBe('Fonte: TSE, dados finais. Edição de 3 de novembro de 2026.')
    expect(lines[4]).toBe('https://voto-a-voto.com/rj/cidade-exemplo/')
  })
  it('the fixture says its data is fictitious and does not cite an edition date as real', () => {
    expect(whatsappText(input(common, { fixture: true }))).toContain('Dados fictícios, só de exemplo. Fonte real: TSE.')
  })
  it('stays under the limit for a long name, a huge electorate and a tie', () => {
    const big = sentenceInput({ aptos: 9_000_000, votos: [3_100_000, 3_099_999], turno: 2, nomes: ['Maria das Graças Nascimento Albuquerque', 'José Carlos de Albuquerque Neto Filho'], comparecimento: 6_500_000 })
    const tie = sentenceInput({ aptos: 1000, votos: [300, 300], turno: 2, comparecimento: 700 })
    for (const r of [big, tie, common]) expect(whatsappText(input(r, { cityName: 'São Bernardo do Campo dos Alpes Altos' })).length).toBeLessThanOrEqual(WHATSAPP_LIMIT)
  })
  it('without data it says so, once, and still carries the source and the link', () => {
    const t = whatsappText(input(undefined)).split('\n')
    expect(t[0]).toMatch(/sem dados/i)
    expect(t.at(-1)).toContain('/rj/cidade-exemplo/')
    expect(t.length).toBe(3)
  })
  it('overseas posts read "no exterior"', () => {
    expect(whatsappText(input(common, { cityName: 'Lisboa', ufLabel: 'Exterior', overseas: true }))).toContain('No exterior, em Lisboa')
  })
  it('plain register changes the words, not the numbers', () => {
    const std = whatsappText(input(common))
    const plain = whatsappText(input(common, { register: 'plain' }))
    expect(plain).not.toBe(std)
    for (const n of ['70.000', '100.000', '30.000', '2.800']) expect(plain).toContain(n)
  })
  it('never gives a cause or a winner label', () => {
    expect(whatsappText(input(common))).not.toMatch(CAUSE)
    expect(whatsappText(input(common, { register: 'plain' }))).not.toMatch(CAUSE)
  })
})

describe('radio bulletin', () => {
  const text = radioBulletin(input(common))
  it('spells every number: no digit and no percent sign', () => {
    expect(text).not.toMatch(/\d/)
    expect(text).not.toContain('%')
    expect(text).toContain('Eram cem mil eleitores aptos a votar.')
    expect(text).toContain('setenta mil eleitores, ou seja, setenta por cento')
    expect(text).toContain('dois mil e oitocentos votos')
    expect(text).toContain('segundo turno de dois mil e vinte e seis')
    expect(text).toContain('edição de três de novembro de dois mil e vinte e seis')
  })
  it('is about 90 seconds long', () => {
    const words = text.split(/\s+/).length
    expect(words).toBeGreaterThanOrEqual(90)
    expect(words).toBeLessThanOrEqual(260)
    expect(textProblems(whatsappText(input(common)), text)).toEqual([])
  })
  it('says it is final data, not live, and what the numbers do not show', () => {
    expect(text).toContain('resultado final')
    expect(text).toContain('Não são dados ao vivo')
    expect(text).toContain('Os números não mostram por que as pessoas votaram ou deixaram de votar.')
  })
  it('reads both candidates and the rest of the first round the same way, without a label', () => {
    const r1 = sentenceInput({ aptos: 10000, votos: [3000, 2000, 500, 400], turno: 1, comparecimento: 6500, nomes: ['Ana', 'Beto', 'Caio', 'Dora'] })
    const t = radioBulletin(input(r1, { turno: 1 }))
    expect(t).toContain('Ana recebeu três mil votos, cinquenta vírgula oito por cento dos votos válidos. Beto recebeu dois mil votos, trinta e três vírgula nove por cento')
    expect(t).toContain('Os outros candidatos somaram novecentos votos, quinze vírgula três por cento')
  })
  it('a tie, a margin larger than the people who stayed home, and one vote', () => {
    expect(radioBulletin(input(sentenceInput({ aptos: 1000, votos: [300, 300], turno: 2, comparecimento: 700 })))).toContain('Os dois primeiros ficaram com o mesmo número de votos.')
    expect(radioBulletin(input(sentenceInput({ aptos: 1000, votos: [600, 100], turno: 2, comparecimento: 900 })))).toContain('é maior que o total de eleitores que não votaram')
    expect(radioBulletin(input(sentenceInput({ aptos: 1000, votos: [301, 300], turno: 2, comparecimento: 700 })))).toContain('foi de um voto.')
  })
  it('a name with a number is read in words', () => {
    const r = buildCityResult(
      rawSentenceInput({
        turno: 2,
        turnout: { aptos: 1000, comparecimento: 800, abstencoes: 200, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 800 },
        votes: [
          { ano: 2026, turno: 2, uf: 'rj', cdMunicipio: '1', candidatoNumero: 13, votos: 500 },
          { ano: 2026, turno: 2, uf: 'rj', cdMunicipio: '1', candidatoNumero: 22, votos: 300 },
        ],
        candidates: [],
      }),
    )
    const t = radioBulletin(input(r))
    expect(t).not.toMatch(/\d/)
    expect(t).toContain('O candidato número treze recebeu')
  })
  it('without data it says so and keeps the source', () => {
    const t = radioBulletin(input(undefined))
    expect(t).toContain('não tem dados do segundo turno de dois mil e vinte e seis')
    expect(textProblems('x', t, { hasData: false })).toEqual([])
  })
  it('the fixture says its data is fictitious', () => {
    expect(radioBulletin(input(common, { fixture: true }))).toContain('dados fictícios')
  })
  it('plain register: same numbers in words, no cause', () => {
    const p = radioBulletin(input(common, { register: 'plain' }))
    expect(p).toContain('setenta mil eleitores')
    expect(p).not.toMatch(/\d/)
    expect(p).not.toMatch(CAUSE)
    expect(text).not.toMatch(CAUSE)
  })
})

describe('textProblems (the build gate)', () => {
  it('flags a long block, a digit, a percent sign, a missing slot and a bulletin that is too short', () => {
    const p = textProblems('x'.repeat(WHATSAPP_LIMIT + 1), 'Votaram 5% {n}')
    expect(p.join('|')).toMatch(/too-long/)
    expect(p.join('|')).toMatch(/digits/)
    expect(p.join('|')).toMatch(/percent/)
    expect(p.join('|')).toMatch(/slot/)
    expect(p.join('|')).toMatch(/length/)
  })
})
