/**
 * Reopening a card from a dropped file (#38), PURE except for the shard loader it is given.
 *
 * The file is data. Its bytes are read here, its KEYS (`card-keys.ts`, `png-keys.ts`) are validated, and the card is drawn
 * again from the site's own data with the same builders that made it (`shareContent`, `statContent`). The dropped file itself is
 * never put into the page: what the visitor sees is always the recomputed card.
 *
 *   ok             keys read, same edition, and the recomputed card says what the file says
 *   altered        keys read, same edition, but the file's words (SVG) or digest (PNG) differ from the recomputation
 *   other-edition  the file is from another edition of the data; the card shown is the current edition's
 *   no-keys        a picture without keys (a chat app stripped them, or it is not one of ours): the printed address is the way back
 *   mismatch       keys that point at nothing the site has (a place, a view) or that are not well formed
 *   unreadable     not an SVG or a PNG, empty, or too big
 */
import { keysProblem, readSvgKeys, svgTexts, svgTitle, textDigest, type CardKeys } from './card-keys'
import { cityShardResult, type CityShard } from './city-shard'
import { readPngKeys } from './png-keys'
import { REGISTERS, type Locale } from './sentences/catalog'
import { shareContent } from './share-model'
import { MEASURES } from './sentences/stat'
import { QUERY_MEASURE, choiceQuery } from './generator-model'
import { statContent } from './stat-content'
import type { StatSize } from './stat-card'
import { buildPlaceCard, placesFromCodes, placesQuery } from './meu-brasil'
import { meuBrasilContent } from './meu-brasil-content'
import { viewHref } from '@/slots/city/city-view'

/** A dropped file larger than this is not read: a card is a few KB. */
export const MAX_CARD_BYTES = 2_000_000

export interface ReopenContext {
  /** The id of the edition this build shows. */
  edition: string
  origin: string
  base: string
  fixture: boolean
  loadShard: (uf: string, slug: string) => Promise<CityShard | undefined>
}

/** A card drawn again from the site's data. */
export interface Recomputed {
  svg: string
  alt: string
  /** The page that shows this view, as an absolute path under the base. */
  href: string
}

export type Outcome =
  | { status: 'ok' | 'altered' | 'other-edition'; keys: CardKeys; card: Recomputed; from: 'svg' | 'png' }
  /** The keys are good but this kind of card cannot be recomputed in the browser: `href` is the page that is the site's own drawing of it. */
  | { status: 'unsupported'; reason: string; keys: CardKeys; href?: string }
  | { status: 'no-keys' | 'unreadable' | 'mismatch'; reason: string }

/** One entry per kind of card: how to draw the card of `keys` again, once per register (the words differ, the keys do not). */
const kinds: Record<string, (keys: CardKeys, ctx: ReopenContext) => Promise<Recomputed[] | undefined>> = {
  async city(keys, ctx) {
    const [, id] = keys.view.split(':') as [string, string]
    const [ano, turno] = id.split('-').map(Number) as [number, 1 | 2]
    const [uf, slug] = keys.places[0]!.split('/')
    const shard = uf && slug ? await ctx.loadShard(uf, slug) : undefined
    const result = shard && cityShardResult(shard, ano, turno)
    if (!shard || !result) return undefined
    // The words drawn on a city card do not depend on the register (only the text alternative does), so one card covers both.
    const content = shareContent(result, shard.city, { origin: ctx.origin, base: ctx.base, fixture: ctx.fixture, edition: keys.edition, locale: keys.lang })
    return [{ svg: content.svg, alt: content.variants.standard.alt, href: viewHref(`${ctx.base}${uf}/${slug}/`, { ano, turno }) }]
  },
  async stat(keys, ctx) {
    const [, measureId, id, size] = keys.view.split(':') as [string, string, string, StatSize]
    const [ano, turno] = id.split('-').map(Number) as [number, 1 | 2]
    const measure = MEASURES.find((m) => QUERY_MEASURE[m] === measureId)
    const [uf, slug] = keys.places[0]!.split('/')
    const shard = uf && slug ? await ctx.loadShard(uf, slug) : undefined
    if (!shard || !measure || !uf || !slug) return undefined
    const out: Recomputed[] = []
    for (const register of REGISTERS) {
      const c = statContent(shard, { measure, size, view: { ano, turno }, register, locale: keys.lang as Locale, origin: ctx.origin, base: ctx.base, fixture: ctx.fixture, edition: keys.edition })
      if (c.svg) out.push({ svg: c.svg, alt: c.stat.alt, href: `${ctx.base}gerador/${choiceQuery({ city: { uf, slug }, measure, size })}` })
    }
    return out.length ? out : undefined
  },
  async 'meu-brasil'(keys, ctx) {
    const refs = placesFromCodes(keys.places)
    if (!refs.length || refs.length !== keys.places.length) return undefined
    const shards = await Promise.all(refs.map((r) => ctx.loadShard(r.uf, r.slug)))
    if (shards.some((sh) => !sh)) return undefined
    const cards = refs.map((r, i) => buildPlaceCard(r, shards[i]!))
    const c = meuBrasilContent(cards, { origin: ctx.origin, base: ctx.base, fixture: ctx.fixture, edition: keys.edition, locale: keys.lang })
    return [{ svg: c.svg, alt: c.variants.standard.alt, href: `${ctx.base}meu-brasil/${placesQuery(refs)}` }]
  },
}

