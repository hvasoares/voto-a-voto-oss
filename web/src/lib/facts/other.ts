/**
 * The fact records of the pages other than the city card (#62), PURE: Brasil e regiões, Comparar com 2022 / 2018 and Três ciclos por estado.
 * Same shape and same gate as the city card's records; the figures are the ones the pages print (their models, `brasil.ts` and `compare.ts`),
 * the words are the catalog's (`fact.*`). A page of records carries what the page of the calculation needs (title, way back) and what its
 * seal needs (the checks and the rounds the numbers belong to).
 */
import type { BrasilCandidate, BrasilView } from '../brasil'
import type { CompareRow, CycleBlock } from '../compare'
import type { CityMargin, TurnoutExtreme, VoteDeltaRow, VoteGain } from '../reports/compute'
import type { OutlierRow } from '../reports/outliers'
import { formatFixedPct, formatSignedInt, formatSignedPp } from '../reports/format'
import type { CohortReport } from '../cohorts'
import type { ArcCounts } from '../arcs'
import { citiesChanged } from '../season'
import { formatInt, formatPct } from '@/shared/city-model'
import '../sentences/catalog-facts'
import { DEFAULT_LOCALE, message as say, REGISTERS, type MessageKey, type Register } from '../sentences/catalog'
import type { CheckKind } from './checks'
import { factId, METHOD_DOCS, TSE_URL, type Fact, type FactInput } from './model'

/** One page of records and what its page needs to be drawn. */
export interface FactPage {
  scope: string
  page: string
  /** The `<h1>` subtitle and the way back to the page the numbers are on. */
  subtitle: string
  title: string
  back: { path: string; label: string }
  fixture: boolean
  facts: Fact[]
  /** What the seal of the page is made of: the checks of its facts and the rounds its numbers belong to. */
  rounds: { ano: number; turno: number }[]
  /** An extra line of the page (its limits), already written from the catalog. */
  note?: string
}

type Params = Record<string, string | number>
const std = (key: MessageKey, params: Params = {}) => say({ locale: DEFAULT_LOCALE, register: 'standard' }, key, params)
const both = (key: MessageKey, params: Params): Record<Register, string> => Object.fromEntries(REGISTERS.map((r) => [r, say({ locale: DEFAULT_LOCALE, register: r }, key, params)])) as Record<Register, string>
const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)
const int = formatInt
/** `part ÷ whole × 100 = x%`; the exact value has one decimal, or two where the page prints two (the national bar). */
const dividing = (part: number, whole: number, decimals = 1): string =>
  whole > 0 ? std('fact.w.share', { part: int(part), whole: int(whole), exact: decimals === 2 ? `${share(part, whole).toFixed(2).replace('.', ',')}%` : formatPct(share(part, whole)) }) : std('fact.w.none', { whole: int(whole) })

export interface Ctx {
  scope: string
  page: string
  fixture: boolean
  checks: CheckKind[]
}
const rec = (c: Ctx, anchor: string, title: string, shown: string, sentences: Record<Register, string>, inputs: FactInput[], formula: string, worked: string[], method?: Fact['method']): Fact => ({
  id: factId(c.scope, c.page, anchor),
  scope: c.scope,
  page: c.page,
  anchor,
  title,
  shown,
  sentences,
  inputs,
  calculation: { formula, worked },
  source: { name: std(c.fixture ? 'fact.source.fixture' : 'fact.source.tse'), url: TSE_URL },
  checks: c.checks,
  method,
})

