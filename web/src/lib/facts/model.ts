/**
 * Fact records (#61), PURE: every number the city card publishes is one record with an id, a sentence (in both registers,
 * from the catalog), the numbers it is made of, the source of those numbers and the calculation that turns them into the
 * figure on the card. The record has its own address (`/fato/<escopo>/<página>/#<medida>`, see `factHref`), the card
 * links to it next to the figure (the calculation link), and the build gate (`gate.ts`) fails on a record without a source and a
 * calculation. The wording is in the catalog (`fact.*`); the figures come from the same `CityResult` the card prints.
 *
 * Ids are stable: they name the place, the cycle, the round and the measure, never a position or a number
 * (`rj/cidade-exemplo/2026-1/votaram`), so a link or a citation of a fact keeps meaning the same thing in every edition.
 */
import type { CityResult, Segment } from '@/shared/city-model'
import { CYCLES, formatInt, formatPct } from '@/shared/city-model'
import type { Fact as Curiosity } from '../curiosities'
import type { CheckKind } from './checks'
import { headline } from '../sentences/headline'
import { marginLine, marginVotes } from '../sentences/margin'
import '../sentences/catalog-facts'
import { DEFAULT_LOCALE, message as say, REGISTERS, type Locale, type MessageKey, type Register } from '../sentences/catalog'

/** The page of the facts of the curiosities card: it is the city's, not a cycle's. */
export const CURIOSITIES_PAGE = 'comparacoes'
/** The latest cycle: the only one with a fact page per city and round (the earlier cycles are explained on `/fato/metodo/ciclos-anteriores/`, to keep the site small). */
export const LATEST_CYCLE = Math.max(...CYCLES)
/** The TSE open-data portal, where the numbers come from. */
export const TSE_URL = 'https://dadosabertos.tse.jus.br/'
const REPO = 'https://github.com/hvasoares/voto-a-voto-oss/blob/main/'
/** The notes that describe how the derived numbers are made; a fact that rests on one cites it. */
export const METHOD_DOCS = {
  margin: { key: 'fact.method.margin', href: `${REPO}docs/nonvoters-vs-margin.md` },
  curio: { key: 'fact.method.curio', href: `${REPO}web/docs/curiosities.md` },
  cycles: { key: 'fact.method.cycles', href: `${REPO}web/docs/checkpoints/issue-14.md` },
  arcs: { key: 'fact.method.arcs', href: `${REPO}web/docs/checkpoints/issue-41.md` },
  peers: { key: 'fact.method.peers', href: `${REPO}web/docs/peer-similarity.md` },
  outliers: { key: 'fact.method.outliers', href: `${REPO}web/docs/cidades-fora-da-curva.md` },
} as const

export interface FactInput {
  label: string
  /** The dataset field the number is read from (`turnout.csv · aptos`), when it is read from one; absent for a number the project derives. */
  field?: string
  value: string
}
export interface FactCalculation {
  /** The rule in words. */
  formula: string
  /** The same rule with the numbers in it, one line per step. */
  worked: string[]
}
export interface FactSource {
  name: string
  url: string
}
export interface FactMethod {
  name: string
  href: string
}
export interface Fact {
  /** `<scope>/<page>/<anchor>`: the place (or the page family), cycle and round (or the page), measure. Stable. */
  id: string
  /** What the records belong to: `rj/cidade-exemplo` for a city, `brasil`, `estado/rj`, `comparar/2022`, `relatorios/disputas-mais-apertadas` for the other pages (#62). */
  scope: string
  /** The page that holds the record: `<ano>-<turno>` or `comparacoes`. */
  page: string
  /** The fragment of the record in its page. */
  anchor: string
  /** What the record is about, short ("Votaram", "Candidato A"). */
  title: string
  /** The figure as the card prints it ("70%", "36.400 · 52% dos votos", "3ª"). */
  shown: string
  sentences: Record<Register, string>
  inputs: FactInput[]
  /** Optional on purpose: the gate reports a record that arrives without one (it never leaves the build). */
  calculation?: FactCalculation
  source?: FactSource
  method?: FactMethod
  /** The build checks that cover the number (`checks.ts`): the "conferido" seal names them. Optional on purpose, like the source: the gate reports a record without any. */
  checks?: CheckKind[]
}

/** Where the facts of a place come from: its name for the sentences, and whether the dataset is the fictitious fixture. */
export interface FactPlace {
  uf: string
  slug: string
  name: string
  overseas?: boolean
  fixture?: boolean
  locale?: Locale
}

export const factPage = (ano: number, turno: number) => `${ano}-${turno}`
export const factId = (scope: string, page: string, anchor: string) => `${scope}/${page}/${anchor}`
/** Site-relative address of a fact's page (pass it through `withBase`); the fragment names the record. */
export const factPath = (scope: string, page: string) => `fato/${scope}/${page}/`
export const factHref = (f: Pick<Fact, 'scope' | 'page' | 'anchor'>, base = '/') => `${base}${factPath(f.scope, f.page)}#${f.anchor}`