const kindOf = (view: string) => view.split(':')[0]!

/** The page of a card kind the browser cannot recompute: the Brasil card (#91) and the state recap are pre-rendered per state (its numbers are state totals, not in any shard the browser reads). */
function pageOf(keys: CardKeys, ctx: ReopenContext): string | undefined {
  if (kindOf(keys.view) === 'brasil') return `${ctx.base}brasil/`
  return kindOf(keys.view) === 'recap' && keys.places[0] ? `${ctx.base}${keys.places[0]}/resumo/` : undefined
}

async function recompute(keys: CardKeys, ctx: ReopenContext): Promise<Recomputed[] | 'unsupported' | undefined> {
  const make = kinds[kindOf(keys.view)]
  return make ? make(keys, ctx) : 'unsupported'
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((t, i) => t === b[i])

export async function reopenFile(bytes: Uint8Array, ctx: ReopenContext): Promise<Outcome> {
  if (bytes.length === 0) return { status: 'unreadable', reason: 'empty' }
  if (bytes.length > MAX_CARD_BYTES) return { status: 'unreadable', reason: 'too-big' }

  let keys: CardKeys
  let from: 'svg' | 'png'
  let svgText: string | undefined
  let check: string | undefined
  const png = readPngKeys(bytes)
  if (png.ok) {
    ;({ check, ...keys } = png.payload)
    from = 'png'
  } else if (png.reason !== 'not-png') {
    return png.reason === 'no-keys' ? { status: 'no-keys', reason: 'png' } : { status: 'mismatch', reason: 'bad-keys' }
  } else {
    svgText = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
    const read = readSvgKeys(svgText)
    if (!read.ok) return read.reason === 'no-keys' ? { status: 'no-keys', reason: 'svg' } : read.reason === 'bad-keys' ? { status: 'mismatch', reason: `bad-${read.problem}` } : { status: 'unreadable', reason: read.reason }
    keys = read.keys
    from = 'svg'
  }
  const problem = keysProblem(keys)
  if (problem) return { status: 'mismatch', reason: `bad-${problem}` }

  const cards = await recompute(keys, ctx)
  if (cards === 'unsupported') return { status: 'unsupported', reason: kindOf(keys.view), keys, href: pageOf(keys, ctx) }
  if (!cards) return { status: 'mismatch', reason: 'unknown-place-or-view' }

  if (keys.edition !== ctx.edition) return { status: 'other-edition', keys, card: cards[0]!, from }
  for (const card of cards) {
    const matches = svgText !== undefined ? same(svgTexts(svgText), svgTexts(card.svg)) && svgTitle(svgText) !== undefined : (await textDigest(card.svg)) === check
    if (matches) return { status: 'ok', keys, card, from }
  }
  return { status: 'altered', keys, card: cards[0]!, from }
}
