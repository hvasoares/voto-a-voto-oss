/**
 * The picture of one story card (#47, #97), PURE like the other cards: `storyCardSvg(card, options)` returns an SVG string, 1080x1920 (a vertical card). One number, drawn in the serif at the
 * biggest size that fits, one sentence under it (the largest size that holds it in eight lines), the small line on top, the source, and the address of the card's position in its sequence
 * (`votoavoto.exemplo.br/sp/historia#2`). The words come ready from the catalog; nothing here says anything.
 */
import { colors } from '@/shared/tokens'
import { cardSvg, exampleTag, fit, fitLines, INNER, LEFT, rect, text, textWidth } from './share-picture'
import { DEFAULT_LOCALE, message, type Locale } from './sentences/catalog'

export const STORY_CARD_SIZE = { width: 1080, height: 1920 } as const

export interface StoryCardOptions {
  /** The small line on top: "SP · 2022 → 2026". */
  kicker: string
  /** The number. */
  big: string
  /** The sentence under it. */
  sentence: string
  /** The address of this card, without scheme. */
  address: string
  /** The text alternative (`<title>`). */
  alt: string
  fixture?: boolean
  locale?: Locale
}

export function storyCardSvg(o: StoryCardOptions): string {
  const say = (key: 'card.example' | 'card.brand' | 'card.brand.fixture') => message({ locale: o.locale ?? DEFAULT_LOCALE, register: 'standard' }, key)
  const out: string[] = []
  let x = LEFT
  if (o.fixture) {
    out.push(exampleTag(LEFT, 90, say('card.example')))
    x = 422
  }
  out.push(text(x, 143, 44, fit(o.kicker, 44, INNER - (x - LEFT)), { weight: 600, fill: colors.muted }))
  // The number: the serif, the biggest size at which it is one line.
  const bigSize = fitLines(o.big, [400, 340, 280, 230, 190, 150], INNER, 1).size
  out.push(text(LEFT, 560 + bigSize * 0.3, bigSize, fit(o.big, bigSize, INNER), { serif: true, fill: colors.accent }))
  // The sentence: the biggest size that holds it in eight lines.
  const { size, lines } = fitLines(o.sentence, [68, 62, 56, 52, 48], INNER, 8)
  const top = 560 + bigSize * 0.3 + 120
  lines.forEach((line, i) => out.push(text(LEFT, top + i * size * 1.3, size, line)))
  out.push(rect(LEFT, 1640, INNER, 4, colors.rule))
  out.push(text(LEFT, 1720, 42, fit(say(o.fixture ? 'card.brand.fixture' : 'card.brand'), 42, INNER), { fill: colors.muted }))
  // The address must stay readable and complete: the biggest size that fits one line, else two lines broken after a "/" (never cut with "…" unless nothing else fits).
  const size46 = [46, 42, 38].find((sz) => textWidth(o.address, sz) <= INNER)
  if (size46) out.push(text(LEFT, 1790, size46, o.address, { weight: 600 }))
  else {
    let cut = 0
    for (let i = 1; i < o.address.length; i++) if (o.address[i - 1] === '/' && textWidth(o.address.slice(0, i), 38) <= INNER) cut = i
    const lines = cut ? [o.address.slice(0, cut), o.address.slice(cut)] : [o.address]
    lines.forEach((line, i) => out.push(text(LEFT, 1778 + i * 46, 38, fit(line, 38, INNER), { weight: 600 })))
  }
  return cardSvg({ ...STORY_CARD_SIZE, title: o.alt, parts: out })
}
