/**
 * The picture of "Brasil e regiões" (#91), PURE like the other cards: `brasilCardSvg(view, options)` returns an SVG string, 1080 wide. The headline (the
 * catalog's sentence: both candidates in ballot-number order, no winner), the national bar of the valid votes, then one row per region: its name, ONE bar of
 * its valid votes and, in text, who turned out and who did not. The numbers are the page's (`BrasilView`, nothing recomputed); the names and colours are the
 * identity table's (side a red, side b blue); the text in the bars is fitted by `candidateLabel`, so a long name wraps or shortens and is never cut.
 */
import type { BrasilCandidate, BrasilView } from './brasil'
import { sideTone } from '@/shared/candidates'
import { colors } from '@/shared/tokens'
import { candidateLabel, centredLabel, fit, fixtureBand, flowCard, footerBlock, headlineBlock, INNER, LEFT, mutedLines, rect, SEGMENT_FILL, text } from './share-picture'
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

export function brasilCardSvg(view: BrasilView, o: BrasilCardOptions): BrasilCard {
  const voice = { locale: o.locale ?? DEFAULT_LOCALE, register: 'standard' as const }
  const headline = brasilHeadline(view, voice)
  const out: string[] = []
  let y = headlineBlock(out, headline, fixtureBand(out, o.fixture, message(voice, 'card.example'), 69), { sizes: [52, 48, 44, 40, 36], lines: 5 })
  y += 18

  bar(out, view.ano, view.nationalCandidates, y, 110, 44)
  y += 110 + 54

  for (const r of view.regions) {
    out.push(text(LEFT, y + 34, 36, fit(r.label, 36, INNER * 0.5), { weight: 700 }))
    out.push(text(LEFT + INNER, y + 34, 30, brasilRegionShare(r, voice), { fill: colors.muted, anchor: 'end' }))
    y += 52
    bar(out, view.ano, r.candidates, y, 68, 30)
    y += 68 + 34
    out.push(text(LEFT, y, 30, fit(brasilTurnout(r, voice), 30, INNER), { fill: colors.muted }))
    y += 42
  }

  out.push(rect(LEFT, y - 8, INNER, 3, colors.rule))
  y = mutedLines(out, brasilBase(view.turno, voice), y + 38, { size: 30, lines: 3, step: 40 }) + 24
  y = footerBlock(out, y, { address: o.address, brand: message(voice, o.fixture ? 'card.brand.fixture' : 'card.brand') })
  return flowCard(BRASIL_CARD_WIDTH, y, o.alt ?? headline, out)
}
