/**
 * The picture of "Brasil e regiões" (#91), PURE like the other cards: `brasilCardSvg(view, options)` returns an SVG string, 1080 wide. The headline (the
 * catalog's sentence: both candidates in ballot-number order, no winner), the national bar of the valid votes, then one row per region: its name, ONE bar of
 * its valid votes and, in text, who turned out and who did not. The numbers are the page's (`BrasilView`, nothing recomputed); the names and colours are the
 * identity table's (side a red, side b blue); the text in the bars is fitted by `candidateLabel`, so a long name wraps or shortens and is never cut.
 */
import type { BrasilCandidate, BrasilView } from './brasil'
import { sideTone } from '@/shared/candidates'
import { colors } from '@/shared/tokens'
import { candidateLabel, centredLabel, fit, INNER, LEFT, rect, SEGMENT_FILL, text, wrap } from './share-picture'
import { fixtureBand, flowCard, footerBlock, headlineBlock, mutedLines } from './share-picture-flow'
import { DEFAULT_LOCALE, message, type Locale } from './sentences/catalog'
import { brasilBase, brasilHeadline, brasilRegionShare, brasilTurnout } from './sentences/brasil'

export const BRASIL_CARD_WIDTH = 1080
const GAP = 4

export interface BrasilCardOptions {
  /** Short address without scheme: `votoavoto.exemplo.br/brasil`. */
  address: string
  fixture?: boolean
  locale?: Locale
  /** Replaces the text alternative (`<title>`); the headline by default. */
  alt?: string
}

export interface BrasilCard {
  svg: string
  height: number
}

/** Two candidate segments side by side, each with its fitted text; the widths come from the scaled shares. */
function bar(out: string[], ano: number, cs: readonly BrasilCandidate[], y: number, h: number, size: number): void {
  const total = cs.reduce((n, c) => n + c.pctScaled, 0) || 1
  let x = LEFT
  cs.forEach((c, i) => {
    const w = (c.pctScaled / total) * INNER
    const tone = sideTone(ano, c.numero, cs[1 - i]?.numero, i === 0 ? 'a' : 'b')
    out.push(rect(x + (i === 0 ? 0 : GAP / 2), y, Math.max(0, w - GAP / 2), h, SEGMENT_FILL[tone]))
    out.push(centredLabel(x, w, y, h, candidateLabel(c.labelFull, `${c.pctText}%`, c.label, w - 24, size), { weight: 700, fill: colors['accent-fg'] }))
    x += w
  })
}

/** The share format is fixed at 1080x1350 (#106, D-038): the picture is exactly this tall, whatever the headline and the fixture tag take. */
export const BRASIL_CARD_HEIGHT = 1350
/** A region's row (its name, a bar tall enough for a two-line candidate label, the turnout text) is never tighter than this, nor looser than ROW_MAX. */
const ROW_MIN = 134
const ROW_MAX = 168
const BAR_MIN = 58
const NATIONAL_BAR = 84
/** Clear space kept between the last row and the rule above the closing lines. */
const RULE_GAP = 20
const HEADLINE_SIZES = [52, 48, 44, 40, 36] as const

export function brasilCardSvg(view: BrasilView, o: BrasilCardOptions): BrasilCard {
  const voice = { locale: o.locale ?? DEFAULT_LOCALE, register: 'standard' as const }
  const headline = brasilHeadline(view, voice)
  const base = brasilBase(view.turno, voice)
  const baseLines = (wrap(base, 28, INNER, 3) ?? [fit(base, 28, INNER)]).length
  // The closing lines (rule, base note, address, source line) sit at the foot; the regions share what is left between the national bar and them.
  const tail = 30 + 36 * baseLines + 24 + 48 + 70
  const n = Math.max(1, view.regions.length)
  const top = o.fixture ? 61 + 78 + 24 : 61
  const room = (size: number, lines: number) => (BRASIL_CARD_HEIGHT - tail - RULE_GAP - (top + size + lines * size * 1.3 + 8 + NATIONAL_BAR + 40)) / n
  // The largest headline (up to three lines) that leaves every region its minimum row.
  const fits = HEADLINE_SIZES.flatMap((size) => {
    const lines = wrap(headline, size, INNER, 3)
    return lines ? [{ size, lines: lines.length }] : []
  })
  const size = (fits.find((f) => room(f.size, f.lines) >= ROW_MIN) ?? fits.at(-1))?.size ?? 36

  const out: string[] = []
  let y = headlineBlock(out, headline, fixtureBand(out, o.fixture, message(voice, 'card.example'), 61, 24), { sizes: [size], lines: 3 })
  y += 8
  bar(out, view.ano, view.nationalCandidates, y, NATIONAL_BAR, 40)
  y += NATIONAL_BAR + 40

  const row = Math.max(ROW_MIN, Math.min(ROW_MAX, Math.floor((BRASIL_CARD_HEIGHT - tail - RULE_GAP - y) / n)))
  const barH = Math.min(68, Math.max(BAR_MIN, row - 70))
  for (const r of view.regions) {
    out.push(text(LEFT, y + 28, 32, fit(r.label, 32, INNER * 0.5), { weight: 700 }))
    out.push(text(LEFT + INNER, y + 28, 28, brasilRegionShare(r, voice), { fill: colors.muted, anchor: 'end' }))
    bar(out, view.ano, r.candidates, y + 36, barH, 28)
    out.push(text(LEFT, y + 36 + barH + 26, 28, fit(brasilTurnout(r, voice), 28, INNER), { fill: colors.muted }))
    y += row
  }

  y = BRASIL_CARD_HEIGHT - tail
  out.push(rect(LEFT, y - 8, INNER, 3, colors.rule))
  y = mutedLines(out, base, y + 30, { size: 28, lines: 3, step: 36 }) + 24
  y = footerBlock(out, y, { address: o.address, brand: message(voice, o.fixture ? 'card.brand.fixture' : 'card.brand'), addressStep: 48 })
  return flowCard(BRASIL_CARD_WIDTH, y, o.alt ?? headline, out)
}
