/**
 * The head-to-head card's picture (#30), PURE like the other cards: `duelCardSvg(...)` returns an SVG string 1080 wide. The title and the
 * two places on top, then one row per measure: its name over the two values, the higher value in the accent colour with a bar under it (a
 * mark of "higher number", never colour alone), then the note on the signed measure, the legend of the mark, the short address and the
 * source. All words come from the catalog (`duel.*`); the picture's text alternative is the generated sentence.
 */
import { colors } from '@/shared/tokens'
import type { DuelPlace, Measure } from './duel-model'
import { esc, fit, rect, text, textWidth, wrap } from './share-card'
import { DEFAULT_LOCALE, type Locale, type Register } from './sentences/catalog'
import { duelSay, measureLabel } from './sentences/duel'

export const DUEL_CARD_WIDTH = 1080
const LEFT = 98
const INNER = 884
const GUTTER = 30
const COL = (INNER - GUTTER) / 2
const ROW = 150

export interface DuelCardOptions {
  /** Short address, without scheme and query: `votoavoto.exemplo.br/cara-a-cara`. */
  address: string
  alt: string
  /** The subtitle under the title ("Duas cidades lado a lado, 2º turno de 2026."). */
  subtitle: string
  /** The measure-specific note ("Virada: ..."), drawn under the rows when present. */
  note?: string
  ano: number
  prev: number
  /** "Cidade", "Estado" or "Região" (the small label over each name, with its letter). */
  kind: string
  fixture?: boolean
  locale?: Locale
  register?: Register
}

export function duelCardSvg(a: DuelPlace, b: DuelPlace, measures: readonly Measure[], o: DuelCardOptions): { svg: string; height: number } {
  const voice = { locale: o.locale ?? DEFAULT_LOCALE, register: o.register ?? 'standard' as Register }
  const out: string[] = []
  let y = 69
  if (o.fixture) {
    out.push(rect(LEFT, y, 285, 78, colors.flag, ' rx="10"'), text(LEFT + 142, y + 53, 44, duelSay(voice, 'card.example'), { weight: 700, anchor: 'middle' }))
    y += 78 + 30
  }
  y += 64
  out.push(text(LEFT, y, 72, duelSay(voice, 'duel.title'), { serif: true }))
  y += 46
  out.push(text(LEFT, y, 30, fit(o.subtitle, 30, INNER), { fill: colors.muted }))
  y += 36

  ;[a, b].forEach((place, i) => {
    const x = LEFT + i * (COL + GUTTER)
    out.push(rect(x, y, COL, 130, colors.paper, ` rx="8" stroke="${colors.accent}" stroke-width="3"`))
    out.push(text(x + 24, y + 40, 24, duelSay(voice, 'duel.slot', { kind: o.kind, letter: i === 0 ? 'A' : 'B' }).toUpperCase(), { fill: colors.muted }))
    out.push(text(x + 24, y + 98, 44, fit(place.label, 44, COL - 48, true), { weight: 700 }))
  })
  y += 130 + 26

  for (const m of measures) {
    out.push(rect(LEFT, y, INNER, ROW - 16, colors.paper, ` rx="8" stroke="${colors.rule}" stroke-width="2"`))
    const label = measureLabel(voice, m.key, o).toUpperCase()
    out.push(text(LEFT + INNER / 2, y + 36, 24, fit(label, 24, INNER - 40), { fill: colors.muted, anchor: 'middle' }))
    ;(['a', 'b'] as const).forEach((side, i) => {
      const figure = m[side]
      const cx = LEFT + i * (COL + GUTTER) + COL / 2
      const high = m.higher === side
      out.push(text(cx, y + 108, 76, figure.text, { serif: true, anchor: 'middle', fill: high ? colors.accent : colors.ink }))
      if (high) {
        const w = Math.min(COL - 40, textWidth(figure.text, 76) * 0.9)
        out.push(rect(cx - w / 2, y + 120, w, 6, colors.accent))
      }
    })
    y += ROW
  }

  y += 4
  if (o.note) {
    for (const line of wrap(o.note, 26, INNER, 3) ?? [fit(o.note, 26, INNER)]) (out.push(text(LEFT, y + 20, 26, line, { fill: colors.muted })), (y += 34))
    y += 10
  }
  out.push(rect(LEFT, y, INNER, 3, colors.rule))
  y += 46
  out.push(text(LEFT, y, 28, duelSay(voice, 'duel.mark.legend'), { fill: colors.muted }))
  y += 56
  out.push(text(LEFT, y, 40, fit(o.address, 40, INNER, true), { weight: 600 }))
  y += 50
  const brand = duelSay(voice, o.fixture ? 'card.brand.fixture' : 'card.brand')
  out.push(text(LEFT, y, [36, 32, 28].find((sz) => textWidth(brand, sz) <= INNER) ?? 28, brand, { fill: colors.muted }))
  y += 70

  const H = Math.round(y)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${DUEL_CARD_WIDTH}" height="${H}" viewBox="0 0 ${DUEL_CARD_WIDTH} ${H}" role="img"><title>${esc(o.alt)}</title>${rect(0, 0, DUEL_CARD_WIDTH, H, colors.paper)}<rect x="5" y="5" width="${DUEL_CARD_WIDTH - 10}" height="${H - 10}" fill="none" stroke="${colors.ink}" stroke-width="10"/>${out.join('')}</svg>`
  return { svg, height: H }
}
