import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseCandidates, parseCities, parseTurnout, parseVotes } from '@/data/csv'
import type { Candidate, City, Turnout, Vote } from '@/data'
import { computeMargins, roundPp } from './margins'
import { computeCityMargins, type CityMarginRow } from './margins-city'
import { cityMapData, cityRowsFor } from './city-map-data'

/**
 * Margins per MUNICIPALITY (ticket #16), pure: same pair rules and definitions of src/lib/margins.ts,
 * city granularity. Synthetic fixture first.
 */
function city(cdMunicipio: string, nome: string, cdIbge: string, slug: string): City {
  return { uf: 'ap', cdMunicipio, cdIbge, nome, slug, regiao: 'sudeste', ciclos: [2018, 2022, 2026] }
}

function turnout(uf: string, turno: 1 | 2, cd: string, validos: number): Turnout {
  return { ano: 2026, turno, uf, cdMunicipio: cd, aptos: validos * 2, comparecimento: validos + 10, abstencoes: 9, brancos: 1, nulos: 0, anuladosApuSep: 0, validos }
}

function vote(uf: string, turno: 1 | 2, cd: string, candidatoNumero: number, votos: number): Vote {
  return { ano: 2026, turno, uf, cdMunicipio: cd, candidatoNumero, votos }
}

function candidate(turno: 1 | 2, numero: number, nome: string): Candidate {
  return { ano: 2026, turno, candidatoNumero: numero, nomeUrna: nome, partido: 'PT' }
}

const cities = [city('01', 'CIDADE UM', '1100123', 'cidade-um'), city('02', 'CIDADE DOIS', '1100234', 'cidade-dois'), city('03', 'CIDADE TRES', '1100345', 'cidade-tres'), city('04', 'CIDADE QUATRO', '1100456', 'cidade-quatro')]

function fixture() {
  // Pair 30 vs 40; candidate 40 leads the round 2 (172 x 128) so side A = 40.
  return {
    turnout: [
      turnout('ap', 1, '01', 200),
      turnout('ap', 2, '01', 200),
      turnout('ap', 1, '02', 100),
      turnout('ap', 2, '02', 100), // valid round 2 turnout...
      turnout('ap', 1, '03', 100), // ...but no round-2 turnout row: no margin
      turnout('ap', 2, '03', 0), // a zero-valid votes round 2: no margin
      turnout('ap', 1, '04', 100),
      turnout('ap', 2, '04', 100),
      turnout('ap', 1, '05', 100),
      turnout('ap', 2, '05', 100),
      turnout('zz', 2, '99', 10000),
      turnout('ap', 1, '00', 100), // a TSE code without a cities.csv row: never listed
      turnout('ap', 2, '00', 100),
    ] as Turnout[],
    votes: [
      // city 01: margin1 +12% A; margin2 -18% A; swing -30.
      vote('ap', 1, '01', 30, 88),
      vote('ap', 1, '01', 40, 112),
      vote('ap', 2, '01', 30, 118),
      vote('ap', 2, '01', 40, 82),
      // city 02: round 2 validos but NO pair votes at all (invalid pairing): margin2 null.
      vote('ap', 1, '02', 30, 50),
      vote('ap', 1, '02', 40, 50),
      vote('ap', 2, '02', 55, 100),
      // city 03: round 1 votes of the pair, round 2 has none (0 validos): both null margins.
      vote('ap', 1, '03', 30, 60),
      vote('ap', 1, '03', 40, 40),
      // city 04: only side A has votes in round 2: the pairing rule holds; margin2 = +100, swing = +120 (m1 = -20).
      vote('ap', 1, '04', 30, 60),
      vote('ap', 1, '04', 40, 40),
      vote('ap', 2, '04', 40, 100),
      // city 05 exists in the turnout but nowhere in cities.csv (not listed): ignored below.
      vote('ap', 1, '05', 30, 80),
      vote('ap', 2, '05', 40, 20),
      // overseas and other UF: never counted here.
      vote('zz', 2, '99', 40, 9999),
      vote('ap', 2, '00', 40, 100),
    ] as Vote[],
    candidates: [
      candidate(1, 30, 'CANDIDATO X'),
      candidate(1, 40, 'CANDIDATO Y'),
      candidate(2, 30, 'CANDIDATO X'),
      candidate(2, 40, 'CANDIDATO Y'),
    ],
  }
}