const share = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0)
const int = (n: number) => formatInt(n)

/** The anchor of a segment of the card: the candidate or non-voter row it is. */
const segmentAnchor = (s: Segment) => s.key

/** The records of one city, cycle and round: the ones the card prints for that view. `undefined` result: none (no figure, no fact). */
export function viewFacts(r: CityResult | undefined, place: FactPlace): Fact[] {
  if (!r) return []
  const locale = place.locale ?? DEFAULT_LOCALE
  const page = factPage(r.ano, r.turno)
  const say1 = (register: Register) => (key: MessageKey, params: Record<string, string | number> = {}, count?: number) => say({ locale, register }, key, params, count)
  const std = say1('standard')
  const source: FactSource = { name: std(place.fixture ? 'fact.source.fixture' : 'fact.source.tse'), url: TSE_URL }
  const where = { city: place.name, turno: r.turno, ano: r.ano }
  const both = (build: (m: ReturnType<typeof say1>) => string): Record<Register, string> => ({ standard: build(say1('standard')), plain: build(say1('plain')) })
  const make = (anchor: string, title: string, shown: string, sentences: Record<Register, string>, inputs: FactInput[], formula: string, worked: string[], extra: Partial<Fact> = {}): Fact => ({
    id: factId(`${place.uf}/${place.slug}`, page, anchor),
    scope: `${place.uf}/${place.slug}`,
    page,
    anchor,
    title,
    shown,
    sentences,
    inputs,
    calculation: { formula, worked },
    source,
    checks: ['municipios', 'national'],
    ...extra,
  })
  const dividing = (part: number, whole: number): string =>
    whole > 0 ? std('fact.w.share', { part: int(part), whole: int(whole), exact: formatPct(share(part, whole)) }) : std('fact.w.none', { whole: int(whole) })
  const aptos: FactInput = { label: std('fact.in.aptos'), field: 'turnout.csv · aptos', value: int(r.aptos) }
  const validos: FactInput = { label: std('fact.in.validos'), field: 'turnout.csv · validos', value: int(r.validos) }
  const naoVotaram: FactInput = { label: std('fact.in.naoVotaram'), value: int(r.naoVotaram) }

  const facts: Fact[] = []

  // The sentence of the card: its numbers are the share of the electorate that did not vote and the shares of the two most voted.
  const [first, second] = r.ranking
  facts.push(
    make(
      'frase',
      std('fact.measure.frase'),
      '',
      { standard: headline(r, { cityName: place.name, overseas: place.overseas, locale, register: 'standard' }), plain: headline(r, { cityName: place.name, overseas: place.overseas, locale, register: 'plain' }) },
      [aptos, naoVotaram, ...(first ? [{ label: std('fact.in.first'), field: 'votes.csv · votos', value: int(first.votos) }] : []), ...(second ? [{ label: std('fact.in.second'), field: 'votes.csv · votos', value: int(second.votos) }] : [])],
      std('fact.f.frase'),
      [dividing(r.naoVotaram, r.aptos), ...(first ? [dividing(first.votos, r.aptos)] : []), ...(second ? [dividing(second.votos, r.aptos)] : [])],
    ),
  )

  facts.push(
    make(
      'votaram',
      std('fact.measure.votaram'),
      `${r.votedPct}%`,
      both((m) => m('fact.votaram', { ...where, pct: formatPct(r.votedShare), validos: int(r.validos), aptos: int(r.aptos) })),
      [aptos, validos],
      std('fact.f.votaram'),
      [dividing(r.validos, r.aptos)],
    ),
    make(
      'naoVotaram',
      std('fact.measure.naoVotaram'),
      `${r.notVotedPct}%`,
      both((m) => m('fact.naoVotaram', { ...where, pct: formatPct(r.notVotedShare), n: int(r.naoVotaram), aptos: int(r.aptos) })),
      [aptos, validos],
      std('fact.f.naoVotaram'),
      [std('fact.w.diff', { a: int(r.aptos), b: int(r.validos), d: int(r.naoVotaram) }), dividing(r.naoVotaram, r.aptos)],
    ),
  )

  for (const s of r.voted) {
    const row: FactInput = { label: std('fact.in.votos', { name: s.label }), field: s.key === 'outros' ? undefined : 'votes.csv · votos', value: int(s.votos) }
    facts.push(
      make(
        segmentAnchor(s),
        s.label,
        `${int(s.votos)} · ${s.pct}% dos votos`,
        both((m) => m('fact.candidate', { ...where, name: s.label, votos: int(s.votos), validos: int(r.validos), pct: formatPct(share(s.votos, r.validos)) })),
        [row, validos],
        std('fact.f.candidate'),
        [dividing(s.votos, r.validos)],
      ),
    )
  }
  for (const s of r.notVoted) {
    const field = s.key === 'brancos' ? 'turnout.csv · brancos' : s.key === 'nulos' ? 'turnout.csv · nulos + anulados_apu_sep' : undefined
    const steps =
      s.key === 'abstencao'
        ? [std('fact.w.diff', { a: int(r.naoVotaram), b: int(r.notVoted[1]!.votos + r.notVoted[2]!.votos), d: int(s.votos) }), dividing(s.votos, r.naoVotaram)]
        : [dividing(s.votos, r.naoVotaram)]
    facts.push(
      make(
        segmentAnchor(s),
        s.label,
        `${int(s.votos)} · ${s.pct}% dos que não votaram`,
        both((m) => m('fact.notVotedPart', { ...where, label: s.label, votos: int(s.votos), n: int(r.naoVotaram), pct: formatPct(share(s.votos, r.naoVotaram)) })),
        [{ label: std('fact.in.part', { label: s.label }), field, value: int(s.votos) }, naoVotaram],
        std('fact.f.notVotedPart'),
        steps,
      ),
    )
  }

  // The margin line, when the round has a pair to compare.
  const margin = marginVotes(r)
  const marginSentence = (register: Register) => marginLine(r, { cityName: place.name, locale, register })
  if (margin !== undefined && marginSentence('standard')) {
    const [a, b] = r.ranking as unknown as [{ votos: number }, { votos: number }]
    const fits = margin > 0 && r.naoVotaram > 0 && margin <= r.naoVotaram
    const times = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(r.naoVotaram / (margin || 1))
    const worked =
      margin === 0
        ? [std('fact.w.tie', { a: int(a.votos), b: int(b.votos) })]
        : [std('fact.w.diff', { a: int(a.votos), b: int(b.votos), d: int(margin) }), ...(fits ? [std('fact.w.times', { m: int(r.naoVotaram), d: int(margin), exact: times, t: int(Math.floor(r.naoVotaram / margin)) })] : [])]
    facts.push(
      make(
        'margem',
        std('fact.measure.margem'),
        int(margin),
        { standard: marginSentence('standard')!, plain: marginSentence('plain')! },
        [{ label: std('fact.in.first'), field: 'votes.csv · votos', value: int(a.votos) }, { label: std('fact.in.second'), field: 'votes.csv · votos', value: int(b.votos) }, naoVotaram],
        fits ? `${std('fact.f.margin')}; ${std('fact.f.fits')}` : std('fact.f.margin'),
        worked,
        { method: { name: std(METHOD_DOCS.margin.key), href: METHOD_DOCS.margin.href } },
      ),
    )
  }
  return facts
}

