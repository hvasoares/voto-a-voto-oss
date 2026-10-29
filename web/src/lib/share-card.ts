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
import { colors } from '@/shared/tokens'
import { candidateLabel, cardSvg, centredLabel, esc, exampleTag, fit, fitLines, INNER, largestFit, LEFT, rect, SEGMENT_FILL, stripControl, text, textWidth, wrap } from './share-picture'
import { DEFAULT_LOCALE, message, type Locale, type MessageKey } from './sentences/catalog'

/** The fields of a CityResult the picture and the share text read. A CityResult is one. */
export interface PictureResult extends Pick<CityResult, 'ano' | 'turno' | 'aptos' | 'validos' | 'votedPct' | 'notVotedPct'> {
  voted: Pick<Segment, 'key' | 'label' | 'pct' | 'tone' | 'short'>[]
  notVoted: Pick<Segment, 'key' | 'label' | 'pct'>[]
}
type Seg = PictureResult['voted'][number]

export const SHARE_CARD_SIZE = { width: 1080, height: 1070 } as const

export interface ShareCardOptions {
  cityName: string
  /** "RJ", "Exterior". */
  ufLabel: string
  /** The picture's text alternative (`<title>`): the card's headline sentence, from `headline()`. */
  alt: string
  /** Short address shown near the bottom, without scheme: `votoavoto.exemplo.br/rj/cidade-exemplo`. */
  address: string
  /** Fictitious data: draws the "EXEMPLO" tag and the fictitious-data brand line. */
  fixture?: boolean
  /** The language of the words drawn around the numbers (the catalog's `card.*`); Portuguese by default. */
  locale?: Locale
  /** Display size of the SVG element; the drawing itself stays 1080x1070. */
  width?: number
  height?: number
  /** The guess card (#45): the question, the result of the visitor's guess and the answer, in place of the two bars. The words come ready from the catalog. */
  guess?: GuessCard
}

/** What the guess card says (#45): `sub` replaces the "{ano} · {turno}º turno · {UF}" line, which would pin the card to one round. */
export interface GuessCard {
  sub: string
  question: string
  result: string
  answer: string
}

const W = SHARE_CARD_SIZE.width
const H = SHARE_CARD_SIZE.height
const GAP = 10
const LABEL = 44

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

const TEXT_ON: Record<SegmentKey, string> = { a: colors['accent-fg'], b: colors['accent-fg'], outros: colors.ink, abstencao: colors.ink, brancos: colors.ink, nulos: colors.ink }
const ABBR: Partial<Record<SegmentKey, string>> = { abstencao: 'Ab', brancos: 'Br', nulos: 'Nu' }

/** Candidate segments: "Name 52%", else the name wrapped, else the short form, else "52%". Other segments: "Abstenção 78%", else "Br". */
function segmentLabel(s: Seg, width: number, others: string): { text: string; size: number } | undefined {
  const room = width - 24
  const fits = (t: string) => textWidth(t, LABEL, true) <= room
  if (s.key === 'a' || s.key === 'b') return candidateLabel(s.label, `${s.pct}%`, s.short, room, LABEL)
  if (s.key === 'outros') {
    const full = `${others} ${s.pct}%`
    if (fits(full)) return { text: full, size: LABEL }
    const short = `${fit(others, LABEL, room - textWidth(` ${s.pct}%`, LABEL, true), true)} ${s.pct}%`
    if (!short.startsWith('…') && short.length > 6 && fits(short)) return { text: short, size: LABEL }
    return fits(`${s.pct}%`) ? { text: `${s.pct}%`, size: LABEL } : undefined
  }
  const full = `${s.label} ${s.pct}%`
  if (fits(full)) return { text: full, size: LABEL }
  const abbr = ABBR[s.key] ?? ''
  return abbr && fits(abbr) ? { text: abbr, size: LABEL } : undefined
}