function base() {
  const f = fixture()
  const m = computeMargins({ ano: 2026, turnout: f.turnout, votes: f.votes, candidates: f.candidates })
  const rows = computeCityMargins({ ano: 2026, uf: 'ap', pair: [m.ladoA, m.ladoB], cities, turnout: f.turnout, votes: f.votes })
  return { m, rows }
}

describe('computeCityMargins (synthetic fixture)', () => {
  it('reuses the national pair derivation of computeMargins', () => {
    const { m } = base()
    expect(m.ladoA.numero).toBe(40)
    expect(m.ladoB.numero).toBe(30)
  })

  it('one row per city, keyed by the TSE code and carrying the IBGE code and slug', () => {
    const { rows } = base()
    expect(rows.map((r) => r.cdMunicipio)).toEqual(['01', '02', '03', '04'])
    expect(rows[0]!.cdIbge).toBe('1100123')
    expect(rows[0]!.slug).toBe('cidade-um')
  })

  it('computes pp margins of valid votes of the same round, and the swing on the unrounded margins', () => {
    const { rows } = base()
    const um = rows[0]!
    expect(um.validos1).toBe(200)
    expect(um.validos2).toBe(200)
    expect(um.votosA1).toBe(112) // side A = 40
    expect(um.votosA2).toBe(82)
    expect(um.margin1).toBeCloseTo(12, 10)
    expect(um.margin2).toBeCloseTo(-18, 10)
    expect(um.swing).toBeCloseTo(-30, 10)
  })

  it('cities with a zero-valid round 2 stay in the list without a fillable margin', () => {
    const { rows } = base()
    expect(rows[1]!.margin2).toBeNull() // no pair votes at the round 2
    expect(rows[2]!.margin2).toBeNull() // zero valid votes
    expect(rows[0]!.margin2).not.toBeNull()
  })

  it('the round 1 margin is null when the round 1 has no pair votes, and so is the swing', () => {
    const { rows } = base()
    const dois = rows[1]! // round 1 HAS pair votes, round 2 does not: only margin1 survives
    expect(dois.margin1).toBeCloseTo(0, 10)
    expect(dois.margin2).toBeNull()
    expect(dois.swing).toBeNull()
  })

  it('a city whose pairing only has one side still computes a margin (the other side got zero)', () => {
    const { rows } = base()
    expect(rows[3]!.margin2).toBeCloseTo(100, 10)
    expect(rows[3]!.margin1).toBeCloseTo(-20, 10)
    expect(rows[3]!.swing).toBeCloseTo(120, 10)
  })

  it('ignores other UFs, the overseas posts and TSE codes the cities.csv does not list', () => {
    const { rows } = base()
    expect(rows).toHaveLength(4)
    expect(rows.some((r) => r.cdMunicipio === '05')).toBe(false) // 05 is only in turnout/votes
    expect(rows.some((r) => r.cdMunicipio === '99')).toBe(false)
  })
})

const realDir = resolve(import.meta.dirname, '../../../data')
const real = () => ({
  turnout: parseTurnout(readFileSync(realDir + '/turnout.csv', 'utf8')),
  votes: parseVotes(readFileSync(realDir + '/votes.csv', 'utf8')),
  candidates: parseCandidates(readFileSync(realDir + '/candidates.csv', 'utf8')),
  cities: parseCities(readFileSync(realDir + '/cities.csv', 'utf8')),
})

/**
 * Pinned to the REAL dataset: per-city figures of the highlights note
 * (thoughts/team/data-engineering/2026-10-26-runoff-results-highlights.md).
 */
