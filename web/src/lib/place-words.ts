/**
 * THE PURE HALF of the one link helper for states and regions (#184): where a mention of a state (its abbreviation or its name) or of a region goes, the accessible name of that
 * link, and the split of a text into plain stretches and place mentions. PURE and light enough for the browser: the names come from `uf-names.ts` and `regions.ts`
 * (the same lists `region-map.ts` and the pages read), the accessible name is the caller's (`placeAnchor` takes it; `lib/place-link.ts` gives it from the catalog, the calculation page's client from its subset). `components/PlaceLink.tsx` draws ONE mention (a list,
 * a table, a card's text, an island) and `components/PlaceText.astro` draws a whole sentence of the catalog with its mentions as links, as `calcLink` does for
 * the calculation: no page writes a link to a state or a region itself.
 *
 * A mention inside a link that already goes there (a row of the state list, a card) is part of that link and is drawn plain (`PlaceLink` with `plain`): a link never
 * holds a second link.
 */
import { siteHref } from '../paths'
import { html, type Raw } from '../shared/html'
import { REGION_ORDER, REGION_NOME, regionName } from './regions'
import { UF_NOME, ufFullLabel } from './uf-names'

export type PlaceRef = { kind: 'uf'; uf: string } | { kind: 'regiao'; regiao: string }

/** The state page and the region page of a place, under the site base (`siteHref` applies it). */
export const ufPath = (uf: string): string => `/${uf.toLowerCase()}/`
export const regionPath = (regiao: string): string => `/brasil/${regiao}/`
export const placePath = (place: PlaceRef): string => (place.kind === 'uf' ? ufPath(place.uf) : regionPath(place.regiao))

/** The name a place is spoken by: "RJ · Rio de Janeiro" keeps the visible code in the name; a region is its name. */
export const placeName = (place: PlaceRef): string => (place.kind === 'uf' ? ufFullLabel(place.uf) : regionName(place.regiao))

/**
 * The link classes of a mention in text. The hit area is at least 44 px tall (#88) without moving the text: the link grows a transparent layer above and below its line
 * (the tap probe of `e2e/tap-targets.spec.ts` counts a pseudo-element). One string, read by `PlaceLink.tsx` and by `placeLinkHtml` alike.
 */
export const PLACE_LINK_CLASS = "relative font-bold text-primary after:absolute after:-inset-x-1 after:-inset-y-4 after:content-['']"

/** What a mention prints when no text is given: a state's abbreviation in upper case, a region's name. */
export const placeText = (place: PlaceRef): string => (place.kind === 'uf' ? place.uf.toUpperCase() : regionName(place.regiao))

/** The words that name a place: abbreviation and full name of each state (the overseas post is not a state), and each region. */
const STATES = Object.entries(UF_NOME).filter(([uf]) => uf !== 'zz')
const WORDS = new Map<string, PlaceRef>([
  ...STATES.flatMap(([uf, nome]): [string, PlaceRef][] => [[uf.toUpperCase(), { kind: 'uf', uf }], [nome, { kind: 'uf', uf }]]),
  ...REGION_ORDER.map((regiao): [string, PlaceRef] => [REGION_NOME[regiao], { kind: 'regiao', regiao }]),
])

/** Every word that names a place, for the test that looks for the ones left outside a link. */
export const PLACE_WORDS: readonly string[] = [...WORDS.keys()]

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const BEFORE = '(?<![\\p{L}\\p{N}-])'
const AFTER = '(?![\\p{L}\\p{N}-])'
const byLength = (a: string, b: string) => b.length - a.length
const PLACE_RE = new RegExp(`${BEFORE}(${[...WORDS.keys()].sort(byLength).map(escape).join('|')})${AFTER}`, 'gu')

export interface Segment {
  text: string
  /** Set when the stretch is a mention of a place. */
  place?: PlaceRef
}

/**
 * A text in order, cut into plain stretches and place mentions (whole words, case-sensitive: an abbreviation is upper case and a name is capitalised, so "se" or
 * "sul" in a sentence never match). `except` lists stretches that hold a place word without naming the place (a city called "Boa Esperança do Norte", a party
 * acronym that is also a UF code): they stay plain.
 */
export function splitPlaces(text: string, except: readonly string[] = []): Segment[] {
  const skip: [number, number][] = []
  for (const phrase of except) for (let at = text.indexOf(phrase); at >= 0; at = text.indexOf(phrase, at + phrase.length)) skip.push([at, at + phrase.length])
  const inside = (index: number) => skip.some(([from, to]) => index >= from && index < to)
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(PLACE_RE)) {
    if (inside(m.index!)) continue
    if (m.index! > last) out.push({ text: text.slice(last, m.index) })
    out.push({ text: m[0], place: WORDS.get(m[0])! })
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}

/**
 * The anchor of one mention as markup: the one place that writes it. `label` is the accessible name already filled (`placeLabel`); `plain` draws the text only
 * (the mention sits inside a link that already goes there).
 */
export function placeAnchor(place: PlaceRef, label: string, options: { text?: string; plain?: boolean } = {}): Raw {
  const text = options.text ?? placeText(place)
  const kind = place.kind
  if (options.plain) return html`<span data-place="${kind}">${text}</span>`
  return html`<a class="${PLACE_LINK_CLASS}" data-place="${kind}" href="${siteHref(placePath(place))}" aria-label="${label}">${text}</a>`
}
