import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCandidates, parseTurnout, parseVotes } from '@site/data/csv'
import type { Candidate, Turnout, Vote } from '@site/data'
import { computeMargins, formatSwing, OVERSEAS_UF, roundPp } from './margins'

/** Small fixed arrays of one synthetic cycle, used by the pure-logic tests (no election data). */
function fixture(): { turnout: Turnout[]; votes: Vote[]; candidates: Candidate[] } {
  const turnout = (uf: string, turno: 1 | 2, cd: string, validos: number): Turnout => ({
    ano: 2026,
    turno,
    uf,
    cdMunicipio: cd,
    aptos: validos * 2,
    comparecimento: validos + 10,
    abstencoes: 9,
    brancos: 1,
    nulos: 0,
    anuladosApuSep: 0,
    validos,
  })
  const vote = (uf: string, turno: 1 | 2, cd: string, candidatoNumero: number, votos: number): Vote => ({
    ano: 2026,
    turno,
    uf,
    cdMunicipio: cd,
    candidatoNumero,
    votos,
  })
  // Pair: 30 and 40. Candidate 40 leads the round 2 nationally (172 x 128), so side A = 40.
  // uf "aa": the margin moves -, from +12 (56% A x 44% B of 200 valid) to -18 (41 x 59 of 200).
  // uf "bb": small, margin +96 -> +80 (swing -16).
  // uf "zz": overseas, must never appear and never count for the national figures.
  return {
    turnout: [
      turnout('aa', 1, '01', 100),
      turnout('aa', 1, '02', 100),
      turnout('aa', 2, '01', 200),
      turnout('bb', 1, '10', 100),
      turnout('bb', 2, '10', 100),
      turnout('zz', 1, '20', 10000),
      turnout('zz', 2, '20', 10000),
    ],
    votes: [
      vote('aa', 1, '01', 30, 44),
      vote('aa', 1, '01', 40, 56),
      vote('aa', 1, '02', 30, 44),
      vote('aa', 1, '02', 40, 56),
      vote('aa', 2, '01', 30, 118),
      vote('aa', 2, '01', 40, 82),
      vote('bb', 1, '10', 30, 2),
      vote('bb', 1, '10', 40, 98),
      vote('bb', 2, '10', 30, 10),
      vote('bb', 2, '10', 40, 90),
      // national round 2: 30 leads (118+10=128 x 40=172)? B leads: 40: 82+90=172 vs 128. So 40 is ladoA.
      vote('zz', 1, '20', 30, 900),
      vote('zz', 1, '20', 40, 100),
      vote('zz', 2, '20', 30, 990),
      vote('zz', 2, '20', 40, 10),
    ],
    candidates: [
      { ano: 2026, turno: 1, candidatoNumero: 30, nomeUrna: 'CANDIDATO X', partido: 'PX' },
      { ano: 2026, turno: 1, candidatoNumero: 40, nomeUrna: 'CANDIDATO Y', partido: 'PY' },
      { ano: 2026, turno: 2, candidatoNumero: 30, nomeUrna: 'CANDIDATO X', partido: 'PX' },
      { ano: 2026, turno: 2, candidatoNumero: 40, nomeUrna: 'CANDIDATO Y', partido: 'PY' },
    ],
  }
}

const base = () => {
  const f = fixture()
  return computeMargins({ ano: 2026, ...f })
}

describe('computeMargins (synthetic fixture of one cycle)', () => {
  it('derives the runoff pair from the round 2 votes, leader first', () => {
    const m = base()
    expect(m.ladoA.numero).toBe(40)
    expect(m.ladoB.numero).toBe(30)
  })

  it('computes per-UF margins as pp of valid votes of the same round', () => {
    const m = base()
    const aa = m.states.find((s) => s.uf === 'aa')!
    expect(aa.validos1).toBe(200)
    expect(aa.validos2).toBe(200)
    expect(aa.votosA1).toBe(112)
    expect(aa.votosA2).toBe(82) // side A = candidate 40
    expect(aa.margin1).toBeCloseTo(12, 10) // 56% - 44%
    expect(aa.margin2).toBeCloseTo(-18, 10)
    expect(aa.swing).toBeCloseTo(-30, 10)
  })

  it('computes the swing on the unrounded margins', () => {
    const m = base()
    const bb = m.states.find((s) => s.uf === 'bb')!
    expect(bb.margin1).toBeCloseTo(96, 6)
    expect(bb.margin2).toBeCloseTo(80, 6)
    expect(bb.swing).toBeCloseTo(-16, 6)
  })

  it('excludes the overseas UFs everywhere', () => {
    const m = base()
    expect(m.states.map((s) => s.uf)).toEqual(['aa', 'bb'])
    expect(m.states.some((s) => s.uf === OVERSEAS_UF)).toBe(false)
  })

  it('aggregates the nation without the overseas post', () => {
    const m = base()
    // aa + bb, round 2: validos 300, side A (40): 82+90=172; side B (30): 118+10=128
    expect(m.national.validos2).toBe(300)
    expect(m.national.validos1).toBe(300)
    expect(m.national.margin2).toBeCloseTo(((172 - 128) / 300) * 100, 10)
    // round 1: side A (40): 112+98=210; side B (30): 88+2=90
    expect(m.national.margin1).toBeCloseTo((120 / 300) * 100, 10)
    expect(m.national.swing).toBeCloseTo(m.national.margin2 - m.national.margin1, 10)
  })

  it('drops a state missing one round instead of inventing a margin', () => {
    const f = fixture()
    // bb loses its round 2 turnout row (only the votes row remains); margins for bb would be lies.
    const turnout: Turnout[] = f.turnout.filter(
      (t) => !(t.uf === 'bb' && t.turno === 2),
    )
    const m = computeMargins({ ano: 2026, turnout, votes: f.votes, candidates: f.candidates })
    // bb keeps its rows from other data? no: votes without validos are excluded (no validos row at all)
    expect(m.states.map((s) => s.uf)).toEqual(['aa'])
    expect(m.national.validos2).toBe(200) // bb contributed nothing to the national aggregate
  })
})

