import { describe, expect, it } from 'vitest'
import type { City } from '../../data'
import { buildIndex, displayName, fold, MIN_QUERY, searchCities, ufLabel } from './search'

const city = (uf: string, nome: string, slug = fold(nome).replace(/ /g, '-')): City => ({ uf, cdMunicipio: `${uf}${slug}`, cdIbge: '', nome, slug, regiao: 'x', ciclos: [2026] })

const CITIES = [
  city('sp', 'SÃO PAULO'),
  city('sp', 'SÃO PAULO DE OLIVENÇA'),
  city('rn', 'SÃO PAULO DO POTENGI'),
  city('pa', 'BELÉM'),
  city('al', 'BELÉM'),
  city('pb', 'BELÉM'),
  city('pa', 'BELÉM DO BREJO DO CRUZ'),
  city('df', 'BRASÍLIA'),
  city('mg', 'BRASÍLIA DE MINAS'),
  city('sp', "SANTA BÁRBARA D'OESTE"),
  city('rj', 'CASIMIRO DE ABREU'),
  city('zz', 'BUENOS AIRES'),
  city('zz', 'SÃO TOMÉ'),
  city('mg', 'SÃO TOMÉ'),
]
const index = buildIndex(CITIES)
const names = (q: string, limit?: number) => searchCities(index, q, { limit }).hits.map((h) => `${h.nome}/${h.ufLabel}`)

describe('fold', () => {
  it('removes accents, case and punctuation', () => {
    expect(fold('  SÃO   Paulo ')).toBe('sao paulo')
    expect(fold("Santa Bárbara D'Oeste")).toBe('santa barbara d oeste')
    expect(fold('Açu-Çá')).toBe('acu ca')
  })
})

describe('displayName', () => {
  it('turns TSE upper case into readable Title Case, keeping Portuguese particles low', () => {
    expect(displayName('SÃO PAULO')).toBe('São Paulo')
    expect(displayName('BELÉM DO BREJO DO CRUZ')).toBe('Belém do Brejo do Cruz')
    expect(displayName("SANTA BÁRBARA D'OESTE")).toBe("Santa Bárbara d'Oeste")
    expect(displayName('PORTO DE PEDRAS')).toBe('Porto de Pedras')
  })
  it('leaves names that are already mixed case alone', () => {
    expect(displayName('Cidade Exemplo')).toBe('Cidade Exemplo')
  })
})

describe('ufLabel', () => {
  it('upper-cases the UF and calls the overseas post "Exterior"', () => {
    expect(ufLabel('rj')).toBe('RJ')
    expect(ufLabel('zz')).toBe('Exterior')
  })
})

describe('searchCities', () => {
  it('finds a name typed without accents and in any case', () => {
    expect(names('sao paulo')[0]).toBe('São Paulo/SP')
    expect(names('SAO PAULO')).toEqual(names('são paulo'))
    expect(names('brasilia')[0]).toBe('Brasília/DF')
  })

  it('shows every state that has the same city name, each with its UF', () => {
    expect(names('belem').slice(0, 3).sort()).toEqual(['Belém/AL', 'Belém/PA', 'Belém/PB'])
  })

  it('ranks exact name, then name prefix, then later word prefix, then substring', () => {
    expect(names('belem').slice(0, 3)).toHaveLength(3)
    expect(names('belem')[3]).toBe('Belém do Brejo do Cruz/PA')
    expect(names('paulo')[0]).toMatch(/^São Paulo/)
    expect(names('oeste')).toEqual(["Santa Bárbara d'Oeste/SP"])
    expect(names('arbar')).toEqual(["Santa Bárbara d'Oeste/SP"])
  })

  it('requires every typed word and lets a UF word narrow the match', () => {
    expect(names('sao paulo potengi')).toEqual(['São Paulo do Potengi/RN'])
    expect(names('belem pa')).toEqual(['Belém/PA', 'Belém do Brejo do Cruz/PA'])
    expect(names('sao paulo rn')).toEqual(['São Paulo do Potengi/RN'])
  })

  it('finds overseas posts, labelled Exterior, after domestic cities with the same rank', () => {
    expect(names('sao tome')).toEqual(['São Tomé/MG', 'São Tomé/Exterior'])
    expect(names('buenos')).toEqual(['Buenos Aires/Exterior'])
    expect(names('exterior')).toContain('Buenos Aires/Exterior')
  })

  it('does not search below the minimum length and returns nothing for blanks', () => {
    expect(MIN_QUERY).toBe(2)
    expect(searchCities(index, 's').hits).toEqual([])
    expect(searchCities(index, '   ').hits).toEqual([])
  })

  it('caps the list but reports the full count', () => {
    const many = buildIndex(Array.from({ length: 60 }, (_, i) => city('mg', `SANTA LUZIA ${i}`, `santa-luzia-${i}`)))
    const r = searchCities(many, 'santa luzia', { limit: 20 })
    expect(r.hits).toHaveLength(20)
    expect(r.total).toBe(60)
  })

  it('returns what is needed to link: uf and slug', () => {
    const [hit] = searchCities(index, 'casimiro').hits
    expect(hit).toMatchObject({ uf: 'rj', slug: 'casimiro-de-abreu', nome: 'Casimiro de Abreu', ufLabel: 'RJ' })
  })

  it('returns nothing for a name that does not exist', () => {
    expect(searchCities(index, 'zzzzqq')).toEqual({ total: 0, hits: [] })
  })
})