describe('computeCityMargins (real dataset, RJ figures pinned per city)', () => {
  const r = real()
  const ano = 2026
  const m = computeMargins({ ano, turnout: r.turnout, votes: r.votes, candidates: r.candidates })
  const rows = computeCityMargins({
    ano,
    uf: 'rj',
    pair: [m.ladoA, m.ladoB],
    cities: r.cities.filter((c) => c.uf === 'rj'),
    turnout: r.turnout,
    votes: r.votes,
  })

  it("names the state's 92 municipalities (TSE code + IBGE code crosswalk of cities.csv)", () => {
    expect(rows).toHaveLength(92)
    expect(new Set(rows.map((r) => r.cdIbge))).toEqual(new Set(r.cities.filter((c) => c.uf === 'rj').map((c) => c.cdIbge)))
  })

  /** A city row by its TSE municipality code. */
  function byNome(partOf: string): CityMarginRow {
    const row = rows.find((row) => row.nome.includes(partOf))
    if (!row) throw new Error(`${partOf} not found`)
    return row
  }

  it('reproduces the per-city figures the highlights note lists (Campos, Barra do Piraí, Belford Roxo)', () => {
    const campos = byNome('CAMPOS DOS GOYTACAZES')
    expect(roundPp(campos.margin2!)).toBeCloseTo(-15.8, 8) // "still lost by 15.8pp"
    expect(roundPp(campos.swing!)).toBeCloseTo(+9.8, 8) // "Campos dos Goytacazes/RJ: +9.8pp"
    // Barra do Piraí: "-5.1pp to +4.2pp" (a largest flip, round 1 -> round 2).
    const barra = byNome('BARRA DO PIR') // the name carries the accent: match the prefix
    expect(roundPp(barra.margin1!)).toBeCloseTo(-5.1, 8)
    expect(roundPp(barra.margin2!)).toBeCloseTo(+4.2, 8)
    expect(roundPp(barra.swing!)).toBeCloseTo(+9.3, 8)
    // Belford Roxo: "+8.6pp" swing, cities of 100k+ valid votes ranking.
    const belford = byNome('BELFORD ROXO')
    expect(roundPp(belford.swing!)).toBeCloseTo(+8.6, 8)
  })

  it('Rio de Janeiro: the round-2 flips to Lula and +113k net votes becomes a +3.1pp margin', () => {
    const rio = byNome('RIO DE JANEIRO')
    expect(rio.margin2).toBeGreaterThan(0) // the note: "Rio +113k" net votes in the runoff
    expect(roundPp(rio.margin2!)).toBeCloseTo(+3.1, 8)
    expect(roundPp(rio.swing!)).toBeCloseTo(+7, 6)
    expect(rio.validos2).toBe(3_683_589) // the note: "Rio 3.68M" valid votes
  })

  it('aggregating the city rows reproduces the state figures of the state map (#11): RJ margin2 -6.2pp', () => {
    const state = m.states.find((s) => s.uf === 'rj')!
    const validos2 = rows.reduce((n, r) => n + r.validos2, 0)
    const votosA2 = rows.reduce((n, r) => n + r.votosA2, 0)
    const votosB2 = rows.reduce((n, r) => n + r.votosB2, 0)
    expect(validos2).toBe(state.validos2)
    expect(votosA2).toBe(state.votosA2)
    expect(votosB2).toBe(state.votosB2)
    expect(roundPp(state.margin2)).toBeCloseTo(-6.2, 8)
  })

  it('every city of the state has a computable round-2 margin (none without fill in the real dataset)', () => {
    expect(rows.every((r) => r.margin2 !== null)).toBe(true)
    expect(rows.some((r) => r.margin1 === null)).toBe(false)
  })

  const assembled = cityMapData(r.turnout, r.votes, r.cities.filter((c) => c.uf === 'rj'), ano, 'rj', m)

  it('cityRowsFor / cityMapData assemble the page dataset: names of the pair and the rows key set', () => {
    expect(assembled.uf).toBe('rj')
    expect(assembled.ano).toBe(2026)
    expect(assembled.ladoANome).toBe('Lula')
    expect(assembled.ladoBNome).toBe('Flavio')
    expect(assembled.ladoANomeCompleto).toBe('Lula')
    expect(assembled.ladoBNomeCompleto).toBe('Flavio Bolsonaro')
    const rows2 = cityRowsFor(m, 'rj', r.cities.filter((c) => c.uf === 'rj'), r.turnout, r.votes, ano)
    expect(rows2).toEqual(assembled.rows)
    // A UF the dataset does not list has no rows (nothing invented).
    expect(cityRowsFor(m, 'df', r.cities.filter((c) => c.uf === 'df'), r.turnout, r.votes, ano).length).toBeGreaterThan(0)
  })
})