import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStore } from '@/data'
import { diskSource } from '@/data/node'
import type { Turnout, Vote } from '@/data'
import { formatShare, nonVotersExceedMargin, stayHomeBin, stayHomeHex, stayHomeInk, stayHomeLegend, stayHomeRows, stayHomeViews, STAY_HOME_EDGES } from './stay-home'

const t = (uf: string, cd: string, aptos: number, validos: number, ano = 2026, turno: 1 | 2 = 1): Turnout => ({
  ano,
  turno,
  uf,
  cdMunicipio: cd,
  aptos,
  comparecimento: validos,
  abstencoes: 0,
  brancos: 0,
  nulos: 0,
  anuladosApuSep: 0,
  validos,
})
const v = (uf: string, cd: string, n: number, votos: number, ano = 2026, turno: 1 | 2 = 1): Vote => ({ ano, turno, uf, cdMunicipio: cd, candidatoNumero: n, votos })

describe('stayHomeRows: the share of the electorate that did not vote for anyone', () => {
  it('sums aptos minus valid votes over the state and divides by its electorate', () => {
    const rows = stayHomeRows([t('rj', '1', 100, 80), t('rj', '2', 300, 200), t('sp', '3', 50, 50)], 2026, 1)
    expect(rows.map((r) => r.uf)).toEqual(['rj', 'sp'])
    expect(rows[0]).toMatchObject({ uf: 'rj', aptos: 400, naoVotaram: 120, share: 30 })
    expect(rows[1]).toMatchObject({ uf: 'sp', naoVotaram: 0, share: 0 })
  })

  it('never lists the overseas posts as a state', () => {
    const rows = stayHomeRows([t('rj', '1', 100, 80), t('zz', '9', 100, 10)], 2026, 1)
    expect(rows.map((r) => r.uf)).toEqual(['rj'])
  })

  it('reads only the chosen cycle and round', () => {
    const turnout = [t('rj', '1', 100, 80), t('rj', '1', 100, 50, 2026, 2), t('rj', '1', 100, 10, 2022, 1)]
    expect(stayHomeRows(turnout, 2026, 2)[0]!.share).toBe(50)
    expect(stayHomeRows(turnout, 2022, 1)[0]!.share).toBe(90)
    expect(stayHomeRows(turnout, 2018, 1)).toEqual([])
  })

  it('a state with an empty electorate has no row instead of NaN', () => {
    expect(stayHomeRows([t('rj', '1', 0, 0)], 2026, 1)).toEqual([])
  })
})

describe('formatShare', () => {
  it('prints one decimal with a comma, as the frames do', () => {
    expect(formatShare(21.06)).toBe('21,1')
    expect(formatShare(17)).toBe('17,0')
    expect(formatShare(0)).toBe('0,0')
  })
})

describe('the colour steps', () => {
  it('has seven steps and six increasing edges', () => {
    expect(stayHomeLegend().bins).toHaveLength(7)
    expect(STAY_HOME_EDGES).toHaveLength(6)
    expect([...STAY_HOME_EDGES].sort((a, b) => a - b)).toEqual([...STAY_HOME_EDGES])
  })
  it('puts a share on the step between its edges; an edge belongs to the step above', () => {
    expect(stayHomeBin(0)).toBe(1)
    expect(stayHomeBin(STAY_HOME_EDGES[0]! - 0.01)).toBe(1)
    expect(stayHomeBin(STAY_HOME_EDGES[0]!)).toBe(2)
    expect(stayHomeBin(STAY_HOME_EDGES[5]!)).toBe(7)
    expect(stayHomeBin(80)).toBe(7)
  })
  it('the legend prints every edge so colour is never the only cue', () => {
    expect(stayHomeLegend().edges).toEqual(STAY_HOME_EDGES.map((e) => String(e)))
  })
  it('every step has legible ink on it (WCAG contrast of at least 4.5)', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((s) => (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4))
      return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!
    }
    const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    for (const bin of stayHomeLegend().bins) {
      const ink = stayHomeInk(bin) === 'var(--foreground)' ? '#1c1b18' : '#faf7f0'
      expect(ratio(lum(ink), lum(stayHomeHex(bin)))).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('stayHomeViews: the cycles and rounds a dataset has, newest first', () => {
  it('lists each cycle and round once', () => {
    const turnout = [t('rj', '1', 1, 1, 2022, 2), t('rj', '1', 1, 1, 2026, 1), t('sp', '1', 1, 1, 2026, 1), t('rj', '1', 1, 1, 2022, 1)]
    expect(stayHomeViews(turnout)).toEqual([
      { ano: 2026, turno: 1 },
      { ano: 2022, turno: 1 },
      { ano: 2022, turno: 2 },
    ])
  })
})

describe('nonVotersExceedMargin: the claim of the measure note (#24), per cycle and round', () => {
  it('counts the cities where the people who did not vote are strictly more than the margin of the first two', () => {
    const turnout = [t('rj', '1', 100, 60), t('rj', '2', 100, 60), t('rj', '3', 100, 60), t('sp', '4', 100, 100), t('zz', '9', 100, 50)]
    const votes = [
      v('rj', '1', 13, 35), v('rj', '1', 22, 25), // margin 10 < 40: counts
      v('rj', '2', 13, 50), v('rj', '2', 22, 10), // margin 40 = 40: does not count (strictly greater)
      v('rj', '3', 13, 60), // one candidate: margin 60 > 40: no
      v('sp', '4', 13, 90), v('sp', '4', 22, 10), // 80 > 0: no
      v('zz', '9', 13, 25), v('zz', '9', 22, 25), // overseas: out
    ]
    expect(nonVotersExceedMargin(turnout, votes, 2026, 1)).toEqual({ cities: 4, greater: 1, tenths: 250 })
  })
  it('leaves out a city without electorate or valid votes; with no city there is no claim', () => {
    expect(nonVotersExceedMargin([t('rj', '1', 0, 0), t('rj', '2', 10, 0)], [], 2026, 1)).toBeUndefined()
  })
})

const hasReal = existsSync(resolve('../data/votes.csv'))
describe.skipIf(!hasReal)('the real dataset: docs/nonvoters-vs-margin.md, line "Brasil (sem exterior)"', () => {
  const NOTE: [number, 1 | 2, number][] = [
    [2018, 1, 596],
    [2018, 2, 552],
    [2022, 1, 566],
    [2022, 2, 533],
    [2026, 1, 525],
    [2026, 2, 467],
  ]
  it.each(NOTE)('%s round %s: %s tenths of the cities', async (ano, turno, tenths) => {
    const store = createStore(diskSource(resolve('../data')))
    const [turnout, votes] = await Promise.all([store.turnout(), store.votes()])
    const claim = nonVotersExceedMargin(turnout, votes, ano, turno)!
    expect(claim.tenths).toBe(tenths)
    expect(claim.cities).toBe(ano === 2026 ? 5571 : 5570)
  }, 60_000)
})