/** A bar of `segs`: widths proportional to the integer percents (which add up to 100), 10 px gaps as in the frame. */
function bar(segs: Seg[], y: number, h: number, others: string): string {
  const shown = segs.filter((s) => s.pct > 0)
  const unit = (INNER - (shown.length - 1) * GAP) / 100
  let x = LEFT
  return shown
    .map((s) => {
      const w = s.pct * unit
      const label = segmentLabel(s, w, others)
      const out = rect(x, y, w, h, SEGMENT_FILL[s.tone ?? s.key]) + centredLabel(x, w, y, h, label, { weight: 600, fill: TEXT_ON[s.tone ?? s.key] })
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

/** The question (up to three lines), the result of the guess in the serif (the biggest size that fits one line) and the answer (up to two lines). Nothing is cut with "…" unless the words cannot be made to fit. */
function guessBlock(g: GuessCard, top: number): string {
  const out: string[] = []
  const { size: qSize, lines: q } = fitLines(g.question, [46, 42, 38], INNER, 3)
  q.forEach((line, i) => out.push(text(LEFT, top + 46 + i * 58, qSize, line, { weight: 700 })))
  const rSize = largestFit(g.result, [96, 84, 72, 60], INNER)
  out.push(text(LEFT, top + 46 + 3 * 58 + 70, rSize, fit(g.result, rSize, INNER), { serif: true, fill: colors.accent }))
  const { size: aSize, lines: a } = fitLines(g.answer, [42, 38, 34], INNER, 2)
  a.forEach((line, i) => out.push(text(LEFT, top + 46 + 3 * 58 + 70 + 64 + i * 50, aSize, line, { fill: colors.muted })))
  return out.join('')
}

export function shareCardSvg(r: PictureResult, o: ShareCardOptions): string {
  const say = (key: MessageKey, params: Record<string, string | number> = {}) => message({ locale: o.locale ?? DEFAULT_LOCALE, register: 'standard' }, key, params)
  const out: string[] = []

  // Header: fictitious tag and "Presidente {ano}".
  let hx = LEFT
  if (o.fixture) {
    out.push(exampleTag(LEFT, 69, say('card.example')))
    hx = 422
  }
  out.push(text(hx, 122, 44, say('card.president', { ano: r.ano }), { weight: 600, fill: colors.muted }))

  // City name (serif), then cycle, round and UF, then the hairline.
  const { size, lines } = nameLines(o.cityName)
  const two = lines.length > 1
  const baseline1 = two ? 270 : 311
  lines.forEach((line, i) => out.push(text(LEFT, baseline1 + i * 76, size, line, { serif: true })))
  const sub = two ? 406 : 390
  out.push(text(LEFT, sub, 44, o.guess ? fit(o.guess.sub, 44, INNER) : say('card.round', { ano: r.ano, turno: r.turno, uf: fit(o.ufLabel, 44, 400) }), { fill: colors.muted }))
  const d = two ? 8 : 0
  out.push(rect(LEFT, 430 + d, INNER, 4, colors.rule))

  if (o.guess) {
    out.push(guessBlock(o.guess, 500 + d))
  } else if (r.aptos <= 0) {
    out.push(text(LEFT, 540 + d, 46, say('card.noElectorate'), { weight: 700 }))
  } else {
    out.push(text(LEFT, 517 + d, 46, say('card.voted', { pct: r.votedPct }), { weight: 700 }))
    if (r.validos > 0) out.push(bar(r.voted, 545 + d, 108, say('card.others')))
    else out.push(rect(LEFT, 545 + d, INNER, 108, colors['paper-2']), text(W / 2, 545 + d + 54 + 15, LABEL, say('card.noValid'), { weight: 600, fill: colors.muted, anchor: 'middle' }))
    out.push(text(LEFT, 740 + d, 46, say('card.notVoted', { pct: r.notVotedPct }), { weight: 700 }))
    out.push(bar(r.notVoted, 771 + d, 108, say('card.others')))
  }

  // Address (no QR), then the brand and source line.
  const addr = addressLines(o.address)
  const lastAddr = 995 + (addr.lines.length - 1) * 38
  addr.lines.forEach((line, i) => out.push(text(W / 2, 995 - (addr.lines.length - 1) * 8 + i * 38, addr.size, line, { weight: 600, anchor: 'middle' })))
  const brand = say(o.fixture ? 'card.brand.fixture' : 'card.brand')
  out.push(text(W / 2, Math.max(1040, lastAddr + 48), largestFit(brand, [38, 34, 30], INNER), brand, { fill: colors.muted, anchor: 'middle' }))

  return cardSvg({ width: W, height: H, displayWidth: o.width, displayHeight: o.height, title: o.alt, parts: out })
}

/** `svg` (made by `shareCardSvg`) with another `<title>`: the same drawing, the text alternative of another register. */
export function withAlt(svg: string, alt: string): string {
  return svg.replace(/(<title\b[^>]*>)[\s\S]*?<\/title>/, (_, open: string) => `${open}${esc(alt)}</title>`)
}