/** Brasil e regiões: the national bar, and per region its share of the country, its candidates' shares, its turnout and its blank and null shares. */
export function brasilFacts(view: BrasilView, fixture: boolean): FactPage {
  const c: Ctx = { scope: 'brasil', page: `${view.ano}-${view.turno}`, fixture, checks: ['national', 'municipios'] }
  const where = (name?: string) => (name ? std('fact.where.regiao', { name, turno: view.turno, ano: view.ano }) : std('fact.where.brasil', { turno: view.turno, ano: view.ano }))
  const facts: Fact[] = []
  const candidate = (anchor: string, name: string | undefined, k: BrasilCandidate, validos: number, text: string, decimals = 1) => {
    const w = where(name)
    facts.push(
      rec(c, anchor, `${name ? `${name} · ` : ''}${k.labelFull}`, `${text}%`, both('fact.share', { where: w, label: k.labelFull, votos: int(k.votos), validos: int(validos), pct: decimals === 2 ? `${share(k.votos, validos).toFixed(2).replace('.', ',')}%` : formatPct(share(k.votos, validos)) }),
        [{ label: std('fact.in.votos', { name: k.labelFull }), field: 'votes.csv · votos', value: int(k.votos) }, { label: std('fact.in.validos'), field: 'turnout.csv · validos', value: int(validos) }], std('fact.f.candidate'), [dividing(k.votos, validos, decimals)]),
    )
  }
  for (const k of view.nationalCandidates) candidate(`pais-${k.numero}`, undefined, k, view.validos, k.pctText, 2)
  for (const r of view.regions) {
    const w = where(r.label)
    facts.push(
      rec(c, `${r.regiao}-parcela`, `${r.label} · ${std('fact.in.regionValidos')}`, `${r.shareText}%`, both('fact.region', { where: w, votos: int(r.validos), total: int(view.regionalValidos), pct: formatPct(share(r.validos, view.regionalValidos)) }),
        [{ label: std('fact.in.regionValidos'), field: 'turnout.csv · validos', value: int(r.validos) }, { label: std('fact.in.nationalValidos'), value: int(view.regionalValidos) }], std('fact.f.regionShare'), [dividing(r.validos, view.regionalValidos)]),
    )
    for (const k of r.candidates) candidate(`${r.regiao}-${k.numero}`, r.label, k, r.validos, k.pctText)
    facts.push(
      rec(c, `${r.regiao}-comparecimento`, `${r.label} · ${std('fact.in.comparecimento')}`, `${r.compareceramText}%`, both('fact.turnout', { where: w, votos: int(r.comparecimento), aptos: int(r.aptos), pct: formatPct(share(r.comparecimento, r.aptos)) }),
        [{ label: std('fact.in.comparecimento'), field: 'turnout.csv · comparecimento', value: int(r.comparecimento) }, { label: std('fact.in.aptos'), field: 'turnout.csv · aptos', value: int(r.aptos) }], std('fact.f.turnout'), [dividing(r.comparecimento, r.aptos)]),
    )
    for (const [key, label, count, text] of [['brancos', std('fact.in.brancos'), r.brancos, r.brancosText], ['nulos', std('fact.in.nulos'), r.nulos, r.nulosText]] as const)
      facts.push(
        rec(c, `${r.regiao}-${key}`, `${r.label} · ${label}`, `${text}%`, both('fact.partTurnout', { where: w, label: label.toLowerCase(), votos: int(count), total: int(r.comparecimento), pct: formatPct(share(count, r.comparecimento)) }),
          [{ label, field: `turnout.csv · ${key}`, value: int(count) }, { label: std('fact.in.comparecimento'), field: 'turnout.csv · comparecimento', value: int(r.comparecimento) }], std('fact.f.partTurnout'), [dividing(count, r.comparecimento)]),
      )
  }
  return { scope: c.scope, page: c.page, title: 'Brasil e regiões', subtitle: std('fact.sub.brasil', { ano: view.ano }), back: { path: 'brasil/', label: std('fact.back.brasil') }, fixture, facts, rounds: [{ ano: view.ano, turno: view.turno }] }
}

/** Comparar com 2022 / 2018: per state, per side, the votes of 2026 and of the compared cycle and the change between them. */
export function compareFacts(rows: readonly CompareRow[], ciclo: number, fixture: boolean): FactPage {
  const c: Ctx = { scope: `comparar/${ciclo}`, page: 'estados', fixture, checks: ['municipios'] }
  const facts = rows.flatMap((row) =>
    ([['a', row.left], ['b', row.rival]] as const).map(([key, side]) => {
      const name = row.uf.toUpperCase()
      return rec(
        c,
        `${row.uf}-${key}`,
        `${name} · ${side.label}`,
        `${side.pct26}% · ${ciclo}: ${side.pctOld}%`,
        both('fact.compare', { name, label: side.label, votos26: int(side.votos26), pct26: `${side.pct26}%`, votosOld: int(side.votosOld), pctOld: `${side.pctOld}%`, ano: ciclo, diff: `${side.diffVotes > 0 ? '+' : side.diffVotes < 0 ? '−' : ''}${int(Math.abs(side.diffVotes))}` }),
        [
          { label: std('fact.in.votosAt', { name: side.label, ano: 2026 }), field: 'votes.csv · votos', value: int(side.votos26) },
          { label: std('fact.in.validos') + ' · 2026', field: 'turnout.csv · validos', value: int(row.validos) },
          { label: std('fact.in.votosAt', { name: side.label, ano: ciclo }), field: 'votes.csv · votos', value: int(side.votosOld) },
          { label: std('fact.in.validos') + ` · ${ciclo}`, field: 'turnout.csv · validos', value: int(row.validosOld) },
        ],
        `${std('fact.f.candidate')}; ${std('fact.f.diffVotes')}`,
        [dividing(side.votos26, row.validos), dividing(side.votosOld, row.validosOld), std('fact.w.diff', { a: int(side.votos26), b: int(side.votosOld), d: `${side.diffVotes > 0 ? '+' : ''}${int(side.diffVotes)}` })],
        { name: std(METHOD_DOCS.cycles.key), href: METHOD_DOCS.cycles.href },
      )
    }),
  )
  return { scope: c.scope, page: c.page, title: `Comparar com ${ciclo}`, subtitle: std('fact.sub.compare', { ano: ciclo }), back: { path: `comparar/${ciclo}/`, label: std('fact.back.compare', { ano: ciclo }) }, fixture, facts, rounds: [{ ano: 2026, turno: 2 }, { ano: ciclo, turno: 2 }] }
}

