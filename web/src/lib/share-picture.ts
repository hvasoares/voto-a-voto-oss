/**
 * The shared builder of the share pictures (#138), PURE: what every card/content pair draws the same way, so a picture is defined by its
 * content (the numbers, the order of the candidates, the red/blue assignment, the abbreviations, the wording) plus this builder.
 *
 * - Primitives: `esc`, `text`, `rect`, the width estimate `textWidth`, `fit`, `wrap`, `labelText`, `candidateLabel`. Fonts are system stacks and
 *   text is NOT converted to paths; widths are ESTIMATED (deliberately generous) because Node has no font metrics (see `share-card.ts`).
 * - Frame: `pictureSvg` (the SVG root with its title), `cardSvg` (paper and the thick ink border), `flowCard` (a card whose height follows its
 *   content), `exampleTag` and `fixtureBand` (the "EXEMPLO" tag).
 * - Blocks of the 1080-wide column (`LEFT` 98, `INNER` 884): `headlineBlock` (serif headline), `mutedLines` (a grey paragraph), `footerBlock`
 *   (the short address and the source line), `centredLabel` (the text in a bar segment), `largestFit` (the biggest size that holds a text).
 * The builder holds no flags and no candidate: a picture that shares no layout part with another keeps its own drawing.
 */
import type { SegmentKey } from '@/shared/city-model'
import { colors, fonts } from '@/shared/tokens'
import { pickCandidateText } from '@/shared/fit-candidate'

/** The left edge and the width of the text column of the 1080-wide pictures (the frame's 180 px column). */
export const LEFT = 98
export const INNER = 884

