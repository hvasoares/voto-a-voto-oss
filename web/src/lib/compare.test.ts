import { describe, expect, it } from 'vitest'
import {
  buildCompareRow,
  buildCycleBlock,
  buildCycleBlocks,
  CYCLES,
  exactPct,
  formatOneDecimal,
  formatPpChange,
  formatSignedInt,
  pctOfCycle,
  shortName,
  sortCompareRows,
  tenthsOfBar,
  type CompareRow,
  type RunoffTally,
} from './compare'

/**
 * Numbers below are the Sketch frames and the real tallies behind them (site/reference 11, 11b and3) with the real
 * SP/MG/RJ/BA/PR/RS tallies behind them (data/*.csv): both agree — the frames were drawn from
 * the real dataset. They also work as regression tests: the screens must never drift from the frames.
 */
const SP_2018: RunoffTally = { validos: 22518155, left: 7212132, rival: 15306023 }
const SP_2022: RunoffTally = { validos: 25736469, left: 11519882, rival: 14216587 }
const SP_2026: RunoffTally = { validos: 26258452, left: 12119274, rival: 14139178 }

describe('percent and volume formatting of the compare screens', () => {
  it('rounds a bar to one decimal with largest remainder so the sides add up to 100', () => {
    expect(tenthsOfBar(SP_2026.left, SP_2026.rival)).toEqual({ left: 462, rival: 538 })
    expect(tenthsOfBar(SP_2018.left, SP_2018.rival)).toEqual({ left: 320, rival: 680 })
    // MG 2022: 50.2013 / 49.7987 -> "50,2" + "49,8" = 100,0
    expect(tenthsOfBar(6190960, 6141310)).toEqual({ left: 502, rival: 498 })
    const bars: [number, number][] = [
      [SP_2026.left, SP_2026.rival],
      [SP_2018.left, SP_2018.rival],
      [6190960, 6141310],
    ]
    for (const [l, r] of bars) {
      expect(tenthsOfBar(l, r).left + tenthsOfBar(l, r).rival).toBe(1000)
    }
  })

  it('prints one decimal always, also the trailing zero ("32,0")', () => {
    expect(formatOneDecimal(320)).toBe('32,0')
    expect(formatOneDecimal(461)).toBe('46,1')
    expect(formatOneDecimal(1000)).toBe('100,0')
    expect(formatOneDecimal(7)).toBe('0,7')
  })

  it('prints signed votes with the pt-BR separators', () => {
    expect(formatSignedInt(599392)).toBe('+599.392')
    expect(formatSignedInt(-1166845)).toBe('-1.166.845')
    expect(formatSignedInt(0)).toBe('+0')
  })

  it('computes pp changes from the UNROUNDED percentages', () => {
    // SP: Lula 44.7609% (2022) -> 46.1538% (2026); the frame draws "+1,4 pp vs 2022"
    expect(formatPpChange(exactPct(SP_2026.left, SP_2026.validos), exactPct(SP_2022.left, SP_2022.validos))).toBe('+1,4')
    // SP: 32.0281% (2018) -> 44.7609% (2022); the frame draws "+12,7 pp vs 2018"
    expect(formatPpChange(exactPct(SP_2022.left, SP_2022.validos), exactPct(SP_2018.left, SP_2018.validos))).toBe('+12,7')
    // PR: 37.6031% (2022) -> 37.4238% (2026): just under 0,2 down
    expect(formatPpChange(exactPct(2566504, 6857948), exactPct(2506605, 6665948))).toBe('-0,2')
  })

  it('labels the frame candidates the way the frames do; anything else generically', () => {
    expect(shortName('LULA')).toBe('Lula')
    expect(shortName('FERNANDO HADDAD')).toBe('Haddad')
    expect(shortName('JAIR BOLSONARO')).toBe('Bolsonaro')
    expect(shortName('FLAVIO BOLSONARO')).toBe('Flávio')
    expect(shortName('Candidato A')).toBe('A')
    expect(shortName('CIRO GOMES')).toBe('Ciro')
  })
})

