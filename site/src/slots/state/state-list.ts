/** Pure logic of the state page: what rows to list and the frame's illustrative figures. No DOM, no I/O. */
import type { City } from '../../data'
import { displayName, fold } from '../../shared/city-search'
import { html } from '../../shared/html'

export interface StateRow {
  slug: string
  /** Display name (Title Case). */
  nome: string
}

/** Every municipality of the state, alphabetical ignoring accents and case. Nothing is dropped or capped. */
export function stateRows(cities: City[]): StateRow[] {
  return cities
    .map((c) => ({ slug: c.slug, nome: displayName(c.nome), key: fold(c.nome) }))
    .sort((a, b) => a.key.localeCompare(b.key) || a.slug.localeCompare(b.slug))
    .map(({ slug, nome }) => ({ slug, nome }))
}

export const countLabel = (n: number): string => `${n} ${n === 1 ? 'município' : 'municípios'}`

interface FrameText {
  x: number
  y: number
  w: number
  h: number
  text: string
}

export interface SketchState {
  banner: string
  /** e.g. "92 municípios (exemplo)": the frame's own figure, not a dataset count. */
  countText: string
  names: string[]
  /** Row sub-line without the UF, e.g. "Município fictício". */
  subline: string
}

/** The frame "5 Estado" read back from its verbatim texts, for ?fixture=sketch. */
export function sketchState(texts: FrameText[]): SketchState {
  const names = texts.filter((t) => t.x === 20 && t.w === 280 && t.h === 17).sort((a, b) => a.y - b.y).map((t) => t.text)
  const sub = texts.find((t) => t.h === 14 && t.x === 20 && t.w === 280)?.text ?? ''
  return {
    banner: texts.find((t) => t.text.startsWith('EXEMPLO'))?.text ?? '',
    countText: texts.find((t) => /^\d+ municípios/.test(t.text))?.text ?? '',
    names,
    subline: sub.replace(/\s·\s[A-Z]{2}$/, ''),
  }
}

/** Row markup shared by the pre-rendered list and the search results. Kept tiny: SP has 645 rows. The chevron is CSS. */
export function rowMarkup(href: string, nome: string, sub: string) {
  return html`<li><a class="state-row" href="${href}"><span>${nome}</span><small>${sub}</small></a></li>`
}
