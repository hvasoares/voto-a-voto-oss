import { describe, expect, it } from 'vitest'
import { createStore } from './store'

const CITIES = 'uf,cd_municipio,cd_ibge,nome,slug,regiao,ciclos\nac,1007,1200138,BUJARI,bujari,norte,2018;2022;2026\nzz,29173,,KATMANDU,katmandu,exterior,2018;2022;2026\n'
const TURNOUT = 'ano,turno,uf,cd_municipio,aptos,comparecimento,abstencoes,brancos,nulos,anulados_apu_sep,validos\n2018,1,ac,1007,10,8,2,1,1,0,6\n'
const VOTES = 'ano,turno,uf,cd_municipio,candidato_numero,votos\n2018,1,ac,1007,13,6\n'
const store = createStore(async (f) => ({ 'cities.csv': CITIES, 'turnout.csv': TURNOUT, 'votes.csv': VOTES, 'candidates.csv': 'ano,turno,candidato_numero,nome_urna,partido\n', 'manifest.json': '{}' })[f])

describe('real schema: uf is lowercase everywhere (make-data)', () => {
  it('finds a city by lower- or upper-case uf', async () => {
    expect((await store.city('ac', 'bujari'))?.nome).toBe('BUJARI')
    expect((await store.city('AC', 'bujari'))?.nome).toBe('BUJARI')
  })
  it('stores uf lowercase', async () => {
    expect((await store.cities()).map((c) => c.uf)).toEqual(['ac', 'zz'])
  })
  it('lists states lowercase without the overseas post', async () => {
    expect((await store.states()).map((s) => s.uf)).toEqual(['ac'])
  })
  it('filters turnout and votes by uf in either case', async () => {
    expect(await store.turnout({ uf: 'AC', ano: 2018 })).toHaveLength(1)
    expect(await store.votes({ uf: 'ac' })).toHaveLength(1)
    expect((await store.citiesByUf('AC')).length).toBe(1)
  })
})