describe('the compare row (2026 vs a cycle), from the frames and the real tallies', () => {
  it('pairs 2026 with 2022 and keeps the exact integer vote difference', () => {
    const row = buildCompareRow({ uf: 'sp', c: SP_2026, old: SP_2022, labels: { left: 'Lula', rival: 'Flávio' } })
    expect(row.validos).toBe(26258452)
    expect(row.left.label).toBe('Lula')
    expect(row.left.pct26).toBe('46,2')
    expect(row.left.pctOld).toBe('44,8')
    expect(row.left.diffVotes).toBe(599392)
    expect(row.left.votos26).toBe(12119274)
    expect(row.left.votosOld).toBe(11519882)
    expect(row.rival.label).toBe('Flávio')
    expect(row.rival.pct26).toBe('53,8')
    expect(row.rival.pctOld).toBe('55,2')
    expect(row.rival.diffVotes).toBe(14139178 - 14216587)
    expect(formatSignedInt(row.rival.diffVotes)).toBe('-77.409')
  })

  it('pairs 2026 with 2018: the 2018 side is the PT candidate (13) against Bolsonaro (17)', () => {
    const row = buildCompareRow({ uf: 'sp', c: SP_2026, old: SP_2018, labels: { left: 'Lula', rival: 'Flávio' } })
    expect(row.left.pct26).toBe('46,2')
    expect(row.left.pctOld).toBe('32,0')
    expect(row.left.diffVotes).toBe(12119274 - 7212132)
    expect(row.rival.pct26).toBe('53,8')
    expect(row.rival.pctOld).toBe('68,0')
    expect(row.rival.diffVotes).toBe(14139178 - 15306023)
    expect(formatSignedInt(row.left.diffVotes)).toBe('+4.907.142')
    expect(formatSignedInt(row.rival.diffVotes)).toBe('-1.166.845')
  })

  it('sorts deterministically: big states by 2026 valid votes first, ties by UF', () => {
    const rows: CompareRow[] = [
      buildCompareRow({ uf: 'ap', c: { ...SP_2026, validos: 100 }, old: SP_2022, labels: { left: 'Lula', rival: 'Flávio' } }),
      buildCompareRow({ uf: 'rs', c: { ...SP_2026, validos: 100 }, old: SP_2022, labels: { left: 'Lula', rival: 'Flávio' } }),
      buildCompareRow({ uf: 'mg', c: { ...SP_2026, validos: 100 }, old: SP_2022, labels: { left: 'Lula', rival: 'Flávio' } }),
      buildCompareRow({ uf: 'sp', c: SP_2026, old: SP_2022, labels: { left: 'Lula', rival: 'Flávio' } }),
    ]
    expect(sortCompareRows(rows).map((r) => r.uf)).toEqual(['sp', 'ap', 'mg', 'rs'])
  })

  it('keeps a cycle in the frame order with its change against the previous cycle', () => {
    const blocks = buildCycleBlocks({
      tallies: new Map<number, RunoffTally>([
        [2018, SP_2018],
        [2022, SP_2022],
        [2026, SP_2026],
      ]),
      labels: {
        2018: { left: 'Lula', rival: 'Bolsonaro' },
        2022: { left: 'Lula', rival: 'Bolsonaro' },
        2026: { left: 'Lula', rival: 'Flávio' },
      },
    })
    expect(blocks.map((b) => b.ano)).toEqual(CYCLES)
    expect(blocks.map((b) => b.status)).toEqual(['data', 'data', 'data'])
    expect(blocks.map((b) => b.left!.pct)).toEqual(['32,0', '44,8', '46,2'])
    expect(blocks.map((b) => b.rival!.pct)).toEqual(['68,0', '55,2', '53,8'])
    expect(blocks.map((b) => b.rival!.label)).toEqual(['Bolsonaro', 'Bolsonaro', 'Flávio'])
    expect(blocks[0]!.changePp).toBeUndefined()
    expect(blocks[1]!.changePp).toBe('+12,7')
    expect(blocks[1]!.changeVs).toBe(2018)
    expect(blocks[2]!.changePp).toBe('+1,4')
    expect(blocks[2]!.changeVs).toBe(2022)
  })

  it('renders "sem dados" for cycles the state does not have, never zeros, and starts the change at the first data cycle', () => {
    const blocks = buildCycleBlocks({
      tallies: new Map<number, RunoffTally>([[2026, SP_2026]]),
      labels: { 2026: { left: 'Lula', rival: 'Flávio' } },
    })
    expect(blocks.map((b) => b.status)).toEqual(['no-data', 'no-data', 'data'])
    expect(blocks[0]!.left).toBeUndefined()
    expect(blocks[0]!.rival).toBeUndefined()
    expect(blocks[0]!.changePp).toBeUndefined()
    // the only change line is against the first cycle WITH data; here there is none before 2026
    expect(blocks[2]!.changePp).toBeUndefined()
    expect(blocks[2]!.changeVs).toBeUndefined()
    const first = buildCycleBlock({ ano: 2026, tally: SP_2026, labels: { left: 'Lula', rival: 'Flávio' }, previous: { ano: 2022, tally: SP_2022 } })
    expect(first.changePp).toBe('+1,4')
    expect(first.changeVs).toBe(2022)
  })

  it('shows a cycle pct from its own largest remainder ("32,0"/"68,0")', () => {
    expect(pctOfCycle(SP_2018, 'left')).toBe('32,0')
    expect(pctOfCycle(SP_2018, 'rival')).toBe('68,0')
  })
})