import { describe, expect, it } from 'vitest'
import { parseCities, parseCsv, parseTurnout, SchemaError } from './csv'
import { createNodeStore, dataDir } from './node'
import { createStore } from './store'
import { resolve } from 'node:path'

const store = createNodeStore(resolve(__dirname, '../../fixtures/data'))

describe('parseCsv', () => {
  it('handles quotes, doubled quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x,y","he said ""hi"""\n')).toEqual([['a', 'b'], ['x,y', 'he said "hi"']])
  })
})

describe('schema guard', () => {
  it('fails loudly naming the file and the missing column', () => {
    expect(() => parseCities('uf,nome\nRJ,X\n')).toThrow(SchemaError)
    expect(() => parseCities('uf,nome\nRJ,X\n')).toThrow(/cities\.csv: missing column\(s\) cd_municipio/)
  })
  it('rejects a non-integer count', () => {
    const header = 'ano,turno,uf,cd_municipio,aptos,comparecimento,abstencoes,brancos,nulos,anulados_apu_sep,validos'
    expect(() => parseTurnout(`${header}\n2026,1,RJ,1,x,1,1,1,1,1,1\n`)).toThrow(/aptos is not an integer/)
  })
})

describe('fixture dataset through the DataStore', () => {
  it('has a 2026-only city, an overseas post and all-three-cycle cities', async () => {
    const cities = await store.cities()
    expect(cities.find((c) => c.slug === 'boa-esperanca-do-norte')?.ciclos).toEqual([2026])
    expect(cities.find((c) => c.uf === 'ZZ')).toBeDefined()
    expect(cities.filter((c) => c.ciclos.length === 3).length).toBeGreaterThanOrEqual(3)
  })

  it('looks a city up by lower-case uf and slug', async () => {
    expect((await store.city('rj', 'cidade-exemplo'))?.nome).toBe('Cidade Exemplo')
    expect(await store.city('rj', 'nao-existe')).toBeUndefined()
  })

  it('lists states without the overseas post', async () => {
    const states = await store.states()
    expect(states.map((s) => s.uf)).toEqual(['MT', 'RJ', 'SP'])
    expect(states.find((s) => s.uf === 'RJ')?.municipios).toBe(6)
  })

  it('turnout rows satisfy the dataset identities for every row', async () => {
    for (const t of await store.turnout()) {
      expect(t.comparecimento + t.abstencoes).toBe(t.aptos)
      expect(t.validos + t.brancos + t.nulos + t.anuladosApuSep).toBe(t.comparecimento)
    }
  })

  it('votes of every city/round add up to its valid votes', async () => {
    for (const t of await store.turnout()) {
      const votes = await store.votes({ ano: t.ano, turno: t.turno, uf: t.uf, cdMunicipio: t.cdMunicipio })
      expect(votes.reduce((s, v) => s + v.votos, 0)).toBe(t.validos)
    }
  })

  it('reproduces the figures drawn in the Sketch city card (Cidade Exemplo, 2026, 1o turno)', async () => {
    const c = (await store.city('rj', 'cidade-exemplo'))!
    const [t] = await store.turnout({ ano: 2026, turno: 1, uf: c.uf, cdMunicipio: c.cdMunicipio })
    expect(t).toMatchObject({ aptos: 100000, validos: 70000, abstencoes: 23400, brancos: 3000, nulos: 3600 })
    const votes = await store.votes({ ano: 2026, turno: 1, uf: c.uf, cdMunicipio: c.cdMunicipio })
    expect(votes.map((v) => v.votos).sort()).toEqual([33600, 36400])
  })

  it('every vote refers to a known candidate', async () => {
    const known = new Set((await store.candidates()).map((c) => `${c.ano}-${c.turno}-${c.candidatoNumero}`))
    for (const v of await store.votes()) expect(known.has(`${v.ano}-${v.turno}-${v.candidatoNumero}`)).toBe(true)
  })

  it('reads the manifest', async () => {
    expect((await store.manifest()).fixture).toBe(true)
  })
})

describe('createStore', () => {
  it('loads each file once, lazily', async () => {
    const reads: string[] = []
    const s = createStore(async (f) => {
      reads.push(f)
      return 'uf,cd_municipio,cd_ibge,nome,slug,regiao,ciclos\n'
    })
    expect(reads).toEqual([])
    await s.cities()
    await s.states()
    expect(reads).toEqual(['cities.csv'])
  })
})

describe('dataDir', () => {
  it('defaults to the fixtures and switches with DATA_DIR', () => {
    expect(dataDir({}, '/x/site')).toBe('/x/site/fixtures/data')
    expect(dataDir({ DATA_DIR: '../data' }, '/x/site')).toBe('/x/data')
  })
})