/** Três ciclos por estado: per cycle with data, each side's share of the valid votes and the change in points against the cycle before. */
export function stateCyclesFacts(uf: string, blocks: readonly CycleBlock[], fixture: boolean, arcs?: ArcCounts): FactPage {
  const c: Ctx = { scope: `estado/${uf}`, page: 'tres-ciclos', fixture, checks: ['municipios'] }
  const name = uf.toUpperCase()
  const facts: Fact[] = []
  let previous: CycleBlock | undefined
  for (const b of blocks) {
    if (b.status !== 'data' || !b.left || !b.rival || !b.validos) continue
    const where = std('fact.where.estado', { name, turno: 2, ano: b.ano })
    for (const [key, side] of [['a', b.left], ['b', b.rival]] as const)
      facts.push(
        rec(c, `${b.ano}-${key}`, `${b.ano} · ${side.label}`, `${side.pct}%`, both('fact.share', { where, label: side.label, votos: int(side.votes), validos: int(b.validos), pct: formatPct(share(side.votes, b.validos)) }),
          [{ label: std('fact.in.votosAt', { name: side.label, ano: b.ano }), field: 'votes.csv · votos', value: int(side.votes) }, { label: std('fact.in.validos'), field: 'turnout.csv · validos', value: int(b.validos) }], std('fact.f.candidate'), [dividing(side.votes, b.validos)]),
      )
    if (b.changePp && previous?.left) {
      const now = b.left.share
      const then = previous.left.share
      const pp = (x: number) => (Math.round(x * 100) / 100).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })
      facts.push(
        rec(c, `${b.ano}-variacao`, `${b.ano} · ${b.left.label}`, `${b.changePp} pp`, both('fact.change', { where, label: b.left.label, pct: `${b.left.pct}%`, pp: b.changePp, prev: String(previous.ano) }),
          [{ label: std('fact.in.shareAt', { name: b.left.label, ano: b.ano }), value: `${pp(now)}%` }, { label: std('fact.in.shareAt', { name: b.left.label, ano: previous.ano }), value: `${pp(then)}%` }], std('fact.f.changePp'), [std('fact.w.pp', { a: pp(now), b: pp(then), d: b.changePp })],
          { name: std(METHOD_DOCS.cycles.key), href: METHOD_DOCS.cycles.href }),
      )
    } else if (!b.changePp) {
      facts.push(rec(c, `${b.ano}-variacao`, `${b.ano} · ${b.left.label}`, '', both('fact.start', { where, label: b.left.label, pct: `${b.left.pct}%` }), [{ label: std('fact.in.votosAt', { name: b.left.label, ano: b.ano }), value: int(b.left.votes) }], std('fact.f.candidate'), [dividing(b.left.votes, b.validos)]))
    }
    previous = b
  }
  // The season's pivot (#42): in how many cities of the state the side with the most votes changed in 2026, from the city arcs (#41).
  const counted = arcs && citiesChanged(arcs)
  if (arcs && counted && counted.total > 0) {
    const { n, total } = counted
    facts.push(
      rec(c, '2026-viradas', std('fact.in.turned'), `${n} de ${total}`, both('fact.state.turned', { name, n: int(n), total: int(total) }),
        [{ label: std('fact.in.turned'), value: int(n) }, { label: std('fact.in.kept'), value: int(total - n) }], std('fact.f.turned'), [std('fact.w.turned', { n: int(n), total: int(total) })],
        { name: std(METHOD_DOCS.arcs.key), href: METHOD_DOCS.arcs.href }),
    )
    // The story of the state (#47) counts the other arcs the same way: each is a count of cities over the same base, with its own record.
    const method = { name: std(METHOD_DOCS.arcs.key), href: METHOD_DOCS.arcs.href }
    for (const [anchor, key, count] of [
      ['2022-viradas', 'fact.arc.turned22', arcs.switched2022 + arcs.returned + arcs.switchedTwice],
      ['voltaram', 'fact.arc.returned', arcs.returned],
      ['sem-mudanca', 'fact.arc.steady', arcs.same],
    ] as const) {
      const what = std(key)
      facts.push(
        rec(c, anchor, std('fact.in.arc', { what }), `${count} de ${total}`, Object.fromEntries(REGISTERS.map((r) => [r, say({ locale: DEFAULT_LOCALE, register: r }, 'fact.state.arc', { name, what: say({ locale: DEFAULT_LOCALE, register: r }, key), n: int(count), total: int(total) })])) as Record<Register, string>,
          [{ label: std('fact.in.arc', { what }), value: int(count) }, { label: std('fact.in.arcTotal'), value: int(total) }], std('fact.f.arc'), [std('fact.w.arc', { n: int(count), total: int(total) })], method),
      )
    }
  }
  const rounds = blocks.filter((b) => b.status === 'data').map((b) => ({ ano: b.ano, turno: 2 }))
  return { scope: c.scope, page: c.page, title: name, subtitle: std('fact.sub.state', { name }), back: { path: `tres-ciclos/${uf}/`, label: std('fact.back.state') }, fixture, facts, rounds }
}

