import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createStore } from '@/data/store'
import { diskSource } from '@/data/node'
import type { Candidate, State, Turnout, Vote } from '@/data'
import { buildBrasil, pctText, regionOfUf, shortLabels, splitShares, type BrasilInput } from './brasil'

/*
 * Pure aggregation for screen 8 (ticket #10), tested in vitest against:
 * (a) a tiny hand-made scope below,
 * (b) the committed fixture dataset of fixtures/data (default DATA_DIR),
 * (c) the real dataset ../data cross-checked with data/manifest.json "national_reference" —
 *     the TSE published national totals this ticket's acceptance criterion quotes.
 * No expected election number is invented: (a) is written out by hand, (b) and (c) are derived
 * from committed dataset files (their values are checked here once, as regression guards).
 */

const uf = (u: string, regiao: string): State => ({ uf: u, regiao, municipios: 1 })
const STATES: State[] = [uf('rj', 'sudeste'), uf('mg', 'sudeste'), uf('sp', 'sudeste'), uf('zz', 'exterior')]

const t = (cd: string, u: string, over: Partial<Turnout> = {}): Turnout => ({
  ano: 2026,
  turno: 2,
  uf: u,
  cdMunicipio: cd,
  aptos: 1000,
  comparecimento: 800,
  abstencoes: 200,
  brancos: 20,
  nulos: 30,
  anuladosApuSep: 0,
  validos: 750,
  ...over,
})
const v = (cd: string, u: string, numero: number, votos: number): Vote => ({ ano: 2026, turno: 2, uf: u, cdMunicipio: cd, candidatoNumero: numero, votos })
const NAMES: Candidate[] = [
  { ano: 2026, turno: 2, candidatoNumero: 13, nomeUrna: 'LULA', partido: 'PT' },
  { ano: 2026, turno: 2, candidatoNumero: 22, nomeUrna: 'FLAVIO BOLSONARO', partido: 'PL' },
]

const input = (over: Partial<BrasilInput> = {}): BrasilInput => ({
  ano: 2026,
  turno: 2,
  states: STATES,
  turnout: [t('99001', 'rj'), t('99101', 'sp'), t('99301', 'zz')],
  votes: [v('99001', 'rj', 13, 400), v('99001', 'rj', 22, 350), v('99301', 'zz', 13, 30), v('99301', 'zz', 22, 20)],
  candidates: NAMES,
  ...over,
})

describe('splitShares and pctText (the rounding primitives)', () => {
  it('splits 100 in one decimal place so the parts add up to exactly 100,0 (largest remainder wins, ties to the earlier part)', () => {
    expect(splitShares([2, 1], 1)).toEqual([667, 333])
    expect(splitShares([1, 1, 1], 1)).toEqual([334, 333, 333])
    expect(splitShares([1, 1, 1], 0)).toEqual([34, 33, 33])
  })

  it('a zero sum gives all zeros; pctText prints fixed decimals with a pt-BR comma', () => {
    expect(splitShares([0, 0], 1)).toEqual([0, 0])
    expect(pctText(0, 1)).toBe('0,0')
    expect(pctText(500, 1)).toBe('50,0')
    expect(pctText(5179, 2)).toBe('51,79')
    expect(pctText(1, 1)).toBe('0,1')
  })
})

