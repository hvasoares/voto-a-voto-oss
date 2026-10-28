/**
 * The picture of "Brasil e regiões" (#91), PURE like the other cards: `brasilCardSvg(view, options)` returns an SVG string, 1080 wide. The headline (the
 * catalog's sentence: both candidates in ballot-number order, no winner), the national bar of the valid votes, then one row per region: its name, ONE bar of
 * its valid votes and, in text, who turned out and who did not. The numbers are the page's (`BrasilView`, nothing recomputed); the names and colours are the
 * identity table's (side a red, side b blue); the text in the bars is fitted by `candidateLabel`, so a long name wraps or shortens and is never cut.
 */
import type { BrasilCandidate, BrasilView } from './brasil'
import { sideTone } from '@/shared/candidates'
import { colors } from '@/shared/tokens'
import { candidateLabel, esc, fit, labelText, rect, text, textWidth, wrap } from './share-card'
import { DEFAULT_LOCALE, message, type Locale } from './sentences/catalog'
import { brasilBase, brasilHeadline, brasilRegionShare, brasilTurnout } from './sentences/brasil'

export const BRASIL_CARD_WIDTH = 1080
const LEFT = 98
const INNER = 884
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

const FILL = { a: colors['cand-a'], b: colors['cand-b'], outros: colors['cand-outros'] }

/** Two candidate segments side by side, each with its fitted text; the widths come from the scaled shares. */
function bar(out: string[], ano: number, cs: readonly BrasilCandidate[], y: number, h: number, size: number): void {
  const total = cs.reduce((n, c) => n + c.pctScaled, 0) || 1
  let x = LEFT
  cs.forEach((c, i) => {
    const w = (c.pctScaled / total) * INNER
    const tone = sideTone(ano, c.numero, cs[1 - i]?.numero, i === 0 ? 'a' : 'b')
    out.push(rect(x + (i === 0 ? 0 : GAP / 2), y, Math.max(0, w - GAP / 2), h, FILL[tone]))
    const t = candidateLabel(c.labelFull, `${c.pctText}%`, c.label, w - 24, size)
    if (t) out.push(labelText(x + w / 2, y + h / 2, t.size, t.text, { weight: 700, fill: colors['accent-fg'], anchor: 'middle' }))
    x += w
  })
}

export function brasilCardSvg(view: BrasilView, o: BrasilCardOptions): BrasilCard {
  const voice = { locale: o.locale ?? DEFAULT_LOCALE, register: 'standard' as const }
  const headline = brasilHeadline(view, voice)
  const out: string[] = []
  let y = 69
  if (o.fixture) {
    out.push(rect(LEFT, y, 285, 78, colors.flag, ' rx="10"'), text(LEFT + 142, y + 53, 44, message(voice, 'card.example'), { weight: 700, anchor: 'middle' }))
    y += 78 + 36
  }
  const size = [52, 48, 44, 40, 36].find((sz) => wrap(headline, sz, INNER, 5)) ?? 36
  const lines = wrap(headline, size, INNER, 5) ?? [fit(headline, size, INNER)]
  y += size
  for (const line of lines) (out.push(text(LEFT, y, size, line, { serif: true })), (y += size * 1.3))
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
  const base = brasilBase(view.turno, voice)
  const baseLines = wrap(base, 30, INNER, 3) ?? [fit(base, 30, INNER)]
  y += 38
  for (const line of baseLines) (out.push(text(LEFT, y, 30, line, { fill: colors.muted })), (y += 40))
  y += 24
  const addrSize = [44, 40, 36].find((sz) => textWidth(o.address, sz, true) <= INNER) ?? 36
  out.push(text(LEFT, y, addrSize, fit(o.address, addrSize, INNER, true), { weight: 600 }))
  y += 52
  const brand = message(voice, o.fixture ? 'card.brand.fixture' : 'card.brand')
  out.push(text(LEFT, y, [36, 32, 28].find((sz) => textWidth(brand, sz) <= INNER) ?? 28, brand, { fill: colors.muted }))
  y += 70

  const H = Math.round(y)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${BRASIL_CARD_WIDTH}" height="${H}" viewBox="0 0 ${BRASIL_CARD_WIDTH} ${H}" role="img"><title>${esc(o.alt ?? headline)}</title>${rect(0, 0, BRASIL_CARD_WIDTH, H, colors.paper)}<rect x="5" y="5" width="${BRASIL_CARD_WIDTH - 10}" height="${H - 10}" fill="none" stroke="${colors.ink}" stroke-width="10"/>${out.join('')}</svg>`
  return { svg, height: H }
}
