/**
 * The keys a card carries (#38), PURE: what is needed to draw the same card again from the site's own data, and nothing else.
 *
 *   view     which card and which view of it:  city:2026-2 | stat:nao-votou:2026-2:square | recap | brasil | meu-brasil
 *   places   the place codes it shows:         ["rj/cidade-exemplo"]  (a state is "rj"; Meu Brasil's carry their role: "mora=rj/x")
 *   edition  the id of the data edition:       "2026-10-26"
 *   lang     the language of its words:        "pt-BR"
 *
 * Keys travel in two ways. The live SVG (`annotateSvg`) keeps its text as real text, has a `<title>` (the text alternative) and a
 * `<desc>`, the keys as `data-*` attributes on the root for anyone who queries the document, and a `<metadata>` block with the
 * same four keys. No script, no number, no link: only the keys. The PNG for a chat carries the keys in a `tEXt` chunk
 * (`png-keys.ts`); chat apps usually strip it, and the printed address is what remains.
 *
 * Reading (`readSvgKeys`) never parses the file into a document: it looks for the metadata block as text, accepts only the
 * documented shapes and refuses a file with a script in it. A dropped file is data, never markup the page shows.
 */
import { DEFAULT_LOCALE, message, type Locale } from './sentences/catalog'

export const CARD_NAMESPACE = 'urn:voto-a-voto:card:1'
export const LOCALES: readonly Locale[] = ['pt-BR', 'en', 'es']

export interface CardKeys {
  view: string
  places: string[]
  edition: string
  lang: Locale
}

const VIEW = /^(city:20\d\d-[12]|stat:(nao-votou|margem|comparecimento):20\d\d-[12]:(square|story|preview)|recap|brasil|meu-brasil)$/
const PLACE = /^(?:(?:mora|vota|nasceu)=)?[a-z]{2}(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/
const EDITION = /^[0-9]{4}-[0-9]{2}-[0-9]{2}(?:-[a-z0-9]+)?$/

export type KeysProblem = 'view' | 'places' | 'edition' | 'lang'

/** The first thing wrong with `k`, or undefined when it is a well-formed key set. */
export function keysProblem(k: unknown): KeysProblem | undefined {
  const o = k as Partial<CardKeys> | null
  if (!o || typeof o !== 'object') return 'view'
  if (typeof o.view !== 'string' || !VIEW.test(o.view)) return 'view'
  if (!Array.isArray(o.places) || o.places.length > 3 || o.places.some((p) => typeof p !== 'string' || !PLACE.test(p))) return 'places'
  if (typeof o.edition !== 'string' || !EDITION.test(o.edition)) return 'edition'
  if (!LOCALES.includes(o.lang as Locale)) return 'lang'
  return undefined
}

const escAttr = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const unescAttr = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/**
 * `svg` (made by a drawing function: a root `<svg ...>` and a `<title>`) with the keys, a language, a `<desc>` and the ids that tie
 * both to the root's label. The words of the description come from the catalog (`card.desc`).
 */
export function annotateSvg(svg: string, keys: CardKeys, o: { address: string }): string {
  const problem = keysProblem(keys)
  if (problem) throw new Error(`card keys: bad ${problem}`)
  const desc = message({ locale: keys.lang, register: 'standard' }, 'card.desc', { edition: keys.edition, address: o.address })
  const attrs = ` lang="${keys.lang}" xml:lang="${keys.lang}" aria-labelledby="card-title card-desc" data-view="${escAttr(keys.view)}" data-places="${escAttr(keys.places.join(','))}" data-edition="${escAttr(keys.edition)}" data-lang="${keys.lang}"`
  const meta = `<metadata><card xmlns="${CARD_NAMESPACE}" view="${escAttr(keys.view)}" places="${escAttr(keys.places.join(','))}" edition="${escAttr(keys.edition)}" lang="${keys.lang}"/></metadata>`
  return svg
    .replace(/<desc id="card-desc">[\s\S]*?<\/desc>|<metadata>[\s\S]*?<\/metadata>/g, '')
    .replace(/^<svg\b([^>]*)>/, (_, a: string) => `<svg${a.replace(/\s(?:lang|xml:lang|aria-labelledby)="[^"]*"/g, '')}${attrs}>`)
    .replace(/<title\b[^>]*>([\s\S]*?)<\/title>/, (_, t: string) => `<title id="card-title">${t}</title><desc id="card-desc">${escAttr(desc)}</desc>${meta}`)
}

export type ReadKeys = { ok: true; keys: CardKeys } | { ok: false; reason: 'not-svg' | 'script' | 'no-keys' | 'bad-keys'; problem?: KeysProblem }

/** The keys of an SVG's `<metadata>` block, read as text. */
export function readSvgKeys(text: string): ReadKeys {
  if (!/^\s*(?:<\?xml[^>]*\?>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg\b/.test(text)) return { ok: false, reason: 'not-svg' }
  if (/<script\b|\son[a-z]+\s*=|javascript:/i.test(text)) return { ok: false, reason: 'script' }
  const block = new RegExp(`<card\\b[^>]*xmlns="${CARD_NAMESPACE}"[^>]*/?>`).exec(text)
  if (!block) return { ok: false, reason: 'no-keys' }
  const attr = (name: string) => {
    const m = new RegExp(`\\s${name}="([^"]*)"`).exec(block[0])
    return m ? unescAttr(m[1]!) : undefined
  }
  const keys = { view: attr('view'), places: (attr('places') ?? '').split(',').filter(Boolean), edition: attr('edition'), lang: attr('lang') } as CardKeys
  const problem = keysProblem(keys)
  return problem ? { ok: false, reason: 'bad-keys', problem } : { ok: true, keys }
}

/** The text of every `<text>` element of an SVG, unescaped, in drawing order: what the picture says. */
export function svgTexts(svg: string): string[] {
  return [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map((m) => unescAttr(m[1]!))
}

/** The `<title>` of an SVG (its text alternative), unescaped. */
export function svgTitle(svg: string): string | undefined {
  const m = /<title\b[^>]*>([\s\S]*?)<\/title>/.exec(svg)
  return m ? unescAttr(m[1]!) : undefined
}

/** A short digest of what a card says (its texts), to notice a changed picture whose keys still read well. */
export async function textDigest(svg: string): Promise<string> {
  const bytes = new TextEncoder().encode(svgTexts(svg).join('\n'))
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return [...hash.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export { DEFAULT_LOCALE }
