/**
 * The share picture, PURE: `shareCardSvg(result, options)` returns an SVG string. No DOM, no fetch, no state, so the
 * same function runs in the browser (share sheet, ticket #7) and in Node at build time (link-preview images, ticket #8).
 *
 * - Numbers come ONLY from the CityResult (site/src/shared/city-model.ts); nothing is recomputed here. The function reads
 *   just the fields of `PictureResult`, so a page may carry that small subset instead of the whole result.
 * - Layout = the mini card of the Sketch frame "3 Folha de compartilhamento" (measured: 220x218 px, ratio 1.009),
 *   drawn at 1080x1070. The frame is followed in content and order: EXEMPLO tag (fixture only) and "Presidente {ano}",
 *   the city name, "{ano} · {turno}º turno · {UF}", "Votaram: X% do eleitorado" with a bar split by candidate,
 *   "Não votaram: Y% do eleitorado" with a bar split by abstenção / brancos / nulos, the short address.
 *   Accepted deviations (ticket #7 discussion): (i) the candidate segments show the candidate NAME and percent ("Lula
 *   52%") where the frame has the generic "A 52%"; (ii) the brand line under the address says "Voto a Voto · Fonte: TSE"
 *   (the picture must state its source). It never draws a QR code; the address has no scheme.
 * - `width`/`height` only change the size the SVG is displayed at (the drawing always uses the viewBox).
 *   EXTENSION POINT for #8: a 1200x630 link-preview layout is a new `layout` option next to `SHARE_CARD_SIZE`, branching
 *   in `shareCardSvg`; `fit`, `wrap`, `textWidth` and `esc` below are reusable.
 * - Fonts are system stacks (the same as the design tokens); no web font is loaded and text is NOT converted to paths.
 *   Text widths are ESTIMATED (`textWidth`, deliberately generous) to wrap and truncate long names, because Node has no
 *   font metrics. Rasterising in Node (#8): the rasteriser must find a serif (Georgia, Palatino, "Iowan Old Style" or a
 *   metric-compatible fallback) and a sans (Helvetica, Arial, Liberation Sans or DejaVu Sans) installed, or be given
 *   font files explicitly (resvg: `fontFiles` + `defaultFontFamily`/`serifFamily`/`sansSerifFamily`). Chromium and
 *   Safari rasterise it with system fonts in the browser.
 */
import type { CityResult, Segment, SegmentKey } from '@/shared/city-model'
import { colors, fonts } from '@/shared/tokens'

/** The fields of a CityResult the picture and the share text read. A CityResult is one. */
export interface PictureResult extends Pick<CityResult, 'ano' | 'turno' | 'aptos' | 'validos' | 'votedPct' | 'notVotedPct'> {
  voted: Pick<Segment, 'key' | 'label' | 'pct'>[]
  notVoted: Pick<Segment, 'key' | 'label' | 'pct'>[]
}
type Seg = PictureResult['voted'][number]

export const SHARE_CARD_SIZE = { width: 1080, height: 1070 } as const

export interface ShareCardOptions {
  cityName: string
  /** "RJ", "Exterior". */
  ufLabel: string
  /** Short address shown near the bottom, without scheme: `votoavoto.exemplo.br/rj/cidade-exemplo`. */
  address: string
  /** Fictitious data: draws the "EXEMPLO" tag and the fictitious-data brand line. */
  fixture?: boolean
  /** Display size of the SVG element; the drawing itself stays 1080x1070. */
  width?: number
  height?: number
}

const W = SHARE_CARD_SIZE.width
const H = SHARE_CARD_SIZE.height
const LEFT = 98
const INNER = 884 // 98 .. 982, the frame's 180 px column
const GAP = 10

