/**
 * The checks of the build that the "conferido" seal reports (#62), PURE. The seal is never written by hand: its words (`seal.*` in the catalog)
 * are filled with what these checks measured, and a check that fails fails the build, so no page can print a seal over a number that was not checked.
 *
 *  - `national`: the site's national sums (comparecimento and votos válidos of a cycle and round, from `totals.json`) against the totals the edition recorded
 *    when it was published (`edition.json`, already checked against the TSE national totals by `make data-check`).
 *  - `municipios`: the municipality cross-check: the sum over every city shard (overseas posts included) of the electorate, the turnout and the valid votes against the
 *    national sums, and the sum of the regions against them.
 * A fact names the checks that cover it (`Fact.checks`); the seal of a page shows the lines of those checks for the cycles the page uses.
 */
import type { CityShard } from '../city-shard'
import type { TotalsFile } from '../shard-files'
import { fill, message, template, DEFAULT_LOCALE, type Locale } from '../sentences/catalog'
import { formatInt } from '@/shared/city-model'

export const CHECK_KINDS = ['national', 'municipios'] as const
export type CheckKind = (typeof CHECK_KINDS)[number]

export interface CheckItem {
  field: 'aptos' | 'comparecimento' | 'validos'
  got: number
  want: number
}
export interface Check {
  kind: CheckKind
  ano: number
  turno: number
  /** How many cities (posts included) the check summed; for `national` the same count, for context. */
  municipios: number
  items: CheckItem[]
  /** `municipios` only: the regions' sums against the national ones, the second half of the cross-check. */
  regions?: CheckItem[]
  ok: boolean
}

type Block = Record<string, number | Record<string, number>>
const num = (b: Block | undefined, f: string) => (b && typeof b[f] === 'number' ? (b[f] as number) : 0)

/** Every check of the dataset: both kinds, for each cycle and round the national totals have. */
export function runChecks(cities: readonly CityShard[], totals: TotalsFile, edition: Record<string, { comparecimento: number; validos: number }>): Check[] {
  const checks: Check[] = []
  for (const [anoText, rounds] of Object.entries(totals.national)) {
    for (const turnoText of Object.keys(rounds)) {
      const [ano, turno] = [Number(anoText), Number(turnoText)]
      const national = rounds[turnoText] as Block
      const rows = cities.map((c) => c.cycles[anoText]?.[turnoText] as Block | undefined).filter((b): b is Block => !!b)
      const sum = (f: string) => rows.reduce((n, b) => n + num(b, f), 0)
      const regionSum = (f: string) => Object.values(totals.regions).reduce((n, r) => n + num(r[anoText]?.[turnoText] as Block | undefined, f), 0)
      const items = (fields: CheckItem['field'][], got: (f: string) => number, want: (f: string) => number): CheckItem[] => fields.map((field) => ({ field, got: got(field), want: want(field) }))
      const recorded = edition[`${ano}-${turno}`]
      const nat = items(['comparecimento', 'validos'], (f) => num(national, f), (f) => (recorded ? recorded[f as 'validos' | 'comparecimento'] : Number.NaN))
      const mun = items(['aptos', 'comparecimento', 'validos'], sum, (f) => num(national, f))
      const reg = items(['aptos', 'comparecimento', 'validos'], regionSum, (f) => num(national, f))
      checks.push({ kind: 'national', ano, turno, municipios: rows.length, items: nat, ok: nat.every((i) => i.got === i.want) })
      checks.push({ kind: 'municipios', ano, turno, municipios: rows.length, items: mun, regions: reg, ok: mun.every((i) => i.got === i.want) && reg.every((i) => i.got === i.want) })
    }
  }
  return checks
}

/** The failed checks, one line each; empty when the build may print the seal. */
export function failedChecks(checks: readonly Check[]): string[] {
  return checks.filter((c) => !c.ok).map((c) => `${c.kind} ${c.ano} round ${c.turno}: ${[...c.items.map((i) => ({ ...i, label: i.field })), ...(c.regions ?? []).map((i) => ({ ...i, label: `regions ${i.field}` }))].filter((i) => i.got !== i.want).map((i) => `${i.label} ${i.got} != ${i.want}`).join(', ')}`)
}

const FIELD_KEY = { aptos: 'seal.field.aptos', comparecimento: 'seal.field.comparecimento', validos: 'seal.field.validos' } as const

/**
 * The lines of a page's seal: for each kind the facts name and each cycle-and-round the page uses, one sentence from the catalog filled with the
 * measured numbers. A check that is missing or failed has no line, and `sealProblems` reports it, so the page cannot print a seal it did not earn.
 */
export function sealLines(checks: readonly Check[], kinds: readonly CheckKind[], rounds: readonly { ano: number; turno: number }[], edition: { date: string }, locale: Locale = DEFAULT_LOCALE): string[] {
  const voice = { locale, register: 'standard' as const }
  const date = edition.date.split('-').reverse().join('/')
  return kinds.flatMap((kind) =>
    rounds.flatMap(({ ano, turno }) => {
      const check = checks.find((c) => c.kind === kind && c.ano === ano && c.turno === turno && c.ok)
      if (!check) return []
      const fields = check.items.map((i) => fill(template(voice, FIELD_KEY[i.field]), { n: formatInt(i.got) }))
      const list = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(fields)
      return [message(voice, kind === 'national' ? 'seal.national' : 'seal.municipios', { ano, turno, date, list, count: formatInt(check.municipios) })]
    }),
  )
}

/** What stops a seal: a named kind and round with no passing check. */
export function sealProblems(checks: readonly Check[], kinds: readonly CheckKind[], rounds: readonly { ano: number; turno: number }[]): string[] {
  return kinds.flatMap((kind) => rounds.filter(({ ano, turno }) => !checks.some((c) => c.kind === kind && c.ano === ano && c.turno === turno && c.ok)).map(({ ano, turno }) => `no passing ${kind} check for ${ano} round ${turno}`))
}
