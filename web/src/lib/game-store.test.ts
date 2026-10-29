import { describe, expect, it } from 'vitest'
import { createMemoryStorage, createThrowingStorage } from '@/test/memory-storage'
import { GAME_KEY, STORED_KEYS } from './storage-keys'
import { STORED_ITEMS } from './stored-items'
import { clearHistory, guessesOf, loadSave, parseSave, withResult, writeSave } from './game-store'

const blocked = createThrowingStorage({ get: new Error('SecurityError'), set: new Error('QuotaExceededError'), remove: new Error('SecurityError') })

describe('game store', () => {
  it('writes and reads the save under the one listed key', () => {
    const s = createMemoryStorage()
    expect(writeSave({ day: '2026-10-27', guesses: ['rj/cidade-exemplo'], history: [{ n: 46, score: 3 }] }, s)).toBe(true)
    expect(Array.from({ length: s.length }, (_, i) => s.key(i))).toEqual([GAME_KEY])
    expect(loadSave(s)).toEqual({ day: '2026-10-27', guesses: ['rj/cidade-exemplo'], history: [{ n: 46, score: 3 }] })
  })
  it('the key is listed on the data page (storage-keys and stored-items agree)', () => {
    expect(STORED_KEYS).toContain(GAME_KEY)
    expect(STORED_ITEMS.some((i) => i.key === GAME_KEY && /nunca o nome da cidade/.test(i.what))).toBe(true)
  })
  it('works with storage blocked: reads give an empty save, writes say they were not kept, nothing throws', () => {
    expect(loadSave(blocked)).toEqual({ day: '', guesses: [], history: [] })
    expect(writeSave({ day: 'x', guesses: [], history: [] }, blocked)).toBe(false)
    expect(clearHistory({ day: '', guesses: [], history: [{ n: 1, score: 2 }] }, 1, blocked).history).toEqual([])
    expect(loadSave(undefined)).toEqual({ day: '', guesses: [], history: [] })
    expect(writeSave({ day: '', guesses: [], history: [] }, undefined)).toBe(false)
  })
  it('ignores garbage and keeps only what it understands', () => {
    expect(parseSave('not json')).toEqual({ day: '', guesses: [], history: [] })
    expect(parseSave('{"day":"x","guesses":["../etc",7,"rj/ok"],"history":[{"n":1,"score":9},{"n":2,"score":3},null]}')).toEqual({ day: '', guesses: ['rj/ok'], history: [{ n: 2, score: 3 }] })
  })
  it('today\'s guesses are forgotten on another day', () => {
    const save = { day: '2026-10-27', guesses: ['rj/a'], history: [] }
    expect(guessesOf(save, '2026-10-27')).toEqual(['rj/a'])
    expect(guessesOf(save, '2026-10-28')).toEqual([])
  })
  it('a finished game enters the history once and the history can be cleared', () => {
    const s = createMemoryStorage()
    const once = withResult({ day: 'd', guesses: [], history: [] }, { n: 47, score: 0 })
    expect(withResult(once, { n: 47, score: 3 }).history).toEqual([{ n: 47, score: 0 }])
    writeSave(once, s)
    const cleared = clearHistory(loadSave(s), 47, s)
    expect(cleared.history).toEqual([])
    expect(loadSave(s).history).toEqual([])
    expect(withResult(loadSave(s), { n: 47, score: 3 }).history).toEqual([])
    expect(withResult(loadSave(s), { n: 48, score: 3 }).history).toEqual([{ n: 48, score: 3 }])
  })
  it('never holds a city name: only ids, the day number and a score', () => {
    expect(JSON.stringify(withResult({ day: '2026-10-27', guesses: ['rj/a'], history: [] }, { n: 47, score: 3 }))).not.toMatch(/Cidade|nome|name/i)
  })
})