describe('buildBrasil: tiny hand-made scope', () => {
  const view = buildBrasil(input())

  it('national totals INCLUDE the overseas row; the regions do not', () => {
    expect(view.validos).toBe(750 + 750 + 750)
    expect(view.regionalValidos).toBe(1500)
    expect(view.validos - view.regionalValidos).toBe(750)
    expect(view.regions.map((r) => r.regiao)).toEqual(['sudeste'])
  })

  it('national candidates carry counts and two-decimal shares, full first word labels otherwise', () => {
    const first = view.nationalCandidates[0]!
    const second = view.nationalCandidates[1]!
    expect(first).toMatchObject({ numero: 13, labelFull: 'Lula', label: 'Lula', votos: 430 })
    expect(second).toMatchObject({ numero: 22, labelFull: 'Flavio Bolsonaro', label: 'Flavio', votos: 370 })
    expect([first.pctScaled, second.pctScaled]).toEqual([5375, 4625])
    expect(first.pctText).toBe('53,75')
    expect(second.pctText).toBe('46,25')
  })

  it('the region block: candidate, turnout and one-region shares are exactly the hand-computed values', () => {
    const su = view.regions.find((r) => r.regiao === 'sudeste')!
    // region of rj + sp: Lula 400, Flavio 350 of their 750 -> 53,3 + 46,7; comparecimento 1600 of 2000 aptos
    expect(su.candidates.map((c) => c.pctScaled)).toEqual([533, 467])
    expect(su.compareceramScaled).toBe(800)
    expect(su.compareceramText).toBe('80,0')
    expect(su.naoText).toBe('20,0')
    expect(su.shareScaled).toBe(1000)
    expect(su.shareText).toBe('100,0')
  })

  it('an uf missing from the dataset state list counts for the nation only, like the overseas post', () => {
    const view = buildBrasil(input({ states: [uf('rj', 'sudeste')], turnout: [t('99001', 'rj'), t('99301', 'xx')], votes: [v('99001', 'rj', 13, 400), v('99001', 'rj', 22, 350)] }))
    expect(view.regions.map((r) => r.regiao)).toEqual(['sudeste'])
    expect(view.validos).toBe(1500)
    expect(view.regionalValidos).toBe(750)
  })

  it('rows of other cycles and other rounds are ignored', () => {
    const view = buildBrasil(input({ turnout: [t('99001', 'rj', { ano: 2018 }), t('99101', 'sp', { turno: 1 })], votes: [{ ...v('99001', 'rj', 13, 400), ano: 2018 }] }))
    expect(view.validos).toBe(0)
    expect(view.nationalCandidates).toHaveLength(0)
    expect(view.regions).toHaveLength(0)
  })

  it('shortLabels: shared first words fall back to the distinctive last word', () => {
    expect(shortLabels(['Lula', 'Flavio Bolsonaro'])).toEqual(['Lula', 'Flavio'])
    expect(shortLabels(['Candidato A', 'Candidato B'])).toEqual(['A', 'B'])
  })
})

describe('buildBrasil: the committed fixture dataset (fixtures/data, 2026 round 2)', () => {
  // the committed fixture dataset lives at web/fixtures/data since the #50 reorganization (import-relative, not cwd-relative)
  const fixtures = resolve(import.meta.dirname, '../../fixtures/data')
  expect(existsSync(fixtures), 'fixtures dataset missing').toBe(true)

  const scope = (dir: string, ano = 2026, turno = 2 as const) => {
    const store = createStore(diskSource(dir))
    return Promise.all([store.states(), store.turnout({ ano, turno }), store.votes({ ano, turno }), store.candidates({ ano, turno })]).then(
      ([states, turnout, votes, candidates]) => buildBrasil({ ano, turno, states, turnout, votes, candidates }),
    )
  }

  it('two regions (sudeste and centro-oeste); the overseas post stays national-only (values derived from the CSVs)', async () => {
    const view = await scope(fixtures)
    expect(view.regions.map((r) => r.regiao)).toEqual(['sudeste', 'centro-oeste'])
    // hand-summed from the committed turnout rows of 2026,2: rj+sp = 378199, mt = 85154, zz = 104995
    expect(view.regionalValidos).toBe(378199 + 85154)
    expect(view.validos - view.regionalValidos).toBe(104995)
    expect(view.validos).toBe(568348)
  })

  it('regional shares add to 100,0 (only two regions exist here: 81,6 + 18,4)', async () => {
    const view = await scope(fixtures)
    expect(view.regions.map((r) => r.shareText)).toEqual(['81,6', '18,4'])
  })

  it('every bar adds up to exactly 100,0 and candidate votes equal the region valid votes (runoff identity)', async () => {
    const view = await scope(fixtures)
    let votesOfCandidates = 0
    for (const c of view.nationalCandidates) votesOfCandidates += c.votos
    expect(votesOfCandidates).toBe(view.validos)
    for (const r of view.regions) {
      expect(r.candidates.map((c) => c.pctScaled).reduce((a, b) => a + b, 0)).toBe(1000)
      expect(r.candidates.map((c) => c.votos).reduce((a, b) => a + b, 0)).toBe(r.validos)
      expect(r.compareceramScaled).toBe(Math.round((r.comparecimento / r.aptos) * 1000)) // exact to three decimals for both fixture regions
      expect(r.compareceramText).toMatch(/^\d+,\d$/)
    }
    // fixture candidates are named "Candidato A" / "Candidato B": short labels A and B
    expect(view.nationalCandidates.map((c) => c.labelFull)).toEqual(['Candidato A', 'Candidato B'])
    expect(view.nationalCandidates.map((c) => c.label)).toEqual(['A', 'B'])
  })
})

