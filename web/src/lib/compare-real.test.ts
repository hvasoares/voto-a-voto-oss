import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStore } from '@/data'
import { diskSource } from '@/data/node'
import { buildCompareRow, buildCycleBlocks, formatSignedInt, type CompareRow, type RunoffTally } from './compare'
import { buildCompareRows, buildStateStats, compareTallies, labelsOf, roundOf, tallyOf, type StateStats } from './compare-data'

/**
 * The real committed dataset (data/*.csv, ticket #1). Skipped where the dataset is absent
 * (fixture-only checkouts). Every figure below is ALSO a figure of the Sketch frames of screens
 * 11, 11b and 13 (site/reference/*.png): both are ground truth of ticket #14 and must never diverge.
 */
const hasReal = existsSync(resolve('../data/votes.csv'))

const describeReal = hasReal ? describe : describe.skip

/** The real dataset, aggregated once per test process from the committed files (not the fixture set). */
let cached: Promise<StateStats[]> | undefined
function stats(): Promise<StateStats[]> {
  cached ??= buildStateStats(createStore(diskSource(resolve('../data'))))
  return cached
}

async function state(uf: string): Promise<StateStats> {
  const all = await stats()
  const s = all.find((x) => x.uf === uf)!
  if (!s) throw new Error(`missing state ${uf}`)
  return s
}

/** One page row of /comparar/ (the page labels come from labelsOf, never hard-coded here). */
async function row(uf: string, ciclo: number): Promise<CompareRow> {
  const s = await state(uf)
  const pair = compareTallies(s, ciclo)!
  return buildCompareRow({ uf, c: pair.c, old: pair.old, labels: labelsOf(s, 2026) })
}

