import { describe, expect, it } from 'vitest'
import { candidateVotes, catalogText, cityCount, dec1, flips, placeLabel, turnoutRanking, votesChange, int, largestCity, marginPp, parseDataset, regions, shareText, signedDec1, signedInt, swingPp, turnoutSum, twoWayShare, wins } from './real-data-oracle'

/** Two states, three municipalities and one overseas post, with hand-countable rows. */
const ds = parseDataset({
  cities: ['uf,cd_municipio,cd_ibge,nome,slug,regiao,ciclos', 'aa,1,1100001,ALFA,alfa,norte,2022;2026', 'aa,2,1100002,BETA,beta,norte,2022;2026', 'bb,1,2200001,GAMA,gama,sul,2026', 'zz,9,,PORTO,porto,exterior,2026'].join('\n'),
  votes: [
    'ano,turno,uf,cd_municipio,candidato_numero,votos',
    '2026,1,aa,1,13,40', '2026,1,aa,1,22,60', '2026,2,aa,1,13,70', '2026,2,aa,1,22,30',
    '2026,2,aa,2,13,10', '2026,2,aa,2,22,10',
    '2026,2,bb,1,13,20', '2026,2,bb,1,22,80',
    '2026,2,zz,9,13,5', '2026,2,zz,9,22,1',
  ].join('\n'),
  turnout: [
    'ano,turno,uf,cd_municipio,aptos,comparecimento,abstencoes,brancos,nulos,anulados_apu_sep,validos',
    '2026,1,aa,1,150,110,40,6,4,0,100', '2026,2,aa,1,150,110,40,6,4,0,100', '2026,2,aa,2,40,25,15,3,2,0,20', '2026,2,bb,1,200,110,90,6,4,0,100', '2026,2,zz,9,10,8,2,1,1,0,6',
  ].join('\n'),
  candidates: ['ano,turno,candidato_numero,nome_urna,partido', '2026,2,13,LULA,PT', '2026,2,22,FLAVIO BOLSONARO,PL'].join('\n'),
})
const round = { ano: 2026, turno: 2 }

describe('the oracle counts the raw rows', () => {
  it('municipalities per state are the rows of cities.csv with that uf', () => {
    expect([cityCount('aa', ds), cityCount('bb', ds), cityCount(undefined, ds)]).toEqual([2, 1, 4])
  })

  it('the candidate votes are summed over the rows of the place asked for', () => {
    expect(candidateVotes(round, '13', { uf: 'aa' }, ds)).toBe(80)
    expect(candidateVotes(round, '13', { uf: 'aa', cd: '1' }, ds)).toBe(70)
    expect(candidateVotes(round, '22', { regiao: 'sul' }, ds)).toBe(80)
    expect(candidateVotes(round, '13', {}, ds)).toBe(105)
  })

  it('the turnout columns are summed over the rows, and the regions leave the overseas posts out', () => {
    expect(turnoutSum(round, { uf: 'aa' }, ds)).toEqual({ aptos: 190, comparecimento: 135, brancos: 9, nulos: 6, validos: 120 })
    expect(regions(ds)).toEqual(['norte', 'sul'])
  })

  it('the margin is a share of all valid votes of the round, and the swing is round 2 minus round 1', () => {
    expect(marginPp(round, '13', '22', { uf: 'bb' }, ds)).toBeCloseTo(-60)
    expect(marginPp(round, '13', '22', { uf: 'aa' }, ds)).toBeCloseTo((80 - 40) / 120 * 100)
    expect(marginPp({ ano: 2026, turno: 1 }, '13', '22', { uf: 'aa', cd: '1' }, ds)).toBeCloseTo(-20)
    expect(swingPp(2026, '13', '22', { uf: 'aa', cd: '1' }, ds)).toBeCloseTo(60)
  })

  it('the two-way share is taken between the two candidates only', () => {
    expect(twoWayShare(round, '13', '22', { uf: 'aa' }, ds)).toBeCloseTo(66.67, 1)
  })

  it('the largest city of a state has the most valid votes', () => {
    expect(largestCity('aa', round, ds).slug).toBe('alfa')
  })

  it('wins count the municipalities (overseas posts left out) and flips need the round-1 order to change', () => {
    expect(wins(round, '13', '22', ds)).toEqual({ a: 1, tie: 1, b: 1 })
    expect(flips(2026, '13', '22', 0, ds).map((r) => r.city.slug)).toEqual(['alfa'])
    expect(flips(2026, '22', '13', 0, ds)).toEqual([])
    expect(flips(2026, '13', '22', 101, ds)).toEqual([])
  })

  it('the vote change of a candidate lists the cities present in both rounds, biggest gain first', () => {
    const change = votesChange('13', round, { ano: 2026, turno: 1 }, ds)
    expect(change.rows.map((r) => [r.city.slug, r.diff])).toEqual([['alfa', 30]])
    expect(change).toMatchObject({ total: 30, gained: 1, lost: 0, unchanged: 0 })
  })

  it('the turnout ranking keeps cities with enough eligible voters and puts the highest rate first', () => {
    expect(turnoutRanking(round, 100, ds).map((r) => [placeLabel(r.city), Math.round(r.rate)])).toEqual([['ALFA/AA', 73], ['GAMA/BB', 55]])
    expect(turnoutRanking(round, 0, ds)).toHaveLength(3)
  })
})

describe('the display functions', () => {
  it.each([
    [26258452, '26.258.452'],
    [999, '999'],
    [0, '0'],
  ])('int(%d) is %s', (n, text) => expect(int(n)).toBe(text))

  it.each([
    [186433, '+186.433'],
    [-2403, '-2.403'],
    [0, '0'],
  ])('signedInt(%d) is %s', (n, text) => expect(signedInt(n)).toBe(text))

  it.each([
    [46.15, '46,2'],
    [90.5, '90,5'],
    [0, '0,0'],
  ])('dec1(%d) is %s', (x, text) => expect(dec1(x)).toBe(text))

  it.each([
    [-7.69, '-7,7'],
    [0.94, '+0,9'],
    [0, '+0,0'],
  ])('signedDec1(%d) is %s', (x, text) => expect(signedDec1(x)).toBe(text))

  it('the shares of the parts add to 100 by the largest-remainder rule', () => {
    expect([0, 1, 2].map((i) => shareText([1, 1, 1], i))).toEqual(['33,4', '33,3', '33,3'])
    expect([0, 1].map((i) => shareText([64256232, 59826041], i, 2))).toEqual(['51,79', '48,21'])
    expect(shareText([1, 3], 0, 0)).toBe('25')
  })
})

describe('catalogText takes the sentence of the catalog', () => {
  it('fills the slots of a template and picks the plural form by count', () => {
    expect(catalogText('brasil.regionShare', { p: '41,1' })).toBe('41,1% dos votos válidos do país')
    expect(catalogText('stayhome.open')).toBe('Abrir estado')
  })
})
