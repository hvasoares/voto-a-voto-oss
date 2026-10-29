/**
 * What the page "Cidades fora da curva" (#34) prints, PURE: every sentence and number of one list (one state filter, one minimum) as strings, written from
 * the catalog. The page only lays them out. Rows keep the order they are given (furthest first); the rank is the position in the filtered list.
 */
import { linkHref } from '@/paths'
import { displayName, ufLabel } from '@/shared/city-search'
import { outlierSay, type OutlierVoice } from '../sentences/outliers'
import type { Register } from '../sentences/catalog'
import { formatDecimal, formatFixedPct, formatInt, formatSignedPp } from './format'
import { DEFAULT_MIN, MIN_OPTIONS, OUTLIERS_SHOWN, outlierPath, type OutlierFilter, type OutlierRow } from './outliers'

export interface OutlierViewRow {
  rank: number
  /** "Cidade Alfa/MG". */
  name: string
  /** Base-relative city page, with the site base applied. */
  href: string
  /** The id of the row's fact record (`mg-cidade-alfa`). */
  anchor: string
  turnoutLine: string
  swingLine: string
  validosLine: string
  /** The columns of the desktop table. */
  turnout: string
  typical: string
  gap: string
  swing: string
  validos: string
}

export interface FilterOption {
  label: string
  href: string
  current: boolean
}

export interface OutlierView {
  screening: string
  legend: string
  note: string
  sign: string
  method: string
  count: string
  empty?: string
  columns: Record<'rank' | 'city' | 'turnout' | 'typical' | 'gap' | 'swing' | 'validos', string>
  filters: { label: string; uf: { label: string; options: FilterOption[] }; min: { label: string; options: FilterOption[] } }
  rows: OutlierViewRow[]
}

export interface OutlierViewInput {
  filter: OutlierFilter
  shown: readonly OutlierRow[]
  compared: number
  names: { primeiro: string; segundo: string }
  /** The states that have cities in the list, with their names, in the order the filter shows them. */
  states: readonly { uf: string; name: string }[]
  base: string
  register?: Register
}

export function outlierView({ filter, shown, compared, names, states, base, register }: OutlierViewInput): OutlierView {
  if (shown.length > OUTLIERS_SHOWN) throw new Error(`outlierView: at most ${OUTLIERS_SHOWN} rows are listed, got ${shown.length}`)
  const voice: OutlierVoice = { register }
  const say = (key: string, params: Record<string, string | number> = {}) => outlierSay(voice, key, params)
  const minLabel = (min: number) => (min >= 1_000 ? say('outlier.min.k', { n: formatInt(min / 1_000) }) : say('outlier.min.one', { n: formatInt(min) }))
  const stateName = (uf: string | undefined) => states.find((s) => s.uf === uf)?.name ?? ufLabel(uf ?? '')
  const where = filter.uf === undefined ? say('outlier.where.all') : say('outlier.where.uf', { name: stateName(filter.uf) })
  const swingText = (x: number) => formatDecimal(x).replace(/^(?=\d)/, x > 0 ? '+' : '')
  const rows = shown.map<OutlierViewRow>((r, i) => ({
    rank: i + 1,
    name: `${displayName(r.nome)}/${ufLabel(r.uf)}`,
    href: linkHref(`/${r.uf}/${r.slug}/`, base),
    anchor: `${r.uf}-${r.slug}`,
    turnoutLine: say('outlier.row.turnout', { pct: formatFixedPct(r.turnout), typical: formatFixedPct(r.typicalTurnout) }),
    swingLine: say('outlier.row.swing', { swing: swingText(r.swing), typical: swingText(r.typicalSwing) }),
    validosLine: say('outlier.row.validos', { n: formatInt(r.validos) }),
    turnout: formatFixedPct(r.turnout),
    typical: formatFixedPct(r.typicalTurnout),
    gap: formatSignedPp(r.turnoutGap),
    swing: formatSignedPp(r.swing),
    validos: formatInt(r.validos),
  }))
  const option = (label: string, uf: string | undefined, min: number, current: boolean): FilterOption => ({ label, href: linkHref(outlierPath(uf, min), base), current })
  return {
    screening: say('outlier.screening'),
    legend: say('outlier.legend'),
    note: say('outlier.note'),
    sign: say('outlier.sign', { a: names.primeiro, b: names.segundo }),
    method: say('outlier.method'),
    count: say('outlier.count', { shown: formatInt(shown.length), compared: formatInt(compared), min: minLabel(filter.min), where }),
    empty: shown.length ? undefined : say('outlier.empty', { min: minLabel(filter.min), where }),
    columns: {
      rank: say('outlier.col.rank'), city: say('outlier.col.city'), turnout: say('outlier.col.turnout'), typical: say('outlier.col.typical'),
      gap: say('outlier.col.gap'), swing: say('outlier.col.swing'), validos: say('outlier.col.validos'),
    },
    filters: {
      label: say('outlier.filter.label'),
      uf: {
        label: say('outlier.filter.uf', { name: filter.uf === undefined ? say('outlier.filter.ufAll') : stateName(filter.uf) }),
        options: [option(say('outlier.filter.ufAll'), undefined, filter.min, filter.uf === undefined), ...states.map((s) => option(s.name, s.uf, filter.min, filter.uf === s.uf))],
      },
      min: {
        label: say('outlier.filter.min', { n: minLabel(filter.min) }),
        options: MIN_OPTIONS.map((m) => option(minLabel(m), filter.uf, m, filter.min === m)),
      },
    },
    rows,
  }
}

/** The share text: the screening sentence and the link, nothing about any city. */
export function outlierShare(url: string, register?: Register): { text: string; label: string } {
  const voice: OutlierVoice = { register }
  return { text: `${outlierSay(voice, 'outlier.share.text')} ${url}`, label: outlierSay(voice, 'outlier.share') }
}

export { DEFAULT_MIN }