/** Disputas mais apertadas (a report, #62): per city of the shown rows, the votes of the two candidates and the difference between them, as the report prints it. */
export function raceFacts(races: readonly { nome: string; uf: string; slug: string; diff: number; votos: { primeiro: number; segundo: number } }[], names: { primeiro: string; segundo: string }, cityName: (nome: string) => string, fixture: boolean): FactPage {
  const c: Ctx = { scope: 'relatorios/disputas-mais-apertadas', page: 'cidades', fixture, checks: ['municipios'] }
  const report = 'Disputas mais apertadas'
  const facts = races.map((r) => {
    const city = `${cityName(r.nome)}/${r.uf.toUpperCase()}`
    return rec(
      c,
      `${r.uf}-${r.slug}`,
      city,
      int(r.diff),
      both('fact.race', { city, a: int(r.votos.primeiro), nameA: names.primeiro, b: int(r.votos.segundo), nameB: names.segundo, diff: int(r.diff) }),
      [{ label: std('fact.in.votos', { name: names.primeiro }), field: 'votes.csv · votos', value: int(r.votos.primeiro) }, { label: std('fact.in.votos', { name: names.segundo }), field: 'votes.csv · votos', value: int(r.votos.segundo) }],
      std('fact.f.race'),
      [std('fact.w.diff', { a: int(Math.max(r.votos.primeiro, r.votos.segundo)), b: int(Math.min(r.votos.primeiro, r.votos.segundo)), d: int(r.diff) })],
    )
  })
  return { scope: c.scope, page: c.page, title: report, subtitle: std('fact.sub.report', { name: report }), back: { path: 'relatorios/disputas-mais-apertadas/', label: std('fact.back.report', { name: report }) }, fixture, facts, rounds: [{ ano: 2026, turno: 2 }] }
}

/**
 * The cycles before the latest have no fact page per city (35,000 pages that would triple the site): the city card's "ver cálculo" of those views opens this one
 * page, which gives the rule of each kind of figure (the same formulas as the latest cycle, and where the numbers are read from). Every anchor of the card has its record here.
 */
