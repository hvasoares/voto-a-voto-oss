import { describe, expect, it } from 'vitest'
import { loadBrasil } from '../brasil-load'
import { buildCompareRows, cycleBlocksFor, stateStats } from '../compare-data'
import { gateProblems } from './gate'
import { closestRaces, computeReports } from '../reports/compute'
import { loadReportsData } from '../reports/load'
import { brasilFacts, compareFacts, raceFacts, stateCyclesFacts } from './other'

const by = (facts: { anchor: string }[]) => Object.fromEntries(facts.map((f) => [f.anchor, f])) as Record<string, (typeof facts)[number] & { sentences: { standard: string; plain: string }; calculation: { worked: string[] }; shown: string; inputs: { label: string; value: string }[]; checks: string[] }>

describe('facts of Brasil e regiões', async () => {
  const view = await loadBrasil()
  const page = brasilFacts(view, true)
  const f = by(page.facts)

  it('cover the national bar and, for each region, its share, its candidates, its turnout and its blank and null shares, through the gate', () => {
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts.map((x) => x.anchor)).toEqual(expect.arrayContaining([`pais-${view.nationalCandidates[0]!.numero}`, `${view.regions[0]!.regiao}-parcela`, `${view.regions[0]!.regiao}-comparecimento`, `${view.regions[0]!.regiao}-brancos`, `${view.regions[0]!.regiao}-nulos`]))
    expect(page.facts).toHaveLength(view.nationalCandidates.length + view.regions.length * (1 + 2 + 1 + 2))
  })
  it('the national records are checked against the national totals and the municipalities; the figure is the one the page prints', () => {
    const k = view.nationalCandidates[0]!
    expect(f[`pais-${k.numero}`]!.checks).toEqual(['national', 'municipios'])
    expect(f[`pais-${k.numero}`]!.shown).toBe(`${k.pctText}%`)
    expect(f[`pais-${k.numero}`]!.calculation.worked[0]).toMatch(/^[\d.]+ ÷ [\d.]+ × 100 = \d+,\d\d%$/)
  })
  it('the sentence names where and when, in both registers, with no winner and no cause', () => {
    const r = view.regions[0]!
    expect(f[`${r.regiao}-parcela`]!.sentences.standard).toContain(`Na região ${r.label}, no 2º turno de 2026:`)
    const text = page.facts.flatMap((x) => [x.sentences.standard, x.sentences.plain]).join(' ').toLowerCase()
    expect(text).not.toMatch(/vence|venceu|porque|por causa|ganhou|derrot|culpa|devido/)
  })
  it('the way back and the rounds (for the seal) are the page and its round', () => {
    expect(page.back.path).toBe('brasil/')
    expect(page.rounds).toEqual([{ ano: 2026, turno: 2 }])
  })
})

describe('facts of the comparison pages', async () => {
  const rows = (await buildCompareRows(await stateStats(), 2022)).slice(0, 6)
  const page = compareFacts(rows, 2022, true)
  const f = by(page.facts)

  it('give both sides of every state row two records with the votes of both cycles and the change, through the gate', () => {
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts).toHaveLength(rows.length * 2)
    const row = rows[0]!
    expect(f[`${row.uf}-a`]!.inputs.map((i) => i.value)).toEqual([row.left.votos26, row.validos, row.left.votosOld, row.validosOld].map((n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')))
    expect(f[`${row.uf}-a`]!.calculation.worked).toHaveLength(3)
    expect(f[`${row.uf}-a`]!.shown).toBe(`${row.left.pct26}% · 2022: ${row.left.pctOld}%`)
  })
  it('say that the change is between cycles, never a difference between the candidates', () => {
    expect(f[`${rows[0]!.uf}-a`]!.sentences.standard).toContain('variação de')
    expect(f[`${rows[0]!.uf}-a`]!.sentences.standard).toContain('entre os dois ciclos')
  })
  it('cite the note of the method and are checked against the municipalities of both cycles', () => {
    expect(page.facts[0]!.method!.href).toContain('issue-14.md')
    expect(page.rounds).toEqual([{ ano: 2026, turno: 2 }, { ano: 2022, turno: 2 }])
  })
})

describe('facts of the state three-cycles page', async () => {
  const stats = await stateStats()
  const rj = stats.find((s) => s.uf === 'rj')!
  const page = stateCyclesFacts('rj', cycleBlocksFor(rj), true)
  const f = by(page.facts)

  it('has each cycle with data: two shares and the change (or the start of the series), through the gate', () => {
    expect(gateProblems(page.facts)).toEqual([])
    expect(Object.keys(f)).toEqual(['2018-a', '2018-b', '2018-variacao', '2022-a', '2022-b', '2022-variacao', '2026-a', '2026-b', '2026-variacao'])
    expect(f['2018-variacao']!.sentences.standard).toContain('ponto de partida da série')
    expect(f['2022-variacao']!.sentences.standard).toMatch(/pontos percentuais em relação a 2018\.$/)
  })
  it('the change is computed from the unrounded shares and the line shows both', () => {
    expect(f['2022-variacao']!.calculation.worked[0]).toMatch(/^\d+,\d\d% − \d+,\d\d% = [+-]\d+,\d pontos percentuais$/)
  })
  it('a cycle with no data has no record (never a zero) and the seal rounds are the cycles with data', async () => {
    const mt = stats.find((s) => s.uf === 'mt')
    const p = stateCyclesFacts('mt', cycleBlocksFor(mt!), true)
    expect(p.facts.every((x) => x.anchor.startsWith('2026'))).toBe(true)
    expect(p.rounds).toEqual([{ ano: 2026, turno: 2 }])
  })
})

describe('facts of the closest-races report', async () => {
  const { margins, pair } = computeReports(await loadReportsData())
  const races = closestRaces(margins).slice(0, 5)
  const page = raceFacts(races, { primeiro: 'Lula', segundo: 'Flavio' }, (n) => n, true)

  it('has one record per shown row, with both vote counts as inputs and the difference as the worked line, through the gate', () => {
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts).toHaveLength(races.length)
    const r = races[0]!
    const f = page.facts[0]!
    expect(f.anchor).toBe(`${r.uf}-${r.slug}`)
    expect(f.inputs).toHaveLength(2)
    expect(f.calculation!.worked[0]).toMatch(/^[\d.]+ − [\d.]+ = [\d.]+$/)
    expect(f.sentences.standard).toContain('a diferença entre eles é de')
  })
  it('names both candidates the same way and says no cause', () => {
    const text = page.facts.map((f) => f.sentences.standard + f.sentences.plain).join(' ').toLowerCase()
    expect(text).toContain('lula')
    expect(text).toContain('flavio')
    expect(text).not.toMatch(/vence|venceu|porque|por causa|ganhou|derrot|culpa|devido/)
  })
})