/**
 * The records of the curiosities card of a city: the rank, what it is the rank of, the group and the cycles. They rest on the
 * methods of `curiosities.md` and `peer-similarity.md` (the size band), which they cite.
 */
export function curiosityFacts(curiosities: readonly Curiosity[], place: FactPlace, describe: (c: Curiosity, register: Register) => { what: string; group: string }): Fact[] {
  const locale = place.locale ?? DEFAULT_LOCALE
  const std = (key: MessageKey, params: Record<string, string | number> = {}) => say({ locale, register: 'standard' }, key, params)
  const source: FactSource = { name: std(place.fixture ? 'fact.source.fixture' : 'fact.source.tse'), url: TSE_URL }
  return curiosities.map((c) => ({
    id: factId(`${place.uf}/${place.slug}`, CURIOSITIES_PAGE, c.code),
    scope: `${place.uf}/${place.slug}`,
    page: CURIOSITIES_PAGE,
    anchor: c.code,
    title: std('curio.rank', { n: c.rank }),
    shown: std('curio.rank', { n: c.rank }),
    sentences: Object.fromEntries(REGISTERS.map((register) => {
      const d = describe(c, register)
      return [register, say({ locale, register }, 'fact.curio', { rank: say({ locale, register }, 'curio.rank', { n: c.rank }), what: d.what, group: d.group })]
    })) as Record<Register, string>,
    inputs: [
      { label: std('fact.in.rank'), value: std('curio.rank', { n: c.rank }) },
      { label: std('fact.in.group'), value: int(c.n) },
      { label: std('fact.in.cycles'), value: c.cycles.join(', ') },
    ],
    calculation: { formula: std('fact.f.curio'), worked: [std('fact.w.curio', { rank: c.rank, n: c.n })] },
    source,
    checks: ['municipios'],
    method: { name: std(METHOD_DOCS.curio.key), href: METHOD_DOCS.curio.href },
  }))
}