export const OLDER_ANCHORS: Record<string, string> = {
  frase: 'frase', votaram: 'votaram', naoVotaram: 'naoVotaram', a: 'candidato', b: 'candidato', outros: 'candidato', abstencao: 'parte', brancos: 'parte', nulos: 'parte', margem: 'margem',
}
export function olderCyclesFacts(fixture: boolean, olderRounds: { ano: number; turno: number }[]): FactPage {
  const c: Ctx = { scope: 'metodo', page: 'ciclos-anteriores', fixture, checks: ['municipios', 'national'] }
  const value = std('fact.in.old')
  const kinds: [string, string, string, [string, string][]][] = [
    ['frase', std('fact.measure.frase'), std('fact.f.frase'), [[std('fact.in.aptos'), 'turnout.csv · aptos'], [std('fact.in.naoVotaram'), ''], [std('fact.in.first'), 'votes.csv · votos'], [std('fact.in.second'), 'votes.csv · votos']]],
    ['votaram', std('fact.measure.votaram'), std('fact.f.votaram'), [[std('fact.in.aptos'), 'turnout.csv · aptos'], [std('fact.in.validos'), 'turnout.csv · validos']]],
    ['naoVotaram', std('fact.measure.naoVotaram'), std('fact.f.naoVotaram'), [[std('fact.in.aptos'), 'turnout.csv · aptos'], [std('fact.in.validos'), 'turnout.csv · validos']]],
    ['candidato', std('fact.measure.candidato'), std('fact.f.candidate'), [[std('fact.in.votos', { name: std('fact.measure.candidato') }), 'votes.csv · votos'], [std('fact.in.validos'), 'turnout.csv · validos']]],
    ['parte', std('fact.measure.parte'), std('fact.f.notVotedPart'), [[std('fact.in.brancos'), 'turnout.csv · brancos'], [std('fact.in.nulos'), 'turnout.csv · nulos + anulados_apu_sep'], [std('fact.in.naoVotaram'), '']]],
    ['margem', std('fact.measure.margem'), `${std('fact.f.margin')}; ${std('fact.f.fits')}`, [[std('fact.in.first'), 'votes.csv · votos'], [std('fact.in.second'), 'votes.csv · votos'], [std('fact.in.naoVotaram'), '']]],
  ]
  const facts = kinds.map(([anchor, title, formula, inputs]) =>
    rec(c, anchor, title, '', both('fact.old', { measure: title }), inputs.map(([label, field]) => ({ label, ...(field ? { field } : {}), value })), formula, [std('fact.w.old')], anchor === 'margem' ? { name: std(METHOD_DOCS.margin.key), href: METHOD_DOCS.margin.href } : undefined),
  )
  return { scope: c.scope, page: c.page, title: std('fact.sub.old'), subtitle: std('fact.sub.old'), back: { path: 'sobre-os-dados/', label: std('fact.back.old') }, fixture, facts, rounds: olderRounds }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// The reports (#62): Cidades que viraram, Maiores viradas, Comparecimento, Votos ganhos e perdidos, Como cada grupo votou, the hub and the state pages.
// One record per listed row (the figure the row prints), one for each count the page states; the sentences are the catalog's.
// ---------------------------------------------------------------------------------------------------------------------------------------------

export interface Names {
  primeiro: string
  segundo: string
}
type CityLabel = (nome: string, uf: string) => string
const R2026 = [{ ano: 2026, turno: 1 }, { ano: 2026, turno: 2 }]
const reportPage = (c: Ctx, name: string, path: string, facts: Fact[], rounds = [{ ano: 2026, turno: 2 }], note?: string): FactPage => ({
  scope: c.scope, page: c.page, title: name, subtitle: std('fact.sub.report', { name }), back: { path, label: std('fact.back.report', { name }) }, fixture: c.fixture, facts, rounds, note,
})
const countInput = (label: string, n: number): FactInput => ({ label, value: int(n) })

/** The record of one city's margin and its change between the rounds (Cidades que viraram, Maiores viradas, the hub's biggest change). */
export function marginRecord(c: Ctx, anchor: string, r: CityMargin, names: Names, label: CityLabel): Fact {
  const city = label(r.nome, r.uf)
  const m = (a: number, b: number, whole: number, value: number) => std('fact.w.margin', { a: int(a), b: int(b), whole: int(whole), pp: formatSignedPp(value) })
  const votes = (name: string, turno: number, v: number): FactInput => ({ label: std('fact.in.votos', { name: `${name}, ${turno}º turno` }), field: 'votes.csv · votos', value: int(v) })
  const validos = (turno: number, v: number): FactInput => ({ label: `${std('fact.in.validos')}, ${turno}º turno`, field: 'turnout.csv · validos', value: int(v) })
  return rec(
    c, anchor, city, formatSignedPp(r.swing),
    both('fact.flip', { city, a: names.primeiro, b: names.segundo, m1: formatSignedPp(r.margin1), m2: formatSignedPp(r.margin2), swing: formatSignedPp(r.swing), validos: int(r.validos2) }),
    [votes(names.primeiro, 1, r.votos1.primeiro), votes(names.segundo, 1, r.votos1.segundo), validos(1, r.validos1), votes(names.primeiro, 2, r.votos2.primeiro), votes(names.segundo, 2, r.votos2.segundo), validos(2, r.validos2)],
    std('fact.f.flip'),
    [m(r.votos1.primeiro, r.votos1.segundo, r.validos1, r.margin1), m(r.votos2.primeiro, r.votos2.segundo, r.validos2, r.margin2), std('fact.w.swing', { m2: formatSignedPp(r.margin2), m1: formatSignedPp(r.margin1), pp: formatSignedPp(r.swing) })],
  )
}

/** Cidades que viraram / Maiores viradas: per listed city the margins of both rounds and the change; Maiores viradas adds its two counts. */
export function swingFacts(rows: readonly CityMargin[], names: Names, label: CityLabel, fixture: boolean, report: { slug: string; name: string; min: number; away?: number }): FactPage {
  const c: Ctx = { scope: `relatorios/${report.slug}`, page: 'cidades', fixture, checks: ['municipios'] }
  const facts = rows.map((r) => marginRecord(c, `${r.uf}-${r.slug}`, r, names, label))
  if (report.away !== undefined) {
    const minLabel = int(report.min)
    facts.push(
      rec(c, 'filtro', std('fact.in.cities'), int(rows.length), both('fact.count.validos', { n: int(rows.length), min: minLabel }), [countInput(std('fact.in.cities'), rows.length), { label: std('fact.in.minimum'), field: 'turnout.csv · validos', value: minLabel }], std('fact.f.count'), [std('fact.w.count', { n: int(rows.length), min: minLabel })]),
      rec(c, 'contrario', std('fact.in.cities'), int(report.away), both('fact.count.away', { n: int(report.away), min: minLabel, name: names.segundo }), [countInput(std('fact.in.cities'), report.away), { label: std('fact.in.minimum'), field: 'turnout.csv · validos', value: minLabel }], std('fact.f.count'), [std('fact.w.count', { n: int(report.away), min: minLabel })]),
    )
  }
  return reportPage(c, report.name, `relatorios/${report.slug}/`, facts, R2026)
}

/** One city of a turnout list. */
export function turnoutRecord(c: Ctx, anchor: string, r: TurnoutExtreme, label: CityLabel): Fact {
  const city = label(r.nome, r.uf)
  return rec(
    c, anchor, city, formatFixedPct(r.rate),
    both('fact.turnoutCity', { city, votos: int(r.comparecimento), aptos: int(r.aptos), pct: formatFixedPct(r.rate) }),
    [{ label: std('fact.in.comparecimento'), field: 'turnout.csv · comparecimento', value: int(r.comparecimento) }, { label: std('fact.in.aptos'), field: 'turnout.csv · aptos', value: int(r.aptos) }],
    std('fact.f.turnout'), [dividing(r.comparecimento, r.aptos)],
  )
}

/** Comparecimento mais alto e mais baixo: both lists and the count the filter compared. */
export function turnoutListFacts(high: readonly TurnoutExtreme[], low: readonly TurnoutExtreme[], compared: number, min: number, label: CityLabel, fixture: boolean): FactPage {
  const c: Ctx = { scope: 'relatorios/comparecimento', page: 'cidades', fixture, checks: ['municipios'] }
  const facts = [
    ...high.map((r) => turnoutRecord(c, `alto-${r.uf}-${r.slug}`, r, label)),
    ...low.map((r) => turnoutRecord(c, `baixo-${r.uf}-${r.slug}`, r, label)),
    rec(c, 'filtro', std('fact.in.cities'), int(compared), both('fact.count.aptos', { n: int(compared), min: int(min) }), [countInput(std('fact.in.cities'), compared), { label: std('fact.in.minimum'), field: 'turnout.csv · aptos', value: int(min) }], std('fact.f.count'), [std('fact.w.count', { n: int(compared), min: int(min) })]),
  ]
  return reportPage(c, 'Comparecimento mais alto e mais baixo', 'relatorios/comparecimento/', facts)
}

/** One city's change in one candidate's runoff votes against 2022. */
export function deltaRecord(c: Ctx, anchor: string, r: VoteDeltaRow, name: string, label: CityLabel): Fact {
  const city = label(r.nome, r.uf)
  const before = r.votos2026 - r.delta
  return rec(
    c, anchor, city, formatSignedInt(r.delta),
    both('fact.delta', { city, name, v26: int(r.votos2026), v22: int(before), diff: formatSignedInt(r.delta) }),
    [{ label: std('fact.in.votosAt', { name, ano: 2026 }), field: 'votes.csv · votos', value: int(r.votos2026) }, { label: std('fact.in.votosAt', { name, ano: 2022 }), field: 'votes.csv · votos', value: int(before) }],
    std('fact.f.delta'), [std('fact.w.diff', { a: int(r.votos2026), b: int(before), d: formatSignedInt(r.delta) })],
  )
}
/** The country-wide sum of those changes and the cities it is made of. */
export function deltaTotalRecord(c: Ctx, anchor: string, name: string, net: VoteGain, unchanged: number): Fact {
  return rec(
    c, anchor, name, formatSignedInt(net.total),
    both('fact.deltaTotal', { name, total: formatSignedInt(net.total), gained: int(net.cities.gained), lost: int(net.cities.lost) }),
    [{ label: std('fact.in.total'), field: 'votes.csv · votos', value: formatSignedInt(net.total) }, countInput(std('fact.in.gained'), net.cities.gained), countInput(std('fact.in.lost'), net.cities.lost), countInput(std('fact.in.tied'), unchanged)],
    std('fact.f.deltaTotal'), [std('fact.w.sum', { n: int(net.cities.gained + net.cities.lost + unchanged), total: formatSignedInt(net.total) })],
  )
}

export interface DeltaSection {
  key: 'primeiro' | 'segundo'
  name: string
  net: VoteGain
  unchanged: number
  gains: readonly VoteDeltaRow[]
  losses: readonly VoteDeltaRow[]
}
/** Votos ganhos e perdidos vs. 2022: per candidate the total and the listed gains and losses. */
export function deltaFacts(sections: readonly DeltaSection[], label: CityLabel, fixture: boolean): FactPage {
  const c: Ctx = { scope: 'relatorios/votos-ganhos-e-perdidos', page: 'cidades', fixture, checks: ['municipios'] }
  const facts = sections.flatMap((s) => [
    deltaTotalRecord(c, `${s.key}-total`, s.name, s.net, s.unchanged),
    ...s.gains.map((r) => deltaRecord(c, `${s.key}-alta-${r.uf}-${r.slug}`, r, s.name, label)),
    ...s.losses.map((r) => deltaRecord(c, `${s.key}-perda-${r.uf}-${r.slug}`, r, s.name, label)),
  ])
  return reportPage(c, 'Votos ganhos e perdidos vs. 2022', 'relatorios/votos-ganhos-e-perdidos/', facts, [{ ano: 2022, turno: 2 }, { ano: 2026, turno: 2 }])
}

/**
 * Como cada grupo votou: per group its size and valid votes, per candidate the cities where he had more votes in 2026 and their share of the group's decided cities,
 * and the totals that close. Everything counts CITIES; the page says so, and says it does not tell who voted for whom or why.
 */
export function cohortFacts(report: CohortReport, fixture: boolean): FactPage {
  const c: Ctx = { scope: 'relatorios/como-cada-grupo-votou', page: 'grupos', fixture, checks: ['municipios'] }
  const pct = (x: number) => `${String(Number(x.toFixed(1))).replace('.', ',')}%`
  const facts: Fact[] = []
  for (const g of report.groups) {
    const key = `${g.winner2018}-${g.winner2022}`
    const decided = g.parts.reduce((n, p) => n + p.cities, 0)
    facts.push(
      rec(c, key, g.title, int(g.cities), both('fact.cohort.group', { title: g.title, n: int(g.cities), validos: int(g.validos2026) }),
        [countInput(std('fact.in.groupCities'), g.cities), { label: std('fact.in.validos'), field: 'turnout.csv · validos', value: int(g.validos2026) }, countInput(std('fact.in.tied'), g.ties2026)],
        std('fact.f.count'), [std('fact.w.n', { n: int(g.cities) })]),
    )
    for (const p of g.parts)
      facts.push(
        rec(c, `${key}-${p.candidate}`, `${g.title} · ${p.label}`, pct(p.pct), both('fact.cohort', { title: g.title, n: int(g.cities), k: int(p.cities), label: p.label, pct: pct(p.pct), decided: int(decided) }),
          [{ label: std('fact.in.won', { label: p.label }), field: 'votes.csv · votos', value: int(p.cities) }, countInput(std('fact.in.decided'), decided)],
          std('fact.f.cohort'), [std('fact.w.cohort', { k: int(p.cities), decided: int(decided), exact: formatPct(share(p.cities, decided)) })]),
      )
  }
  const t = report.totals
  facts.push(
    rec(c, 'fora', std('fact.in.cities2026'), int(t.cities2026), both('fact.cohort.total', { cities: int(t.cities2026), grouped: int(t.grouped), ties: int(report.tieCases.length), nodata: int(report.noData.length) }),
      [countInput(std('fact.in.grouped'), t.grouped), countInput(std('fact.in.tiesBefore'), report.tieCases.length), countInput(std('fact.in.noData'), report.noData.length)],
      std('fact.f.cohortTotal'), [std('fact.w.cohortTotal', { grouped: int(t.grouped), ties: int(report.tieCases.length), nodata: int(report.noData.length), cities: int(t.cities2026) })]),
  )
  return reportPage(c, 'Como cada grupo votou', 'relatorios/como-cada-grupo-votou/', facts, [{ ano: 2018, turno: 2 }, { ano: 2022, turno: 2 }, { ano: 2026, turno: 2 }], say({ locale: DEFAULT_LOCALE, register: 'standard' }, 'fact.cohort.limits'))
}

export interface HubParts {
  names: Names
  flips: { primeiro: number; segundo: number }
  biggest?: CityMargin
  net: { primeiro: VoteGain; segundo: VoteGain }
  race?: Parameters<typeof raceFacts>[0][number]
  turnout: { high?: TurnoutExtreme; low?: TurnoutExtreme }
  /** Cidades fora da curva (#34): the cities the default list compares, and its minimum. */
  outliers?: { n: number; min: number }
}
/** The hub of Relatórios: the figure each row's headline states, with the same builders as the reports. */
export function hubFacts(h: HubParts, label: CityLabel, fixture: boolean): FactPage {
  const c: Ctx = { scope: 'relatorios', page: 'resumo', fixture, checks: ['municipios'] }
  const facts: Fact[] = []
  const flip = (anchor: string, name: string, n: number) =>
    rec(c, anchor, name, int(n), both('fact.flips', { name, n: int(n) }), [countInput(std('fact.in.cities'), n)], std('fact.f.flips'), [std('fact.w.n', { n: int(n) })])
  facts.push(flip('cidades-que-viraram', h.names.primeiro, h.flips.primeiro), flip('cidades-que-viraram-2', h.names.segundo, h.flips.segundo))
  if (h.biggest) facts.push(marginRecord(c, 'maiores-viradas', h.biggest, h.names, label))
  facts.push(deltaTotalRecord(c, 'votos-ganhos-e-perdidos', h.names.primeiro, h.net.primeiro, 0))
  if (h.race) {
    const race = raceFacts([h.race], { primeiro: h.names.primeiro, segundo: h.names.segundo }, (n) => label(n, h.race!.uf).split('/')[0]!, fixture).facts[0]!
    facts.push({ ...race, id: factId(c.scope, c.page, 'disputas-mais-apertadas'), scope: c.scope, page: c.page, anchor: 'disputas-mais-apertadas' })
  }
  if (h.turnout.high) facts.push(turnoutRecord(c, 'comparecimento', h.turnout.high, label))
  if (h.turnout.low) facts.push(turnoutRecord(c, 'comparecimento-baixo', h.turnout.low, label))
  if (h.outliers) facts.push(outlierCountRecord(c, 'cidades-fora-da-curva', undefined, h.outliers.min, h.outliers.n))
  return reportPage(c, 'Relatórios', 'relatorios/', facts, R2026)
}

/** The state page: the number of municipalities its list holds. */
export function stateCountFacts(uf: string, name: string, n: number, fixture: boolean): FactPage {
  const c: Ctx = { scope: `estado/${uf}`, page: 'municipios', fixture, checks: ['municipios'] }
  const facts = [
    rec(c, 'municipios', std('fact.in.cities'), int(n), both('fact.state.count', { name, n: int(n) }), [{ label: std('fact.in.cities'), field: 'cities.csv · cd_municipio', value: int(n) }], std('fact.f.stateCount'), [std('fact.w.stateCount', { n: int(n), uf: uf.toUpperCase() })]),
  ]
  return { scope: c.scope, page: c.page, title: name, subtitle: std('fact.sub.municipios', { name }), back: { path: `${uf}/`, label: std('fact.back.estado') }, fixture, facts, rounds: [{ ano: 2026, turno: 2 }] }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
// Cidades fora da curva (#34): a screening list. One record per listed city (its turnout and swing against the typical of its peers, with the peers'
// own figures so the typical can be recomputed), one per count the page states. No sentence says anything about a city beyond the numbers.
// ---------------------------------------------------------------------------------------------------------------------------------------------

const OUTLIER_SCOPE = 'relatorios/cidades-fora-da-curva'
const OUTLIER_ROUNDS = [{ ano: 2026, turno: 2 }, { ano: 2022, turno: 2 }]
const pct1 = (x: number) => formatFixedPct(x)

export function outlierRecord(c: Ctx, r: OutlierRow, names: Names, label: CityLabel): Fact {
  const city = label(r.nome, r.uf)
  const turnoutPeers = r.peers.filter((p) => p.turnout !== undefined).length
  const swingPeers = r.peers.filter((p) => p.swing !== undefined).length
  const votos = (name: string, ano: number, v: number): FactInput => ({ label: std('fact.in.votosAt', { name, ano }), field: 'votes.csv · votos', value: int(v) })
  const peerValue = (p: OutlierRow['peers'][number]) =>
    std('fact.in.peerValue', { name: label(p.nome, p.uf), turnout: p.turnout === undefined ? std('fact.in.peerNone') : pct1(p.turnout), swing: p.swing === undefined ? std('fact.in.peerNone') : formatSignedPp(p.swing) })
  return rec(
    c, `${r.uf}-${r.slug}`, city, `${pct1(r.turnout)} · ${formatSignedPp(r.swing)}`,
    both('fact.outlier', { city, turnout: pct1(r.turnout), typical: pct1(r.typicalTurnout), swing: formatSignedPp(r.swing), typicalSwing: formatSignedPp(r.typicalSwing), validos: int(r.validos) }),
    [
      { label: std('fact.in.comparecimento'), field: 'turnout.csv · comparecimento', value: int(r.comparecimento) },
      { label: std('fact.in.aptos'), field: 'turnout.csv · aptos', value: int(r.aptos) },
      { label: `${std('fact.in.validos')}, 2026`, field: 'turnout.csv · validos', value: int(r.validos) },
      votos(names.primeiro, 2026, r.votos26.primeiro),
      votos(names.segundo, 2026, r.votos26.segundo),
      { label: `${std('fact.in.validos')}, 2022`, field: 'turnout.csv · validos', value: int(r.validos22) },
      votos(names.primeiro, 2022, r.votos22.primeiro),
      votos(names.segundo, 2022, r.votos22.segundo),
      ...r.peers.map((p, i) => ({ label: std('fact.in.peer', { n: i + 1 }), value: peerValue(p) })),
    ],
    std('fact.f.outlier'),
    [
      std('fact.w.outTurnout', { c: int(r.comparecimento), a: int(r.aptos), pct: pct1(r.turnout), n: turnoutPeers, typical: pct1(r.typicalTurnout), gap: formatSignedPp(r.turnoutGap) }),
      std('fact.w.outSwing', {
        a26: int(r.votos26.primeiro), b26: int(r.votos26.segundo), v26: int(r.validos), m26: formatSignedPp(r.margin26),
        a22: int(r.votos22.primeiro), b22: int(r.votos22.segundo), v22: int(r.validos22), m22: formatSignedPp(r.margin22),
        swing: formatSignedPp(r.swing), n: swingPeers, typical: formatSignedPp(r.typicalSwing), gap: formatSignedPp(r.swingGap),
      }),
    ],
    { name: std(METHOD_DOCS.outliers.key), href: METHOD_DOCS.outliers.href },
  )
}

/** The count a list states ("Mostrando N de M cidades"), or the hub's headline: the cities the filter compared. */
export function outlierCountRecord(c: Ctx, anchor: string, state: { uf: string; name: string } | undefined, min: number, n: number): Fact {
  const where = state ? std('fact.out.where.uf', { name: state.name }) : std('fact.out.where.all')
  const plainWhere = state ? say({ locale: DEFAULT_LOCALE, register: 'plain' }, 'fact.out.where.uf', { name: state.name }) : say({ locale: DEFAULT_LOCALE, register: 'plain' }, 'fact.out.where.all')
  return rec(
    c, anchor, std('fact.in.cities'), int(n),
    { standard: std('fact.count.outliers', { where, min: int(min), n: int(n) }), plain: say({ locale: DEFAULT_LOCALE, register: 'plain' }, 'fact.count.outliers', { where: plainWhere, min: int(min), n: int(n) }) },
    [countInput(std('fact.in.cities'), n), { label: std('fact.in.minimum'), field: 'turnout.csv · validos', value: int(min) }],
    std('fact.f.outCount'), [std('fact.w.count', { n: int(n), min: int(min) })],
    { name: std(METHOD_DOCS.outliers.key), href: METHOD_DOCS.outliers.href },
  )
}

export interface OutlierCount {
  uf: string | undefined
  min: number
  n: number
}
/**
 * The pages of records of the report: one per state (the cities of that state that any list shows) and one for the counts the lists state. A city appears
 * once, in the page of its state, however many lists show it; the lists link to it from wherever they are.
 */
export function outlierFactPages(listed: readonly OutlierRow[], counts: readonly OutlierCount[], names: Names, label: CityLabel, stateName: (uf: string) => string, fixture: boolean): FactPage[] {
  const back = { path: 'relatorios/cidades-fora-da-curva/', label: std('fact.back.report', { name: std('fact.in.cities') }) }
  const pages: FactPage[] = []
  const ufs = [...new Set(listed.map((r) => r.uf))].sort()
  for (const uf of ufs) {
    const c: Ctx = { scope: OUTLIER_SCOPE, page: uf, fixture, checks: ['municipios'] }
    const rows = listed.filter((r) => r.uf === uf)
    const title = `Cidades fora da curva · ${stateName(uf)}`
    pages.push({ scope: c.scope, page: c.page, title, subtitle: std('fact.sub.report', { name: title }), back: { ...back, label: std('fact.back.report', { name: 'Cidades fora da curva' }) }, fixture, facts: rows.map((r) => outlierRecord(c, r, names, label)), rounds: OUTLIER_ROUNDS })
  }
  const c: Ctx = { scope: OUTLIER_SCOPE, page: 'filtros', fixture, checks: ['municipios'] }
  const title = 'Cidades fora da curva'
  pages.push({
    scope: c.scope, page: c.page, title, subtitle: std('fact.sub.report', { name: title }), back: { ...back, label: std('fact.back.report', { name: title }) }, fixture, rounds: OUTLIER_ROUNDS,
    facts: counts.map((k) => outlierCountRecord(c, `filtro-${k.uf ?? 'todos'}-${k.min}`, k.uf ? { uf: k.uf, name: stateName(k.uf) } : undefined, k.min, k.n)),
  })
  return pages
}