describeReal('state comparisons on the real dataset (the own numbers of the frames)', () => {
  it(
    'has the 27 states and no overseas aggregate',
    async () => {
      const all = await stats()
      expect(all).toHaveLength(27)
      expect(all.find((s) => s.uf === 'zz')).toBeUndefined()
      // MT still has 2018 and 2022 at state level; its 2026-only municipality simply is not in those
      const mt = await state('mt')
      expect(tallyOf(mt, 2018, 2)).toBeDefined()
      expect(compareTallies(mt, 2022)).toBeDefined()
    },
    30_000,
  )

  it(
    'matches the frame "11 Comparar com 2022" for the six largest states, in order',
    async () => {
      const rows = buildCompareRows(await stats(), 2022)
      // os 6 estados com mais votos válidos, nesta ordem:
      expect(rows.slice(0, 6).map((r) => r.uf)).toEqual(['sp', 'mg', 'rj', 'ba', 'pr', 'rs'])
      expect(rows.map((r) => r.uf)).toHaveLength(27)
      // SP: "26.258.452 votos válidos"; Lula 46,2% · 2022: 44,8% · +599.392 votos; Flávio 53,8% · 55,2% · -77.409
      expect(rows[0]).toMatchObject({ uf: 'sp', validos: 26258452 })
      expect(rows[0]!.left.pct26).toBe('46,2')
      expect(rows[0]!.left.pctOld).toBe('44,8')
      expect(formatSignedInt(rows[0]!.left.diffVotes)).toBe('+599.392')
      expect(rows[0]!.rival.pct26).toBe('53,8')
      expect(rows[0]!.rival.pctOld).toBe('55,2')
      expect(formatSignedInt(rows[0]!.rival.diffVotes)).toBe('-77.409')
      // MG: 12.592.885; 50,4 · 50,2 · +160.139; 49,6 · 49,8 · +100.476
      expect(rows[1]).toMatchObject({ uf: 'mg', validos: 12592885 })
      expect(rows[1]!.left.pct26).toBe('50,4')
      expect(rows[1]!.left.pctOld).toBe('50,2')
      expect(formatSignedInt(rows[1]!.left.diffVotes)).toBe('+160.139')
      expect(rows[1]!.rival.pct26).toBe('49,6')
      expect(rows[1]!.rival.pctOld).toBe('49,8')
      expect(formatSignedInt(rows[1]!.rival.diffVotes)).toBe('+100.476')
      // RJ: 9.734.426; 46,9 · 43,5 · +409.176; 53,1 · 56,5 · -234.861
      expect(rows[2]).toMatchObject({ uf: 'rj', validos: 9734426 })
      expect(rows[2]!.left.pct26).toBe('46,9')
      expect(rows[2]!.left.pctOld).toBe('43,5')
      expect(formatSignedInt(rows[2]!.left.diffVotes)).toBe('+409.176')
      expect(rows[2]!.rival.pct26).toBe('53,1')
      expect(rows[2]!.rival.pctOld).toBe('56,5')
      expect(formatSignedInt(rows[2]!.rival.diffVotes)).toBe('-234.861')
      // BA: 9.094.019; 71,3 · 72,1 · +387.443; 28,7 · 27,9 · +251.733
      expect(rows[3]).toMatchObject({ uf: 'ba', validos: 9094019 })
      expect(rows[3]!.left.pct26).toBe('71,3')
      expect(rows[3]!.left.pctOld).toBe('72,1')
      expect(formatSignedInt(rows[3]!.left.diffVotes)).toBe('+387.443')
      expect(rows[3]!.rival.pct26).toBe('28,7')
      expect(rows[3]!.rival.pctOld).toBe('27,9')
      expect(formatSignedInt(rows[3]!.rival.diffVotes)).toBe('+251.733')
      // PR: 6.857.948; 37,4 · 37,6 · +59.899; 62,6 · 62,4 · +132.101
      expect(rows[4]).toMatchObject({ uf: 'pr', validos: 6857948 })
      expect(rows[4]!.left.pct26).toBe('37,4')
      expect(rows[4]!.left.pctOld).toBe('37,6')
      expect(formatSignedInt(rows[4]!.left.diffVotes)).toBe('+59.899')
      expect(rows[4]!.rival.pct26).toBe('62,6')
      expect(rows[4]!.rival.pctOld).toBe('62,4')
      expect(formatSignedInt(rows[4]!.rival.diffVotes)).toBe('+132.101')
      // RS: 6.698.930; 42,2 · 43,7 · -67.299; 57,8 · 56,3 · +141.193
      expect(rows[5]).toMatchObject({ uf: 'rs', validos: 6698930 })
      expect(rows[5]!.left.pct26).toBe('42,2')
      expect(rows[5]!.left.pctOld).toBe('43,7')
      expect(formatSignedInt(rows[5]!.left.diffVotes)).toBe('-67.299')
      expect(rows[5]!.rival.pct26).toBe('57,8')
      expect(rows[5]!.rival.pctOld).toBe('56,3')
      expect(formatSignedInt(rows[5]!.rival.diffVotes)).toBe('+141.193')
      // and every tested row shows its vote volume with the rate (the pages carry votos26/votosOld too)
      for (const r of rows) {
        expect(r.left.votos26).toBeGreaterThan(0)
        expect(r.rival.votosOld).toBeGreaterThan(0)
      }
    },
    30_000,
  )

  it(
    'matches the frame "11b Comparar com 2018" for the six largest states',
    async () => {
      // SP: Lula 46,2% · 2018: 32,0% · +4.907.142 votos; Flávio 53,8% · 2018: 68,0% · -1.166.845
      const sp = await row('sp', 2018)
      expect(sp.validos).toBe(26258452)
      expect(sp.left.pct26).toBe('46,2')
      expect(sp.left.pctOld).toBe('32,0')
      expect(formatSignedInt(sp.left.diffVotes)).toBe('+4.907.142')
      expect(sp.rival.pctOld).toBe('68,0')
      expect(formatSignedInt(sp.rival.diffVotes)).toBe('-1.166.845')
      // MG: 50,4 · 41,8 · +1.968.147; 49,6 · 58,2 · +141.679
      const mg = await row('mg', 2018)
      expect(mg.left.pctOld).toBe('41,8')
      expect(formatSignedInt(mg.left.diffVotes)).toBe('+1.968.147')
      expect(mg.rival.pctOld).toBe('58,2')
      expect(formatSignedInt(mg.rival.diffVotes)).toBe('+141.679')
      // RJ: 46,9 · 32,0 · +1.892.007; 53,1 · 68,0 · -500.026
      const rj = await row('rj', 2018)
      expect(rj.left.pctOld).toBe('32,0')
      expect(formatSignedInt(rj.left.diffVotes)).toBe('+1.892.007')
      expect(rj.rival.pctOld).toBe('68,0')
      expect(formatSignedInt(rj.rival.diffVotes)).toBe('-500.026')
      // BA: 71,3 · 72,7 · +1.000.357; 28,7 · 27,3 · +548.379
      const ba = await row('ba', 2018)
      expect(ba.left.pctOld).toBe('72,7')
      expect(formatSignedInt(ba.left.diffVotes)).toBe('+1.000.357')
      expect(ba.rival.pctOld).toBe('27,3')
      expect(formatSignedInt(ba.rival.diffVotes)).toBe('+548.379')
      // PR: 37,4 · 31,6 · +617.714; 62,6 · 68,4 · +67.028
      const pr = await row('pr', 2018)
      expect(pr.left.pctOld).toBe('31,6')
      expect(formatSignedInt(pr.left.diffVotes)).toBe('+617.714')
      expect(pr.rival.pctOld).toBe('68,4')
      expect(formatSignedInt(pr.rival.diffVotes)).toBe('+67.028')
      // RS: 42,2 · 36,8 · +561.381; 57,8 · 63,2 · -19.359
      const rs = await row('rs', 2018)
      expect(rs.left.pctOld).toBe('36,8')
      expect(formatSignedInt(rs.left.diffVotes)).toBe('+561.381')
      expect(rs.rival.pctOld).toBe('63,2')
      expect(formatSignedInt(rs.rival.diffVotes)).toBe('-19.359')
    },
    30_000,
  )

  it(
    'matches the frame "13 Três ciclos por estado" for SP, and round 1 exists for every cycle',
    async () => {
      const sp = await state('sp')
      const tallies = new Map<number, RunoffTally>()
      for (const ano of [2018, 2022, 2026]) {
        const t = tallyOf(sp, ano, 2)
        if (t) tallies.set(ano, t)
      }
      const blocks = buildCycleBlocks({
        tallies,
        labels: {
          2018: { left: 'Lula', rival: 'Bolsonaro' },
          2022: { left: 'Lula', rival: 'Bolsonaro' },
          2026: { left: 'Lula', rival: 'Flávio' },
        },
      })
      expect(blocks.map((b) => b.left!.pct)).toEqual(['32,0', '44,8', '46,2'])
      expect(blocks.map((b) => b.rival!.pct)).toEqual(['68,0', '55,2', '53,8'])
      expect(blocks[1]!.changePp).toBe('+12,7')
      expect(blocks[1]!.changeVs).toBe(2018)
      expect(blocks[2]!.changePp).toBe('+1,4')
      expect(blocks[2]!.changeVs).toBe(2022)
      // the same tallies back the compare rows above against those bars
      expect((await row('sp', 2022)).left.pctOld).toBe('44,8')
      expect((await row('sp', 2018)).left.pctOld).toBe('32,0')
      // round 1 exists for every cycle (used later by the map ticket, not by these screens)
      expect(roundOf(sp, 2018, 1)).toBeDefined()
      expect(roundOf(sp, 2022, 1)).toBeDefined()
      expect(roundOf(sp, 2026, 1)).toBeDefined()
      // labels: the 2018 rival is the 2018 Bolsonaro, not the 2026 Flavio
      expect(labelsOf(sp, 2018).rival).toBe('Bolsonaro')
      expect(labelsOf(sp, 2026).rival).toBe('Flávio')
    },
    30_000,
  )
})