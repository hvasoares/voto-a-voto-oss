import { describe, expect, it } from 'vitest'
import { CLUE_IDS, MAX_GUESSES, brazilDate, clueText, countdown, dailyIndex, dayNumber, direction, distanceKm, feedback, gridRow, msToNext, outcome, shareText, sizeBand, unlockedClues, type GameCity } from './game'

const city = (uf: string, slug: string, name: string, lat: number, lon: number, aptos: number, turnout: number, swings: number, region: string): GameCity => [uf, slug, name, lat, lon, aptos, turnout, swings, region]
const secret = city('mg', 'cidade-secreta', 'Cidade Secreta', -19.9, -43.9, 30000, 72, 1, 'sudeste')
const states = { mg: 'Minas Gerais', ba: 'Bahia' }
const set = (c: GameCity, i: number, v: string | number): GameCity => c.map((x, j) => (j === i ? v : x)) as GameCity

describe('daily pick', () => {
  const daily = [4, 2, 9, 1]
  it('is the same for the same date and walks the precomputed order day by day', () => {
    expect(dailyIndex('2026-10-27', daily)).toBe(dailyIndex('2026-10-27', daily))
    const n = dayNumber('2026-10-27')
    expect(dailyIndex('2026-10-27', daily)).toBe(daily[n % 4])
    expect(dailyIndex('2026-10-28', daily)).toBe(daily[(n + 1) % 4])
  })
  it('counts whole days from 2026-01-01', () => {
    expect(dayNumber('2026-01-01')).toBe(0)
    expect(dayNumber('2026-12-31')).toBe(364)
    expect(dayNumber('2025-12-31')).toBe(-1)
    expect(dailyIndex('2025-12-31', daily)).toBe(daily[3])
  })
  it('refuses an empty list', () => expect(() => dailyIndex('2026-10-27', [])).toThrow(RangeError))
  it('the day changes at midnight in Brazil: 02:59 UTC is still the day before in São Paulo (UTC-3)', () => {
    expect(brazilDate(new Date('2026-10-28T02:59:00Z'))).toBe('2026-10-27')
    expect(brazilDate(new Date('2026-10-28T03:00:00Z'))).toBe('2026-10-28')
  })
  it('counts down to the next midnight', () => {
    expect(countdown(msToNext(new Date('2026-10-28T02:59:00Z')))).toBe('00:01:00')
    expect(countdown(msToNext(new Date('2026-10-28T03:00:00Z')))).toBe('24:00:00')
    expect(countdown(-5)).toBe('00:00:00')
  })
})

describe('the clues: a closed list, one rule each', () => {
  it('is exactly size, turnout, swings, region, state', () => expect([...CLUE_IDS]).toEqual(['size', 'turnout', 'swings', 'region', 'state']))
  it.each([[5000, 0], [5001, 1], [20000, 1], [20001, 2], [100000, 2], [100001, 3], [500000, 3], [500001, 4]])('size band of %i is %i', (aptos, band) => expect(sizeBand(aptos)).toBe(band))
  it('size rule', () => expect(clueText('size', secret, states)).toBe('Entre 20 e 100 mil eleitores'))
  it('turnout rule gives the decade of the whole percent', () => {
    expect(clueText('turnout', secret, states)).toBe('Entre 70% e 80% do eleitorado compareceu no 2º turno')
    expect(clueText('turnout', set(secret, 6, 100), states)).toBe('Entre 100% e 100% do eleitorado compareceu no 2º turno')
  })
  it('swings rule: none, once, twice', () => {
    expect(clueText('swings', set(secret, 7, 0), states)).toBe('O resultado não mudou de lado entre 2018 e 2026')
    expect(clueText('swings', secret, states)).toBe('O resultado mudou de lado 1 vez entre 2018 e 2026')
    expect(clueText('swings', set(secret, 7, 2), states)).toBe('O resultado mudou de lado 2 vezes entre 2018 e 2026')
  })
  it('region and state rules', () => {
    expect(clueText('region', secret, states)).toBe('Fica na região Sudeste')
    expect(clueText('region', set(set(secret, 8, 'centro-oeste'), 8, 'centro-oeste'), states)).toBe('Fica na região Centro-Oeste')
    expect(clueText('state', secret, states)).toBe('Fica no estado Minas Gerais')
  })
  it('no clue text names a candidate, a party or a winner, for every kind of city', () => {
    const NAMES = /\b(lula|bolsonaro|haddad|fl[aá]vio|ciro|dilma|temer|tarcísio|pt|psl|pl|psdb|mdb|psol|novo|candidato|partido|vencedor|venceu|vence|lidera|ganhou|perdeu|eleito|derrota)\b/i
    for (const swings of [-1, 0, 1, 2]) for (const turnout of [0, 5, 55, 99, 100]) for (const aptos of [10, 6000, 50000, 200000, 900000])
      for (const id of CLUE_IDS) expect(clueText(id, city('ba', 'x', 'X', 0, 0, aptos, turnout, swings, 'nordeste'), states)).not.toMatch(NAMES)
  })
  it('a clue shows after as many guesses as its number, and never more than five', () => {
    expect([0, 1, 3, 5, 6].map(unlockedClues)).toEqual([0, 1, 3, 5, 5])
  })
})

