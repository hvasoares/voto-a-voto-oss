/**
 * The head-to-head card's picture (#30), PURE like the other cards: `duelCardSvg(...)` returns an SVG string 1080 wide. The title and the
 * two places on top, then one row per measure: its name over the two values, the higher value in the accent colour with a bar under it (a
 * mark of "higher number", never colour alone), then the note on the signed measure, the legend of the mark, the short address and the
 * source. All words come from the catalog (`duel.*`); the picture's text alternative is the generated sentence.
 */
import { colors } from '@/shared/tokens'
import type { DuelPlace, Measure } from './duel-model'
import { fit, INNER, LEFT, rect, text, textWidth } from './share-picture'
import { fixtureBand, flowCard, footerBlock, mutedLines } from './share-picture-flow'
import { DEFAULT_LOCALE, type Locale, type Register } from './sentences/catalog'
import { duelSay, measureLabel } from './sentences/duel'

export const DUEL_CARD_WIDTH = 1080
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
  let y = fixtureBand(out, o.fixture, duelSay(voice, 'card.example'), 69, 30)
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
    y = mutedLines(out, o.note, y, { size: 26, lines: 3, step: 34, dy: 20 }) + 10
  }
  out.push(rect(LEFT, y, INNER, 3, colors.rule))
  y += 46
  out.push(text(LEFT, y, 28, duelSay(voice, 'duel.mark.legend'), { fill: colors.muted }))
  y += 56
  y = footerBlock(out, y, { address: o.address, brand: duelSay(voice, o.fixture ? 'card.brand.fixture' : 'card.brand'), addressSizes: [40], addressStep: 50 })
  return flowCard(DUEL_CARD_WIDTH, y, o.alt, out)
}
