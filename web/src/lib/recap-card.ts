/**
 * The state recap's picture (#28), PURE like the other cards: `recapCardSvg(recap, options)` returns an SVG string, 1080 wide.
 * Three rows (2018, 2022, 2026): the year, the change in points against the previous cycle (or "Ponto de partida da série"),
 * one bar split between the two runoff candidates with their name and share inside, as on the three-cycle screen. Under them the
 * base of the percentages, the short address and the source. A cycle without data says "sem dados" and draws no bar (never zeros).
 * The words come from the catalog (`recapHeadline`, `recapChange`, `recapBase`); the colours are the screens' side colours by
 * position (left, rival), the same for every candidate.
 */
import { colors } from '@/shared/tokens'
import type { Recap } from './recap'
import { candidateLabel, centredLabel, fit, INNER, LEFT, rect, text } from './share-picture'
import { fixtureBand, flowCard, footerBlock, headlineBlock, mutedLines } from './share-picture-flow'
import { DEFAULT_LOCALE, message, type Locale, type Register } from './sentences/catalog'
import { recapBase, recapChange, recapHeadline } from './sentences/recap'

export const RECAP_CARD_WIDTH = 1080
const BAR_H = 100

export interface RecapCardOptions {
  stateName: string
  /** Short address without scheme: `votoavoto.exemplo.br/sp/resumo`. */
  address: string
  fixture?: boolean
  locale?: Locale
  register?: Register
  /** Replaces the text alternative (`<title>`); the headline by default. */
  alt?: string
}

export interface RecapCard {
  svg: string
  height: number
}

export function recapCardSvg(recap: Recap, o: RecapCardOptions): RecapCard {
  const place = { stateName: o.stateName, locale: o.locale, register: o.register }
  const voice = { locale: o.locale ?? DEFAULT_LOCALE, register: 'standard' as const }
  const headline = recapHeadline(recap, place)
  const out: string[] = []
  // The headline, serif, at the largest size that holds it in five lines.
  let y = headlineBlock(out, headline, fixtureBand(out, o.fixture, message(voice, 'card.example'), 69), { sizes: [52, 48, 44, 40, 36], lines: 5 })
  y += 14

  for (const row of recap.rows) {
    out.push(text(LEFT, y + 38, 46, String(row.ano), { weight: 700 }))
    const change = recapChange(row, place)
    out.push(text(LEFT + 150, y + 38, 38, fit(change, 38, INNER - 150), { fill: row.status === 'data' && row.changePp !== undefined ? colors.accent : colors.muted }))
    y += 58
    if (row.status === 'data' && row.left && row.rival) {
      const wl = (row.left.tenths / 1000) * INNER
      const wr = INNER - wl
      out.push(rect(LEFT, y, wl, BAR_H, colors.lula), rect(LEFT + wl, y, wr, BAR_H, colors.bolsonaro))
      for (const [s, x, w] of [[row.left, LEFT, wl], [row.rival, LEFT + wl, wr]] as const) {
        out.push(centredLabel(x, w, y, BAR_H, candidateLabel(s.label, `${s.pct}%`, undefined, w - 20, 40), { weight: 600, fill: colors['accent-fg'] }))
      }
    } else out.push(rect(LEFT, y, INNER, BAR_H, colors['paper-2']))
    y += BAR_H + 50
  }

  out.push(rect(LEFT, y - 14, INNER, 3, colors.rule))
  y = mutedLines(out, recapBase(place), y + 30, { size: 32, lines: 3, step: 42 }) + 28
  y = footerBlock(out, y, { address: o.address, brand: message(voice, o.fixture ? 'card.brand.fixture' : 'card.brand') })
  return flowCard(RECAP_CARD_WIDTH, y, o.alt ?? headline, out)
}