describe('feedback of a guess', () => {
  const guess = city('ba', 'salvador-fake', 'Guess', -12.97, -38.5, 9000, 80, 0, 'nordeste')
  it('distance from the centres, direction towards the secret city, and turnout and size of the secret one', () => {
    const f = feedback(guess, secret)
    expect(f.km).toBeGreaterThan(900)
    expect(f.km).toBeLessThan(1100)
    expect(f.dir).toBe('SW')
    expect(f.turnout).toBe('less')
    expect(f.size).toBe('more')
    expect(f.correct).toBe(false)
  })
  it('equal turnout and size read as equal', () => {
    const f = feedback(set(set(set(secret, 1, 'outra'), 6, 72), 5, 25000), secret)
    expect([f.turnout, f.size]).toEqual(['equal', 'equal'])
  })
  it('the secret city itself is correct', () => expect(feedback(secret, secret)).toMatchObject({ km: 0, correct: true }))
  it.each([
    [1, 0, 'N'], [1, 1, 'NE'], [0, 1, 'E'], [-1, 1, 'SE'], [-1, 0, 'S'], [-1, -1, 'SW'], [0, -1, 'W'], [1, -1, 'NW'],
  ] as [number, number, string][])('%i north, %i east of the guess is %s', (north, east, dir) => {
    expect(direction(0, 0, north * 0.5, east * 0.5)).toBe(dir)
  })
})

describe('result grid and share text', () => {
  const near = city('mg', 'perto', 'Perto', -19.8, -43.8, 30000, 72, 1, 'sudeste')
  const far = city('ba', 'longe', 'Longe', -12.9, -38.5, 3000, 60, 0, 'nordeste')
  const feedbacks = [feedback(far, secret), feedback(near, secret), feedback(secret, secret)]
  it('three squares per guess: distance, turnout, size', () => {
    expect(feedbacks.map(gridRow)).toEqual(['⬜⬜⬜', '🟩🟩🟩', '🟩🟩🟩'])
    expect(gridRow({ km: 300, dir: 'N', turnout: 'equal', size: 'more', correct: false })).toBe('🟨🟩⬜')
  })
  it('the share text has the heading, the grid and the address, and never the city name', () => {
    const text = shareText(47, feedbacks, 'https://voto-a-voto.com/adivinhe/')
    expect(text).toBe('Adivinhe a cidade nº 47 · 3/6\n⬜⬜⬜\n🟩🟩🟩\n🟩🟩🟩\nhttps://voto-a-voto.com/adivinhe/')
    for (const name of ['Cidade Secreta', 'cidade-secreta', 'Minas', 'Perto', 'Longe']) expect(text).not.toContain(name)
    expect(text).not.toMatch(/vence|lidera/i)
  })
  it('a lost game says X/6', () => {
    const lost = Array.from({ length: MAX_GUESSES }, () => feedback(far, secret))
    expect(shareText(47, lost, 'u').split('\n')[0]).toBe('Adivinhe a cidade nº 47 · X/6')
    expect(outcome(lost)).toEqual({ won: false, finished: true, guesses: 6 })
    expect(outcome(feedbacks)).toEqual({ won: true, finished: true, guesses: 3 })
    expect(outcome([feedback(far, secret)])).toEqual({ won: false, finished: false, guesses: 1 })
  })
})

describe('distance', () => {
  it('is zero to itself and about 357 km from Rio to São Paulo', () => {
    expect(distanceKm(-22.9, -43.2, -22.9, -43.2)).toBe(0)
    expect(distanceKm(-22.9068, -43.1729, -23.5505, -46.6333)).toBeGreaterThan(350)
    expect(distanceKm(-22.9068, -43.1729, -23.5505, -46.6333)).toBeLessThan(365)
  })
})