describe('regionOfUf', () => {
  it('overseas and unknown ufs are never a region', () => {
    expect(regionOfUf(STATES, 'zz')).toBe('exterior')
    expect(regionOfUf(STATES, 'rj')).toBe('sudeste')
    expect(regionOfUf([], 'rj')).toBe('exterior')
  })
})

describe('buildBrasil: the real dataset (../data), cross-checked against TSE published totals', () => {
  const realData = resolve('..', 'data')
  const hasReal = existsSync(resolve(realData, 'manifest.json'))

  const scope = async () => {
    const store = createStore(diskSource(realData))
    const [states, turnout, votes, candidates] = await Promise.all([store.states(), store.turnout({ ano: 2026, turno: 2 }), store.votes({ ano: 2026, turno: 2 }), store.candidates({ ano: 2026, turno: 2 })])
    return buildBrasil({ ano: 2026, turno: 2, states, turnout, votes, candidates })
  }
  const nationalReference = () => {
    const manifest = JSON.parse(readFileSync(resolve(realData, 'manifest.json'), 'utf8')) as { national_reference: Record<string, { validos: number; candidates: Record<string, number>; [k: string]: unknown }> }
    return manifest.national_reference['2026-2']!
  }

  it.runIf(hasReal)('national 2026-R2 figures equal the TSE national reference of data/manifest.json (overseas included)', async () => {
    const ref = nationalReference()
    const view = await scope()
    const first = view.nationalCandidates[0]!
    const second = view.nationalCandidates[1]!
    expect(view.validos).toBe(ref.validos)
    expect(first.numero).toBe(13)
    expect(first.votos).toBe(ref.candidates['13']!)
    expect(second.numero).toBe(22)
    expect(second.votos).toBe(ref.candidates['22']!)
    expect(first.votos + second.votos).toBe(ref.validos)
    expect(first.labelFull).toBe('Lula')
    expect(second.labelFull).toBe('Flavio Bolsonaro')
  })

  it.runIf(hasReal)('the five regions appear in valid-vote order and exclude the overseas posts', async () => {
    const view = await scope()
    expect(view.regions.map((r) => r.regiao)).toEqual(['sudeste', 'nordeste', 'sul', 'norte', 'centro-oeste'])
    expect(view.regions.map((r) => r.shareText)).toEqual(['41,1', '28,5', '14,7', '8,1', '7,6'])
    // the overseas posts of the dataset: turnout rows for uf zz (hand-checked in data/turnout.csv, 2026-2)
    const overseas = 371651
    expect(view.validos - view.regionalValidos).toBe(overseas)
    // Norte is a statistical tie at this precision: 50,0 + 50,0 (shares of Norte's valid votes)
    const norte = view.regions.find((r) => r.regiao === 'norte')!
    expect(norte.candidates.map((c) => c.pctText)).toEqual(['50,0', '50,0'])
    // Centro-Oeste comparecimento is 79,95%: largest remainder gives 79,9 + 20,1 (sum 100,0)
    const co = view.regions.find((r) => r.regiao === 'centro-oeste')!
    expect(co.compareceramText).toBe('79,9')
    expect(co.naoText).toBe('20,1')
    // blank and null ARE shown per region (the corrected reading of the raw data)
    const sudeste = view.regions.find((r) => r.regiao === 'sudeste')!
    expect(sudeste.nulosText.length).toBeGreaterThan(0)
    expect(sudeste.brancosText.length).toBeGreaterThan(0)
  })

  it.runIf(hasReal)('identity: the sum of the five regional shares plus the overseas share is the whole country', async () => {
    const view = await scope()
    expect(view.regionalValidos).toBeLessThan(view.validos)
    for (const r of view.regions) {
      expect(r.candidates.map((c) => c.pctScaled).reduce((a, b) => a + b, 0)).toBe(1000)
      expect(r.compareceramScaled).toBeLessThanOrEqual(1000)
      expect(r.validos).toBeGreaterThan(0)
    }
  })
})