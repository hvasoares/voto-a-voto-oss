import { describe, expect, it } from 'vitest'
import { buildGameData, seeded, shuffled } from './game-data'
import { dailyIndex } from './game'

describe('game data over the fixture dataset', async () => {
  const data = await buildGameData()
  it('has a row per city with a centre and a 2026 2nd round, no overseas post', () => {
    expect(data.cities.length).toBeGreaterThan(3)
    for (const [uf, slug, name, lat, lon, aptos, turnout, swings, region] of data.cities) {
      expect(uf).not.toBe('zz')
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(name.length).toBeGreaterThan(1)
      expect(Math.abs(lat)).toBeLessThan(35)
      expect(Math.abs(lon)).toBeLessThan(75)
      expect(aptos).toBeGreaterThan(0)
      expect(turnout).toBeGreaterThanOrEqual(0)
      expect(turnout).toBeLessThanOrEqual(100)
      expect([-1, 0, 1, 2]).toContain(swings)
      expect(region.length).toBeGreaterThan(1)
    }
  })
  it('the daily cities are only those with all three cycles and no tie, each once', () => {
    expect(data.daily.length).toBeGreaterThan(0)
    expect(new Set(data.daily).size).toBe(data.daily.length)
    for (const i of data.daily) expect(data.cities[i]![7]).toBeGreaterThanOrEqual(0)
  })
  it('holds no candidate, party or winner anywhere in the file', () => {
    const text = JSON.stringify(data)
    expect(text).not.toMatch(/candidato|partido|vencedor|lula|bolsonaro|haddad|"pt"|"pl"/i)
  })
  it('the file is the same on every build and the pick of a date is the same', async () => {
    const again = await buildGameData()
    expect(JSON.stringify(again)).toBe(JSON.stringify(data))
    expect(dailyIndex('2026-10-27', again.daily)).toBe(dailyIndex('2026-10-27', data.daily))
  })
  it('has a name for every state of the rows', () => {
    for (const c of data.cities) expect(data.states[c[0]]).toBeTruthy()
  })
})

describe('seeded shuffle', () => {
  it('is deterministic, keeps every item once and moves them', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    expect(shuffled(items, 7)).toEqual(shuffled(items, 7))
    expect([...shuffled(items, 7)].sort((a, b) => a - b)).toEqual(items)
    expect(shuffled(items, 7)).not.toEqual(items)
    expect(shuffled(items, 8)).not.toEqual(shuffled(items, 7))
    expect(seeded(1)()).toBe(seeded(1)())
  })
})
