/**
 * The one-stat card's picture (#25), PURE like `shareCardSvg`: `statCardSvg(stat, options)` returns an SVG string, in the
 * browser (the generator page) and in Node (tests; a pre-rendered city page could use the link-preview size, see
 * web/docs/checkpoints/issue-25.md). It reuses the drawing helpers of the share card (`share-card.ts`: escaping, width
 * estimate, wrap, fit, the type stacks) and the same tokens, so both pictures look like one family.
 *
 * Three sizes, each its own layout (a number and a line need different room in each):
 *   square   1080x1080  number, line, address        (feed posts)
 *   story    1080x1920  the same, taller             (Stories)
 *   preview  1200x630   number left, line right      (the shape of a link preview, og:image)
 *
 * The picture carries ONE number, ONE line and the short address (plus the EXEMPLO tag for fixture data and the source line;
 * the picture must state its source). The words come from `statCard()` (catalog); nothing is worded here. The text stays text
 * (not paths); widths are ESTIMATED as in the share card.
 */
import { colors } from '@/shared/tokens'
import { esc, fit, rect, stripControl, text, textWidth, wrap } from './share-card'
import { DEFAULT_LOCALE, message, type Locale } from './sentences/catalog'
import type { Stat } from './sentences/stat'

export const STAT_SIZES = {
  square: { width: 1080, height: 1080 },
  story: { width: 1080, height: 1920 },
  preview: { width: 1200, height: 630 },
} as const
export type StatSize = keyof typeof STAT_SIZES
export const STAT_SIZE_IDS = Object.keys(STAT_SIZES) as StatSize[]

export interface StatCardOptions {
  size: StatSize
  /** Short address, without scheme: `votoavoto.exemplo.br/rj/cidade-exemplo`. */
  address: string
  /** Fictitious data: the "EXEMPLO" tag and the fictitious-data source line. */
  fixture?: boolean
  /** Replaces the text alternative (`<title>`), e.g. the plain register's; the stat's own `alt` by default. */
  alt?: string
  /** The language of the words around the number (the catalog's `card.*`); Portuguese by default. */
  locale?: Locale
}

const LEFT = 98

/** The largest size from `sizes` at which `s` fits `max` px on one line. */
const biggest = (s: string, sizes: number[], max: number): number => sizes.find((sz) => textWidth(s, sz) <= max) ?? sizes[sizes.length - 1]!

/** `line` in at most `maxLines` lines at the largest size of `sizes` that holds it; the last size cuts with "…". */
function lines(line: string, sizes: number[], max: number, maxLines: number): { size: number; rows: string[] } {
  for (const size of sizes) {
    const rows = wrap(line, size, max, maxLines)
    if (rows) return { size, rows }
  }
  const size = sizes[sizes.length - 1]!
  const words = stripControl(line).trim().split(/\s+/)
  const rows: string[] = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (textWidth(next, size) <= max) cur = next
    else {
      rows.push(cur)
      cur = w
    }
    if (rows.length === maxLines) break
  }
  if (rows.length < maxLines && cur) rows.push(cur)
  rows[rows.length - 1] = fit(rows[rows.length - 1]! + (rows.length === maxLines ? ' …' : ''), size, max)
  return { size, rows: rows.slice(0, maxLines) }
}

export function statCardSvg(stat: Stat, o: StatCardOptions): string {
  const { width: W, height: H } = STAT_SIZES[o.size]
  const say = (key: 'card.example' | 'card.brand' | 'card.brand.fixture') => message({ locale: o.locale ?? DEFAULT_LOCALE, register: 'standard' }, key)
  const out: string[] = [rect(0, 0, W, H, colors.paper), `<rect x="5" y="5" width="${W - 10}" height="${H - 10}" fill="none" stroke="${colors.ink}" stroke-width="10"/>`]
  const inner = W - 2 * LEFT
  const wide = o.size === 'preview'
  const tagY = wide ? 52 : 69
  if (o.fixture) out.push(rect(LEFT, tagY, 285, 78, colors.flag, ' rx="10"'), text(LEFT + 142, tagY + 53, 44, say('card.example'), { weight: 700, anchor: 'middle' }))

  const addrSize = wide ? 34 : 44
  const brand = say(o.fixture ? 'card.brand.fixture' : 'card.brand')
  const brandSize = wide ? 28 : 38
  const bottom = H - (wide ? 36 : 56)
  const addrY = bottom - (wide ? 42 : 58)

  if (wide) {
    // Number on the left half, the line on the right; both centred on the same horizontal axis.
    const colNumber = 470
    const colLine = W - LEFT - (LEFT + colNumber + 50)
    const xLine = LEFT + colNumber + 50
    const numSize = stat.number ? biggest(stat.number, [260, 220, 190, 160, 130, 100], colNumber) : 0
    const l = lines(stat.line, [48, 42, 38, 34], colLine, 6)
    const axis = 330
    if (stat.number) out.push(text(LEFT, axis + numSize * 0.34, numSize, stat.number, { serif: true }))
    const lh = l.size * 1.28
    const top = axis - ((l.rows.length - 1) * lh) / 2 + l.size * 0.3
    l.rows.forEach((row, i) => out.push(text(stat.number ? xLine : LEFT, top + i * lh, l.size, row, { serif: true })))
  } else {
    const tall = o.size === 'story'
    const numSize = stat.number ? biggest(stat.number, tall ? [340, 300, 260, 220, 180, 140] : [300, 260, 220, 190, 160, 120], inner) : 0
    const l = lines(stat.line, tall ? [64, 58, 52, 46] : [58, 52, 46, 42], inner, tall ? 6 : 5)
    const lh = l.size * 1.3
    const blockH = (stat.number ? numSize * 0.72 + 50 : 0) + l.rows.length * lh
    const topY = tall ? 560 : 320
    const room = (tall ? addrY - 120 : addrY - 80) - topY
    const start = topY + Math.max(0, (room - blockH) / 2)
    let y = start
    if (stat.number) {
      y += numSize * 0.72
      out.push(text(LEFT, y, numSize, stat.number, { serif: true }))
      y += 50
    }
    l.rows.forEach((row, i) => out.push(text(LEFT, y + l.size + i * lh - 8, l.size, row, { serif: true })))
  }

  const addr = fit(o.address, addrSize, inner, true)
  out.push(text(wide ? LEFT : W / 2, addrY, addrSize, addr, { weight: 600, anchor: wide ? 'start' : 'middle' }))
  out.push(text(wide ? LEFT : W / 2, bottom, brandSize, brand, { fill: colors.muted, anchor: wide ? 'start' : 'middle' }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img"><title>${esc(o.alt ?? stat.alt)}</title>${out.join('')}</svg>`
}
