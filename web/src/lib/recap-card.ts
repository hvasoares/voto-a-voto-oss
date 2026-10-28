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
import { candidateLabel, esc, fit, labelText, rect, text, textWidth, wrap } from './share-card'
import { DEFAULT_LOCALE, message, type Locale, type Register } from './sentences/catalog'
import { recapBase, recapChange, recapHeadline } from './sentences/recap'

export const RECAP_CARD_WIDTH = 1080
const LEFT = 98
const INNER = 884
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
  let y = 69
  if (o.fixture) {
    out.push(rect(LEFT, y, 285, 78, colors.flag, ' rx="10"'), text(LEFT + 142, y + 53, 44, message(voice, 'card.example'), { weight: 700, anchor: 'middle' }))
    y += 78 + 36
  }
  // The headline, serif, at the largest size that holds it in five lines.
  const size = [52, 48, 44, 40, 36].find((sz) => wrap(headline, sz, INNER, 5)) ?? 36
  const lines = wrap(headline, size, INNER, 5) ?? [fit(headline, size, INNER)]
  y += size
  for (const line of lines) (out.push(text(LEFT, y, size, line, { serif: true })), (y += size * 1.3))
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
        const t = candidateLabel(s.label, `${s.pct}%`, undefined, w - 20, 40)
        if (t) out.push(labelText(x + w / 2, y + BAR_H / 2, t.size, t.text, { weight: 600, fill: colors['accent-fg'], anchor: 'middle' }))
      }
    } else out.push(rect(LEFT, y, INNER, BAR_H, colors['paper-2']))
    y += BAR_H + 50
  }

  out.push(rect(LEFT, y - 14, INNER, 3, colors.rule))
  const baseLines = wrap(recapBase(place), 32, INNER, 3) ?? [fit(recapBase(place), 32, INNER)]
  y += 30
  for (const line of baseLines) (out.push(text(LEFT, y, 32, line, { fill: colors.muted })), (y += 42))
  y += 28
  const addrSize = [44, 40, 36].find((sz) => textWidth(o.address, sz, true) <= INNER) ?? 36
  out.push(text(LEFT, y, addrSize, fit(o.address, addrSize, INNER, true), { weight: 600 }))
  y += 52
  const brand = message(voice, o.fixture ? 'card.brand.fixture' : 'card.brand')
  out.push(text(LEFT, y, [36, 32, 28].find((sz) => textWidth(brand, sz) <= INNER) ?? 28, brand, { fill: colors.muted }))
  y += 70

  const H = Math.round(y)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RECAP_CARD_WIDTH}" height="${H}" viewBox="0 0 ${RECAP_CARD_WIDTH} ${H}" role="img"><title>${esc(o.alt ?? headline)}</title>${rect(0, 0, RECAP_CARD_WIDTH, H, colors.paper)}<rect x="5" y="5" width="${RECAP_CARD_WIDTH - 10}" height="${H - 10}" fill="none" stroke="${colors.ink}" stroke-width="10"/>${out.join('')}</svg>`
  return { svg, height: H }
}

