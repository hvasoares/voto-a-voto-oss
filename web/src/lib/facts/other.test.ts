import { describe, expect, it } from 'vitest'
import { loadBrasil } from '../brasil-load'
import { buildCompareRows, cycleBlocksFor, stateStats } from '../compare-data'
import { gateProblems } from './gate'
import { closestRaces, computeReports } from '../reports/compute'
import { loadReportsData } from '../reports/load'
import { brasilFacts, compareFacts, OLDER_ANCHORS, olderCyclesFacts, raceFacts, stateCyclesFacts } from './other'

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
  it('with the state\'s city arcs it adds the pivot record: in how many cities the side changed in 2026, through the gate', () => {
    const withArcs = stateCyclesFacts('rj', cycleBlocksFor(rj), true, { same: 3, switched2022: 1, switched2026: 1, returned: 0, switchedTwice: 0, tie: 0, missing: 1 })
    expect(gateProblems(withArcs.facts)).toEqual([])
    const turned = by(withArcs.facts)['2026-viradas']!
    expect(turned.shown).toBe('1 de 5')
    expect(turned.sentences.standard).toBe('Em RJ, entre 2022 e 2026, o lado com mais votos no 2º turno mudou em 1 das 5 cidades com os três ciclos.')
    expect(turned.calculation!.worked).toEqual(['1 de 5 cidades'])
    expect(withArcs.facts.find((x) => x.anchor === '2026-viradas')!.method).toBeDefined()
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

describe('the page of the rules of the earlier cycles', () => {
  const page = olderCyclesFacts(true, [{ ano: 2018, turno: 1 }, { ano: 2018, turno: 2 }, { ano: 2022, turno: 1 }, { ano: 2022, turno: 2 }])
  it('has one record for every kind of figure the city card prints, through the gate', () => {
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts.map((x) => x.anchor).sort()).toEqual([...new Set(Object.values(OLDER_ANCHORS))].sort())
  })
  it('says it is the rule, not the city\'s numbers, and keeps the same ids whatever the data', () => {
    expect(page.facts.every((x) => x.id.startsWith('metodo/ciclos-anteriores/'))).toBe(true)
    expect(page.facts[0]!.sentences.standard).toContain('não têm página própria')
    expect(page.facts[0]!.sentences.plain).toContain('não têm página própria')
    expect(page.rounds).toHaveLength(4)
  })
})

describe('facts of the other reports, the hub and the state page', async () => {
  const { biggestSwing, MIN_BIG_SWING_VALIDOS, MIN_FLIP_VALIDOS, MIN_TURNOUT_APTOS, rankedBigSwings, rankedFlipsToLula, rankedTurnout, rankedVoteDeltas, turnoutExtremes, flipsToLula, flipsToFlavio } = await import('../reports/compute')
  const { loadCohortData } = await import('../cohorts-load')
  const { cohortFacts, deltaFacts, hubFacts, stateCountFacts, swingFacts, turnoutListFacts } = await import('./other')
  const data = await loadReportsData()
  const reports = computeReports(data)
  const { margins, pair } = reports
  const names = { primeiro: pair.nomePrimeiro, segundo: pair.nomeSegundo }
  const label = (nome: string, uf: string) => `${nome}/${uf.toUpperCase()}`
  const neutral = (facts: { sentences: { standard: string; plain: string } }[]) => facts.flatMap((x) => [x.sentences.standard, x.sentences.plain]).join(' ').toLowerCase()
  const noCause = /porque|por causa|culpa|devido|merec|melhor|pior|vence[ud]/

  it('Cidades que viraram: one record per listed city with both rounds’ margins and the change, and the arithmetic closes', () => {
    const rows = rankedFlipsToLula(margins)
    const page = swingFacts(rows, names, label, true, { slug: 'cidades-que-viraram', name: 'Cidades que viraram no 2º turno', min: MIN_FLIP_VALIDOS })
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts).toHaveLength(rows.length)
    if (rows[0]) {
      const r = rows[0]
      const f = page.facts[0]!
      expect(f.anchor).toBe(`${r.uf}-${r.slug}`)
      expect(f.inputs).toHaveLength(6)
      expect(f.calculation!.worked).toHaveLength(3)
      expect(f.checks).toEqual(['municipios'])
    }
    expect(neutral(page.facts)).not.toMatch(noCause)
  })
  it('Maiores viradas: the counts the page states are records too (the filter and the cities that moved the other way)', () => {
    const big = rankedBigSwings(margins)
    const page = swingFacts(big.toward, names, label, true, { slug: 'maiores-viradas', name: 'Maiores viradas', min: MIN_BIG_SWING_VALIDOS, away: big.awayCount })
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts.map((x) => x.anchor)).toEqual(expect.arrayContaining(['filtro', 'contrario']))
    expect(page.facts.find((x) => x.anchor === 'filtro')!.shown).toBe(String(big.toward.length))
  })
  it('Comparecimento: both lists and the count, each rate with its volume', () => {
    const t = rankedTurnout(data)
    const page = turnoutListFacts(t.highest.slice(0, 10), t.lowest.slice(0, 10), t.compared, MIN_TURNOUT_APTOS, label, true)
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts.filter((x) => x.anchor.startsWith('alto-'))).toHaveLength(Math.min(10, t.highest.length))
    expect(page.facts.find((x) => x.anchor === 'filtro')!.shown).toBe(String(t.compared))
    const first = page.facts[0]!
    expect(first.inputs.map((i) => i.field)).toEqual(['turnout.csv · comparecimento', 'turnout.csv · aptos'])
  })
  it('Votos ganhos e perdidos: the total of each candidate and the listed cities, 2022 votes recovered from 2026 minus the change', () => {
    const sec = (key: 'primeiro' | 'segundo') => {
      const ranked = rankedVoteDeltas(reports.voteDeltas[key])
      return { key, name: names[key], net: reports.netVotes[key], unchanged: ranked.unchanged, gains: ranked.gains.slice(0, 10), losses: ranked.losses.slice(0, 10) }
    }
    const page = deltaFacts([sec('primeiro'), sec('segundo')], label, true)
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts.map((x) => x.anchor)).toEqual(expect.arrayContaining(['primeiro-total', 'segundo-total']))
    expect(page.facts.find((x) => x.anchor === 'primeiro-total')!.inputs.map((i) => i.value)[0]).toBe(page.facts.find((x) => x.anchor === 'primeiro-total')!.shown)
    expect(page.rounds).toEqual([{ ano: 2022, turno: 2 }, { ano: 2026, turno: 2 }])
  })
  it('Como cada grupo votou: counts cities, says so and states the limits; no cause, no ranking of groups or people', async () => {
    const { report } = await loadCohortData()
    const page = cohortFacts(report, true)
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts.map((x) => x.anchor)).toContain('fora')
    expect(page.note).toContain('contam cidades'.replace('contam', 'conta'))
    expect(page.note).toContain('não diz quem votou em quem')
    const text = neutral(page.facts)
    expect(text).toContain('cidades')
    expect(text).not.toMatch(/porque|por causa|culpa|devido|merec|melhor|pior/)
    expect(text).not.toMatch(/eleitores d[aoe]s? grupo|pessoas d[aoe]s? grupo|os eleitores d/)
    const total = page.facts.find((x) => x.anchor === 'fora')!
    expect(total.calculation!.worked[0]).toMatch(/^[\d.]+ \+ [\d.]+ \+ [\d.]+ = [\d.]+$/)
  })
  it('the hub: one record for each headline figure, the same builders as the reports', () => {
    const page = hubFacts({ names, flips: { primeiro: flipsToLula(margins).length, segundo: flipsToFlavio(margins).length }, biggest: biggestSwing(margins), net: reports.netVotes, race: closestRaces(margins)[0], turnout: turnoutExtremes(data) }, label, true)
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts.map((x) => x.anchor)).toEqual(expect.arrayContaining(['cidades-que-viraram', 'votos-ganhos-e-perdidos', 'disputas-mais-apertadas', 'comparecimento']))
    expect(page.facts.find((x) => x.anchor === 'cidades-que-viraram')!.shown).toBe(String(flipsToLula(margins).length).replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
  })
  it('the state page: the count of municipalities, from cities.csv', () => {
    const page = stateCountFacts('rj', 'Rio de Janeiro', 3, true)
    expect(gateProblems(page.facts)).toEqual([])
    expect(page.facts[0]).toMatchObject({ id: 'estado/rj/municipios/municipios', shown: '3' })
    expect(page.back.path).toBe('rj/')
  })
})
