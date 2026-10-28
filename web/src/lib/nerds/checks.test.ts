import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CATALOG } from './catalog'
import { checkPlace, RULES } from './checks'
import { claimProblems, claimsOf } from './claims'
import { assertCatalog, specFor, validatePanel, type PanelRecord } from './panels'
import { readPlace } from './shards'
import { buildSignals } from './signals'
import type { LevelShard } from './types'

const root = resolve(process.cwd(), 'fixtures/data/nerds')
const edition = { id: '2026-10-26', date: '2026-10-26' }
const place = (level: 'brasil' | 'regiao' | 'uf', id: string | null) => readPlace(level, id, root)
const info = { level: 'estado', name: 'Rio de Janeiro' } as const
const clone = (m: ReadonlyMap<string, LevelShard>) => new Map([...m].map(([k, v]) => [k, structuredClone(v)]))

describe('Invariantes: every rule is a pure check over the shards', () => {
  it('passes every rule that can be checked on the fixture, and says "não conferido" (null) for the seções, which the dataset does not carry', () => {
    for (const [level, id, i] of [['brasil', null, { level: 'brasil', name: 'Brasil' }], ['regiao', 'sudeste', { level: 'regiao', name: 'Sudeste' }], ['uf', 'rj', info]] as const) {
      const results = checkPlace(place(level, id), level === 'brasil' ? undefined : place('brasil', null), i)
      expect(results.filter((r) => r.ok === false), `${level}`).toEqual([])
      expect(results.find((r) => r.id === 'secoes')!.ok).toBeNull()
      expect(results.filter((r) => r.ok === true).map((r) => r.id)).toContain('soma-filhos')
    }
  })

  it('finds a corrupted shard: a município row that no longer sums to the estado fails the rule, in the page model and in the strip', () => {
    const shards = clone(place('uf', 'rj'))
    shards.get('2022-1')!.children.municipios![0]!.comparecimento += 7
    const signals = buildSignals(shards, place('brasil', null), info, edition, true)
    const failed = signals.failed.map((r) => r.id)
    expect(failed).toContain('soma-filhos')
    expect(failed).toContain('comparecimento-abstencao') // the corrupted row no longer closes either
    expect(signals.uncheckedCycles).toEqual([2022])
    expect(signals.conference.ok).toBe(false)
    expect(signals.conference.value).toMatch(/conferências? falh/)
    expect(signals.banner).toContain('Soma dos municípios = Rio de Janeiro')
    expect(signals.failed.find((r) => r.id === 'soma-filhos')!.failures[0]).toMatchObject({ ano: 2022, turno: 1 })
  })

  it('finds a total that disagrees with its row in the Brasil shard, and a negative value', () => {
    const shards = clone(place('uf', 'rj'))
    shards.get('2026-2')!.total.eleitorado += 1
    const negative = clone(place('uf', 'sp'))
    negative.get('2018-1')!.total.validos = -1
    expect(checkPlace(shards, place('brasil', null), info).find((r) => r.id === 'parte-do-brasil')!.ok).toBe(false)
    expect(checkPlace(negative, place('brasil', null), info).find((r) => r.id === 'sem-negativos')!.ok).toBe(false)
  })

  it('keeps the strip minimal when all pass: no banner, no unchecked cycle, the edition says whether it is the latest', () => {
    const s = buildSignals(place('uf', 'rj'), place('brasil', null), info, edition, true)
    expect(s.banner).toBeUndefined()
    expect(s.uncheckedCycles).toEqual([])
    expect(s.conference.value).toBe('Os números fecham')
    expect(s.edition.value).toContain('é a mais recente')
    expect(buildSignals(place('uf', 'rj'), place('brasil', null), info, edition, false).edition.value).toContain('não é a mais recente')
  })
})

describe('data contracts from footer claims', () => {
  it('matches each claim in the shipped footers to an executable rule', () => {
    const claims = CATALOG.flatMap((r) => [r.footer.definicao, r.footer.calculo].flatMap((t) => claimsOf(t)))
    expect(claims.length).toBeGreaterThan(0)
    expect(claims.filter((c) => c.rule === undefined)).toEqual([])
    const known = new Set(RULES.map((r) => r.id))
    for (const c of claims) expect(known.has(c.rule!)).toBe(true)
  })

  it('fails the build for a footer claim that has no matching check (failing fixture), naming the panel and the claim', () => {
    const base = CATALOG.find((r) => r.id === 'detalhe')!
    const bad: PanelRecord = { ...base, id: 'promete-demais', footer: { ...base.footer, calculo: 'A soma dos eleitores é igual ao dobro dos votos.  Todo valor fecha em 100%.' } }
    expect(claimProblems(bad.id, bad.footer as never)[0]).toContain('panel "promete-demais": footer claim')
    expect(() => assertCatalog([bad])).toThrow('has no matching executable check')
    expect(validatePanel(base)).toEqual([])
  })

  it('does not treat a definition or the "não mede" line as a claim', () => {
    expect(claimsOf('Comparecimento = votantes ÷ eleitorado. Abstenção = não votantes ÷ eleitorado.')).toEqual([])
    expect(claimProblems('x', { naoMede: 'Se o resultado oficial está correto; só se os números fecham entre si.' })).toEqual([])
  })
})

describe('Sinais and Invariantes as panel specs', () => {
  const sinais = CATALOG.find((r) => r.id === 'sinais')!
  const invariantes = CATALOG.find((r) => r.id === 'invariantes')!
  const signals = buildSignals(place('uf', 'rj'), place('brasil', null), info, edition, true)

  it('draws three stats and a list of rules with their situation', () => {
    const strip = specFor(sinais, { cycle: {}, all: place('uf', 'rj'), signals })
    expect('strip' in strip && strip.strip.map((s) => s.key)).toEqual(['cobertura', 'conferencia', 'edicao'])
    const list = specFor(invariantes, { cycle: {}, all: place('uf', 'rj'), signals })
    expect(list.kind).toBe('table')
    if (list.kind !== 'table') return
    expect(list.rows.map((r) => r.cells[0])).toContain('✓ Passou')
    expect(list.rows.find((r) => r.id === 'secoes')).toBeUndefined() // the seções rule is listed on Brasil only
  })
})