/** XML 1.0 forbids most control characters. */
const stripControl = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
const esc = (s: string) => stripControl(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const family = (stack: string) => stack.replace(/"/g, "'")
const SERIF = family(fonts.serif)
const SANS = family(fonts.sans)

const NARROW = new Set("iIjltf.,:;|'!()[]/ ’".split(''))
const WIDE = new Set('mwMW@%'.split(''))
/** Generous width estimate in px of `s` at `size` px (calibrated against Chromium's Helvetica and Georgia: 0.95 to 1.25 times the real width, so slightly generous on average). */
export function textWidth(s: string, size: number, bold = false): number {
  let em = 0
  for (const ch of stripControl(s)) em += NARROW.has(ch) ? 0.3 : WIDE.has(ch) ? 0.9 : /\p{Lu}/u.test(ch) ? 0.74 : /\d/.test(ch) ? 0.56 : 0.52
  return em * size * 1.04 * (bold ? 1.02 : 1)
}

/** `s`, or the longest start of it plus "…" that fits `max` px. */
function fit(s: string, size: number, max: number, bold = false): string {
  const clean = stripControl(s).trim()
  if (textWidth(clean, size, bold) <= max) return clean
  const chars = [...clean]
  while (chars.length > 1 && textWidth(chars.join('').trimEnd() + '…', size, bold) > max) chars.pop()
  return chars.join('').trimEnd() + '…'
}

/** Greedy word wrap; undefined when more than `maxLines` lines are needed or a word is wider than the line. */
function wrap(s: string, size: number, max: number, maxLines: number): string[] | undefined {
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

/** One line at the largest size that fits (128 as in the frame, down to 84); else two lines at 72, the second cut with "…" if needed. */
function nameLines(name: string): { size: number; lines: string[] } {
  for (const size of [128, 112, 96, 84]) if (textWidth(name.trim(), size) <= INNER) return { size, lines: [stripControl(name).trim()] }
  const size = 72
  const lines = wrap(name, size, INNER, 2)
  if (lines) return { size, lines }
  const words = stripControl(name).trim().split(/\s+/)
  let first = ''
  for (const w of words) {
    const next = first ? `${first} ${w}` : w
    if (textWidth(next, size) > INNER) break
    first = next
  }
  if (!first) first = fit(words[0]!, size, INNER)
  const rest = words.join(' ').slice(first.length).trim()
  return { size, lines: rest ? [first, fit(rest, size, INNER)] : [first] }
}

const FILL: Record<SegmentKey, string> = { a: colors['cand-a'], b: colors['cand-b'], outros: colors['cand-outros'], abstencao: colors.abstencao, brancos: colors.brancos, nulos: colors.nulos }
const TEXT_ON: Record<SegmentKey, string> = { a: colors['accent-fg'], b: colors['accent-fg'], outros: colors.ink, abstencao: colors.ink, brancos: colors.ink, nulos: colors.ink }
const ABBR: Partial<Record<SegmentKey, string>> = { abstencao: 'Ab', brancos: 'Br', nulos: 'Nu' }

type Anchor = 'start' | 'middle' | 'end'
const text = (x: number, y: number, size: number, content: string, o: { weight?: 400 | 600 | 700; fill?: string; serif?: boolean; anchor?: Anchor } = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.serif ? SERIF : SANS}" font-size="${size}"${o.weight && o.weight !== 400 ? ` font-weight="${o.weight}"` : ''} fill="${o.fill ?? colors.ink}"${o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : ''}>${esc(content)}</text>`
const rect = (x: number, y: number, w: number, h: number, fill: string, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`

const LABEL = 44
/** Candidate segments: "Name 52%", else a shortened name, else "52%". Other segments: "Abstenção 78%", else "Br". */
function segmentLabel(s: Seg, width: number): string {
  const room = width - 24
  const fits = (t: string) => textWidth(t, LABEL, true) <= room
  if (s.key === 'a' || s.key === 'b' || s.key === 'outros') {
    const name = s.key === 'outros' ? 'Outros' : s.label
    const full = `${name} ${s.pct}%`
    if (fits(full)) return full
    const short = `${fit(name, LABEL, room - textWidth(` ${s.pct}%`, LABEL, true), true)} ${s.pct}%`
    if (!short.startsWith('…') && short.length > 6 && fits(short)) return short
    return fits(`${s.pct}%`) ? `${s.pct}%` : ''
  }
  const full = `${s.label} ${s.pct}%`
  if (fits(full)) return full
  const abbr = ABBR[s.key] ?? ''
  return abbr && fits(abbr) ? abbr : ''
}

/** A bar of `segs`: widths proportional to the integer percents (which add up to 100), 10 px gaps as in the frame. */
function bar(segs: Seg[], y: number, h: number): string {
  const shown = segs.filter((s) => s.pct > 0)
  const unit = (INNER - (shown.length - 1) * GAP) / 100
  let x = LEFT
  return shown
    .map((s) => {
      const w = s.pct * unit
      const label = segmentLabel(s, w)
      const out = rect(x, y, w, h, FILL[s.key]) + (label ? text(x + w / 2, y + h / 2 + 15, LABEL, label, { weight: 600, fill: TEXT_ON[s.key], anchor: 'middle' }) : '')
      x += w + GAP
      return out
    })
    .join('')
}

/** The address must stay readable and complete: 44, 40, 36, then two lines broken after a "/" or "-"; "…" only as a last resort. */
function addressLines(address: string): { size: number; lines: string[] } {
  const a = stripControl(address).trim()
  const size = [44, 40, 36].find((sz) => textWidth(a, sz) <= INNER)
  if (size) return { size, lines: [a] }
  let cut = 0
  for (let i = 1; i < a.length; i++) if (/[/-]/.test(a[i - 1]!) && textWidth(a.slice(0, i), 36) <= INNER) cut = i
  if (!cut) return { size: 36, lines: [fit(a, 36, INNER)] }
  return { size: 36, lines: [a.slice(0, cut), fit(a.slice(cut), 36, INNER)] }
}

export function shareCardSvg(r: PictureResult, o: ShareCardOptions): string {
  const out: string[] = []
  out.push(rect(0, 0, W, H, colors.paper))
  out.push(`<rect x="5" y="5" width="${W - 10}" height="${H - 10}" fill="none" stroke="${colors.ink}" stroke-width="10"/>`)

  // Header: fictitious tag and "Presidente {ano}".
  let hx = LEFT
  if (o.fixture) {
    out.push(rect(LEFT, 69, 285, 78, colors.flag, ' rx="10"'), text(LEFT + 142, 122, 44, 'EXEMPLO', { weight: 700, anchor: 'middle' }))
    hx = 422
  }
  out.push(text(hx, 122, 44, `Presidente ${r.ano}`, { weight: 600, fill: colors.muted }))

  // City name (serif), then cycle, round and UF, then the hairline.
  const { size, lines } = nameLines(o.cityName)
  const two = lines.length > 1
  const baseline1 = two ? 270 : 311
  lines.forEach((line, i) => out.push(text(LEFT, baseline1 + i * 76, size, line, { serif: true })))
  const sub = two ? 406 : 390
  out.push(text(LEFT, sub, 44, `${r.ano} · ${r.turno}º turno · ${fit(o.ufLabel, 44, 400)}`, { fill: colors.muted }))
  const d = two ? 8 : 0
  out.push(rect(LEFT, 430 + d, INNER, 4, colors.rule))

  if (r.aptos <= 0) {
    out.push(text(LEFT, 540 + d, 46, 'Sem eleitores aptos registrados', { weight: 700 }))
  } else {
    out.push(text(LEFT, 517 + d, 46, `Votaram: ${r.votedPct}% do eleitorado`, { weight: 700 }))
    if (r.validos > 0) out.push(bar(r.voted, 545 + d, 108))
    else out.push(rect(LEFT, 545 + d, INNER, 108, colors['paper-2']), text(W / 2, 545 + d + 54 + 15, LABEL, 'Nenhum voto válido', { weight: 600, fill: colors.muted, anchor: 'middle' }))
    out.push(text(LEFT, 740 + d, 46, `Não votaram: ${r.notVotedPct}% do eleitorado`, { weight: 700 }))
    out.push(bar(r.notVoted, 771 + d, 108))
  }

  // Address (no QR), then the brand and source line.
  const addr = addressLines(o.address)
  const lastAddr = 995 + (addr.lines.length - 1) * 38
  addr.lines.forEach((line, i) => out.push(text(W / 2, 995 - (addr.lines.length - 1) * 8 + i * 38, addr.size, line, { weight: 600, anchor: 'middle' })))
  const brand = o.fixture ? 'Voto a Voto · Dados fictícios. Fonte real: TSE.' : 'Voto a Voto · Fonte: TSE'
  const brandSize = [38, 34, 30].find((sz) => textWidth(brand, sz) <= INNER) ?? 30
  out.push(text(W / 2, Math.max(1040, lastAddr + 48), brandSize, brand, { fill: colors.muted, anchor: 'middle' }))

  const title = shareCardAlt(r, o)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${o.width ?? W}" height="${o.height ?? H}" viewBox="0 0 ${W} ${H}" role="img"><title>${esc(title)}</title>${out.join('')}</svg>`
}

/** The picture's `<title>` (an og:image alt in ticket #8): ONE sentence with the headline numbers. */
export function shareCardAlt(r: PictureResult, o: Pick<ShareCardOptions, 'cityName' | 'ufLabel'>): string {
  return `${o.cityName}, ${o.ufLabel}: resultado de ${r.ano}, ${r.turno}º turno. Votaram ${r.votedPct}% do eleitorado, não votaram ${r.notVotedPct}%.`
}