/** XML 1.0 forbids most control characters. */
export const stripControl = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
export const esc = (s: string) => stripControl(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const family = (stack: string) => stack.replace(/"/g, "'")
export const SERIF = family(fonts.serif)
export const SANS = family(fonts.sans)

const NARROW = new Set("iIjltf.,:;|'!()[]/ ’".split(''))
const WIDE = new Set('mwMW@%'.split(''))
/** Generous width estimate in px of `s` at `size` px (calibrated against Chromium's Helvetica and Georgia: 0.95 to 1.25 times the real width, so slightly generous on average). */
export function textWidth(s: string, size: number, bold = false): number {
  let em = 0
  for (const ch of stripControl(s)) em += NARROW.has(ch) ? 0.3 : WIDE.has(ch) ? 0.9 : /\p{Lu}/u.test(ch) ? 0.74 : /\d/.test(ch) ? 0.56 : 0.52
  return em * size * 1.04 * (bold ? 1.02 : 1)
}

/** `s`, or the longest start of it plus "…" that fits `max` px. */
export function fit(s: string, size: number, max: number, bold = false): string {
  const clean = stripControl(s).trim()
  if (textWidth(clean, size, bold) <= max) return clean
  const chars = [...clean]
  while (chars.length > 1 && textWidth(chars.join('').trimEnd() + '…', size, bold) > max) chars.pop()
  return chars.join('').trimEnd() + '…'
}

/** Greedy word wrap; undefined when more than `maxLines` lines are needed or a word is wider than the line. */
export function wrap(s: string, size: number, max: number, maxLines: number): string[] | undefined {
  const lines: string[] = []
  let line = ''
  for (const word of stripControl(s).trim().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (textWidth(next, size) <= max) line = next
    else {
      if (line) lines.push(line)
      line = word
      if (textWidth(word, size) > max) return undefined
    }
  }
  if (line) lines.push(line)
  return lines.length <= maxLines ? lines : undefined
}

/** The first of `sizes` (biggest first) at which `s` is one line of at most `max` px; the last size when none is. */
export const largestFit = (s: string, sizes: readonly number[], max: number, bold = false): number => sizes.find((sz) => textWidth(s, sz, bold) <= max) ?? sizes[sizes.length - 1]!

/** `s` in at most `maxLines` lines at the first of `sizes` that holds it; at the last size what does not fit is cut with "…". */
export function fitLines(s: string, sizes: readonly number[], max: number, maxLines: number): { size: number; lines: string[] } {
  const size = sizes.find((sz) => wrap(s, sz, max, maxLines)) ?? sizes[sizes.length - 1]!
  return { size, lines: wrap(s, size, max, maxLines) ?? [fit(s, size, max)] }
}

export type Anchor = 'start' | 'middle' | 'end'
export const text = (x: number, y: number, size: number, content: string, o: { weight?: 400 | 600 | 700; fill?: string; serif?: boolean; anchor?: Anchor } = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.serif ? SERIF : SANS}" font-size="${size}"${o.weight && o.weight !== 400 ? ` font-weight="${o.weight}"` : ''} fill="${o.fill ?? colors.ink}"${o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : ''}>${esc(content)}</text>`
export const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`

/** The fill of every segment of a bar (the candidates by side, the others, and the three ways of not voting). */
export const SEGMENT_FILL: Record<SegmentKey, string> = { a: colors['cand-a'], b: colors['cand-b'], outros: colors['cand-outros'], abstencao: colors.abstencao, brancos: colors.brancos, nulos: colors.nulos }

/** Two-line labels are set a little smaller so both lines sit inside the bar. */
const TWO_LINES = 0.9

/**
 * The text of a candidate (the two sides) in a segment `room` units wide at `size`: "Name 52%", the name wrapped, the short form, the
 * share alone, else '' (#85). Measured with `textWidth`, never cut with "…". Returns the lines and the size they are set in.
 */
export function candidateLabel(name: string, pct: string, short: string | undefined, room: number, size: number): { text: string; size: number } | undefined {
  const t = pickCandidateText(name, pct, short, (line, lines) => textWidth(line, lines > 1 ? Math.round(size * TWO_LINES) : size, true) <= room)
  return t ? { text: t, size: t.includes('\n') ? Math.round(size * TWO_LINES) : size } : undefined
}

/** A label centred on (`x`, `cy`): one line, or two stacked when `content` has a line break. */
export function labelText(x: number, cy: number, size: number, content: string, o: Parameters<typeof text>[4]): string {
  const lines = content.split('\n')
  const gap = size * 1.05
  return lines.map((line, i) => text(x, Math.round(cy + size * 0.34 + (i - (lines.length - 1) / 2) * gap), size, line, o)).join('')
}

/** The label of a bar segment `[x, x + w]` high `h` from `y`, centred in it; '' when there is none (the segment is too narrow for any form). */
export function centredLabel(x: number, w: number, y: number, h: number, label: { text: string; size: number } | undefined, o: { weight: 600 | 700; fill: string }): string {
  return label ? labelText(x + w / 2, y + h / 2, label.size, label.text, { weight: o.weight, fill: o.fill, anchor: 'middle' }) : ''
}

// --- the frame ---------------------------------------------------------------------------------------------------------------------------

export interface PictureFrame {
  width: number
  height: number
  /** The size the SVG element is displayed at; the drawing itself always uses the viewBox. */
  displayWidth?: number
  displayHeight?: number
  /** The picture's text alternative. */
  title: string
  /** Everything inside the root, after the title. */
  body: string
}

/** The SVG root, its viewBox and its `<title>`. */
export const pictureSvg = (f: PictureFrame): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${f.displayWidth ?? f.width}" height="${f.displayHeight ?? f.height}" viewBox="0 0 ${f.width} ${f.height}" role="img"><title>${esc(f.title)}</title>${f.body}</svg>`

/** Paper and the thick ink border of a card `width` x `height`. */
export const paperFrame = (width: number, height: number): string =>
  `${rect(0, 0, width, height, colors.paper)}<rect x="5" y="5" width="${width - 10}" height="${height - 10}" fill="none" stroke="${colors.ink}" stroke-width="10"/>`

/** A card: paper, border, then `parts`. */
export const cardSvg = (f: Omit<PictureFrame, 'body'> & { parts: readonly string[] }): string => pictureSvg({ ...f, body: paperFrame(f.width, f.height) + f.parts.join('') })

/** A card as tall as its content: the height is `y` (where the content ended) rounded. */
export function flowCard(width: number, y: number, title: string, parts: readonly string[]): { svg: string; height: number } {
  const height = Math.round(y)
  return { svg: cardSvg({ width, height, title, parts }), height }
}

/** The "EXEMPLO" tag of fictitious data at (`x`, `y`); `large` is the sticker's. */
export const exampleTag = (x: number, y: number, label: string, large = false): string =>
  large
    ? rect(x, y, 285, 84, colors.flag, ' rx="12"') + text(x + 142, y + 57, 44, label, { weight: 700, anchor: 'middle' })
    : rect(x, y, 285, 78, colors.flag, ' rx="10"') + text(x + 142, y + 53, 44, label, { weight: 700, anchor: 'middle' })

/** The tag at the top of a flowing card when the data is fictitious; returns where the content starts (`gap` px under the tag). */
export function fixtureBand(out: string[], fixture: boolean | undefined, label: string, y: number, gap = 36): number {
  if (!fixture) return y
  out.push(exampleTag(LEFT, y, label))
  return y + 78 + gap
}

// --- blocks of the column ---------------------------------------------------------------------------------------------------------------

/** The headline in the serif at the first size of `sizes` that holds it in `lines` lines; `y` is the top, the result is where the next block starts. */
export function headlineBlock(out: string[], headline: string, y: number, o: { sizes: readonly number[]; lines: number; left?: number; inner?: number }): number {
  const { size, lines } = fitLines(headline, o.sizes, o.inner ?? INNER, o.lines)
  y += size
  for (const line of lines) (out.push(text(o.left ?? LEFT, y, size, line, { serif: true })), (y += size * 1.3))
  return y
}

/** A paragraph in the muted grey, `step` px between baselines, drawn `dy` below `y`; wrapped in at most `lines` lines, cut with "…" if it cannot be. Returns the next `y`. */
export function mutedLines(out: string[], content: string, y: number, o: { size: number; lines: number; step: number; dy?: number }): number {
  for (const line of wrap(content, o.size, INNER, o.lines) ?? [fit(content, o.size, INNER)]) (out.push(text(LEFT, y + (o.dy ?? 0), o.size, line, { fill: colors.muted })), (y += o.step))
  return y
}

/** The short address (bold, the first of `addressSizes` that fits) and the source line under it; returns the `y` after the block. */
export function footerBlock(out: string[], y: number, o: { address: string; brand: string; addressSizes?: readonly number[]; addressStep?: number }): number {
  const size = largestFit(o.address, o.addressSizes ?? [44, 40, 36], INNER, true)
  out.push(text(LEFT, y, size, fit(o.address, size, INNER, true), { weight: 600 }))
  y += o.addressStep ?? 52
  out.push(text(LEFT, y, largestFit(o.brand, [36, 32, 28], INNER), o.brand, { fill: colors.muted }))
  return y + 70
}