describe('formatSwing / roundPp', () => {
  it('formats pt-BR pp with the leading sign and one decimal', () => {
    expect(formatSwing(-7.7)).toBe('-7,7')
    expect(formatSwing(0)).toBe('+0,0')
    expect(formatSwing(0.9)).toBe('+0,9')
    expect(formatSwing(7.39)).toBe('+7,4')
    expect(formatSwing(-7.65)).toBe('-7,7') // half away from zero
    expect(formatSwing(-2.34)).toBe('-2,3')
  })

  it('never shows a negative zero', () => {
    expect(roundPp(-0.04)).toBe(0) // Math.round handles it: -0.04*10=-0.4 -> -0 -> 0
    expect(roundPp(-1.04)).toBe(-1)
  })
})

/**
 * Pinned to the REAL dataset (data/ of ticket #1, at the repo root one level above web/), so the
 * page figures are checked at test time against the swing/compare note
 * (thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md).
 */
const realDir = resolve(import.meta.dirname, '../../../data')

const real = () => ({
  turnout: parseTurnout(readFileSync(realDir + '/turnout.csv', 'utf8')),
  votes: parseVotes(readFileSync(realDir + '/votes.csv', 'utf8')),
  candidates: parseCandidates(readFileSync(realDir + '/candidates.csv', 'utf8')),
})

describe('computeMargins (real dataset, pinned figures of the highlights note)', () => {
  const m = computeMargins({ ano: 2026, ...real() })

  it('names the two runoff candidates and puts Lula first (he wins the country in round 2)', () => {
    expect(m.ladoA).toEqual({ numero: 13, nome: 'LULA', partido: 'PT' })
    expect(m.ladoB).toEqual({ numero: 22, nome: 'FLAVIO BOLSONARO', partido: 'PL' })
  })

  it('lists 27 UFs plus nothing else (no overseas)', () => {
    expect(m.states).toHaveLength(27)
  })

  it('reproduces the figures of the highlights note (rounds 1 and 2 per UF)', () => {
    const byUf = new Map(m.states.map((s) => [s.uf, s]))
    const sp = byUf.get('sp')!
    expect(sp.validos2).toBe(26_258_452)
    expect(roundPp(sp.margin2)).toBeCloseTo(-7.7, 8)
    expect(roundPp(sp.margin1)).toBeCloseTo(-13.7, 8)
    expect(roundPp(sp.swing)).toBeCloseTo(6, 8) // +6,0 in the frame and the note

    // The note's biggest state swings.
    for (const [uf, swing] of [['rj', 7.4], ['al', 7.3], ['se', 6.9], ['pb', 6.7], ['rn', 6.5]] as const) {
      expect(roundPp(byUf.get(uf)!.swing), `${uf} swing`).toBeCloseTo(swing, 8)
    }
    // ... and its smallest.
    for (const [uf, swing] of [['ro', 2.3], ['ac', 2.7], ['sc', 2.8]] as const) {
      expect(roundPp(byUf.get(uf)!.swing), `${uf} swing`).toBeCloseTo(swing, 8)
    }
  })

  it('finds MG as the only flip (margin moves from negative to positive between rounds)', () => {
    const flipped = m.states.filter((s) => s.margin1 < 0 && s.margin2 >= 0)
    expect(flipped.map((s) => s.uf)).toEqual(['mg'])
    expect(roundPp(flipped[0]!.margin1)).toBe(-4.9)
    expect(roundPp(flipped[0]!.margin2)).toBe(0.9)
  })

  it('has no negative swing in the runoff (every state moves toward Lula)', () => {
    expect(m.states.some((s) => s.swing < 0)).toBe(false)
  })

  it('matches the 2022 runoff anchor of the compare note when the cycle is 2022 (13 vs 22)', () => {
    const m2022 = computeMargins({ ano: 2022, ...real() })
    expect(m2022.ladoA.numero).toBe(13)
    expect(m2022.ladoB.numero).toBe(22)
  })
})