/**
 * The fact records of the pages other than the city card (#62), PURE: Brasil e regiões, Comparar com 2022 / 2018 and Três ciclos por estado.
 * Same shape and same gate as the city card's records; the figures are the ones the pages print (their models, `brasil.ts` and `compare.ts`),
 * the words are the catalog's (`fact.*`). A page of records carries what the page of the calculation needs (title, way back) and what its
 * seal needs (the checks and the rounds the numbers belong to).
 */
import type { BrasilCandidate, BrasilView } from '../brasil'
import type { CompareRow, CycleBlock } from '../compare'
import { formatInt, formatPct } from '@/shared/city-model'
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
}

type Params = Record<string, string | number>
const std = (key: MessageKey, params: Params = {}) => say({ locale: DEFAULT_LOCALE, register: 'standard' }, key, params)
const both = (key: MessageKey, params: Params): Record<Register, string> => Object.fromEntries(REGISTERS.map((r) => [r, say({ locale: DEFAULT_LOCALE, register: r }, key, params)])) as Record<Register, string>
const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)
const int = formatInt
/** `part ÷ whole × 100 = x%`; the exact value has one decimal, or two where the page prints two (the national bar). */
const dividing = (part: number, whole: number, decimals = 1): string =>
  whole > 0 ? std('fact.w.share', { part: int(part), whole: int(whole), exact: decimals === 2 ? `${share(part, whole).toFixed(2).replace('.', ',')}%` : formatPct(share(part, whole)) }) : std('fact.w.none', { whole: int(whole) })

interface Ctx {
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
export function stateCyclesFacts(uf: string, blocks: readonly CycleBlock[], fixture: boolean): FactPage {
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
    ['candidato', std('fact.measure.candidato'), std('fact.f.candidate'), [[std('fact.in.votos', { name: '' }).trim(), 'votes.csv · votos'], [std('fact.in.validos'), 'turnout.csv · validos']]],
    ['parte', std('fact.measure.parte'), std('fact.f.notVotedPart'), [[std('fact.in.brancos'), 'turnout.csv · brancos'], [std('fact.in.nulos'), 'turnout.csv · nulos + anulados_apu_sep'], [std('fact.in.naoVotaram'), '']]],
    ['margem', std('fact.measure.margem'), `${std('fact.f.margin')}; ${std('fact.f.fits')}`, [[std('fact.in.first'), 'votes.csv · votos'], [std('fact.in.second'), 'votes.csv · votos'], [std('fact.in.naoVotaram'), '']]],
  ]
  const facts = kinds.map(([anchor, title, formula, inputs]) =>
    rec(c, anchor, title, '', both('fact.old', { measure: title }), inputs.map(([label, field]) => ({ label, ...(field ? { field } : {}), value })), formula, [std('fact.w.old')], anchor === 'margem' ? { name: std(METHOD_DOCS.margin.key), href: METHOD_DOCS.margin.href } : undefined),
  )
  return { scope: c.scope, page: c.page, title: std('fact.sub.old'), subtitle: std('fact.sub.old'), back: { path: 'sobre-os-dados/', label: std('fact.back.old') }, fixture, facts, rounds: olderRounds }
}
