import { describe, expect, it } from 'vitest'
import { createMemoryStorage, createThrowingStorage } from '@/test/memory-storage'
import { NOTICE_STORAGE_KEY } from './consent'
import { GAME_KEY, GUESS_KEY, SEASON_KEY } from './storage-keys'
import { forgetAll, placeHref, placeLabel, PLACE_KEY, readPlace, savePlace } from './place-store'
import { STORED_ITEMS } from './stored-items'
import { REGISTER_KEY } from './sentences/register-store'

const blocked = createThrowingStorage({ get: new Error('blocked'), set: new Error('blocked'), remove: new Error('blocked') })
const city = { kind: 'city', uf: 'rj', slug: 'cidade-exemplo', nome: 'Cidade Exemplo' } as const

describe('place store', () => {
  it('has no place until one is picked', () => {
    expect(readPlace(createMemoryStorage())).toBeUndefined()
  })

  it('remembers a city and a state, the last pick replacing the earlier one', () => {
    const s = createMemoryStorage()
    savePlace(city, s)
    expect(readPlace(s)).toEqual(city)
    savePlace({ kind: 'state', uf: 'mt', nome: 'Mato Grosso' }, s)
    expect(readPlace(s)).toEqual({ kind: 'state', uf: 'mt', nome: 'Mato Grosso' })
  })

  it('keeps only the fields of a place, nothing else the caller passed along', () => {
    const s = createMemoryStorage()
    savePlace({ ...city, extra: 'x', lat: -22.9 } as never, s)
    expect(JSON.parse(s.getItem(PLACE_KEY)!)).toEqual(city)
  })

  it.each([
    ['not json', '{'],
    ['an array', '[]'],
    ['an unknown kind', '{"kind":"street","uf":"rj"}'],
    ['a uf that is not two letters', '{"kind":"state","uf":"rio","nome":"X"}'],
    ['a state without a name', '{"kind":"state","uf":"rj"}'],
    ['a city without a slug', '{"kind":"city","uf":"rj","nome":"X"}'],
    ['a slug with a path in it', '{"kind":"city","uf":"rj","slug":"../x","nome":"X"}'],
  ])('ignores a stored value that is %s', (_label, raw) => {
    const s = createMemoryStorage()
    s.setItem(PLACE_KEY, raw)
    expect(readPlace(s)).toBeUndefined()
  })

  it('links a city to its page and a state to its page, and names them', () => {
    expect(placeHref(city)).toBe('/rj/cidade-exemplo/')
    expect(placeHref({ kind: 'state', uf: 'mt', nome: 'Mato Grosso' })).toBe('/mt/')
    expect(placeLabel(city)).toBe('Cidade Exemplo · RJ')
    expect(placeLabel({ kind: 'state', uf: 'mt', nome: 'Mato Grosso' })).toBe('Mato Grosso')
  })

  it('forgets everything the site stored, and only that', () => {
    const s = createMemoryStorage()
    savePlace(city, s)
    s.setItem(REGISTER_KEY, 'plain')
    s.setItem(NOTICE_STORAGE_KEY, 'acknowledged')
    s.setItem(GAME_KEY, '{}')
    s.setItem(GUESS_KEY, '{}')
    s.setItem(SEASON_KEY, 'reverse')
    s.setItem('someone-else', 'kept')
    forgetAll(s)
    expect(Array.from({ length: s.length }, (_, i) => s.key(i))).toEqual(['someone-else'])
    expect(readPlace(s)).toBeUndefined()
  })

  it('lists, for the privacy text, exactly the keys the site writes', () => {
    expect(STORED_ITEMS.map((i) => i.key).sort()).toEqual([GAME_KEY, GUESS_KEY, NOTICE_STORAGE_KEY, PLACE_KEY, REGISTER_KEY, SEASON_KEY].sort())
    for (const item of STORED_ITEMS) expect(item.what.length).toBeGreaterThan(10)
  })

  it('works with no storage at all, or one that throws on every call', () => {
    for (const s of [undefined, blocked]) {
      expect(readPlace(s)).toBeUndefined()
      expect(() => savePlace(city, s)).not.toThrow()
      expect(() => forgetAll(s)).not.toThrow()
    }
  })
})
