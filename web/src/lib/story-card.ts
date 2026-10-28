/**
 * The picture of one story card (#47, #97), PURE like the other cards: `storyCardSvg(card, options)` returns an SVG string, 1080x1920 (a vertical card). One number, drawn in the serif at the
 * biggest size that fits, one sentence under it (the largest size that holds it in eight lines), the small line on top, the source, and the address of the card's position in its sequence
 * (`votoavoto.exemplo.br/sp/historia#2`). The words come ready from the catalog; nothing here says anything.
 */
import { colors } from '@/shared/tokens'
import { esc, fit, rect, text, wrap } from './share-card'
import { DEFAULT_LOCALE, message, type Locale } from './sentences/catalog'

export const STORY_CARD_SIZE = { width: 1080, height: 1920 } as const
const LEFT = 98
const INNER = 884

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
  const out: string[] = [rect(0, 0, STORY_CARD_SIZE.width, STORY_CARD_SIZE.height, colors.paper), `<rect x="5" y="5" width="${STORY_CARD_SIZE.width - 10}" height="${STORY_CARD_SIZE.height - 10}" fill="none" stroke="${colors.ink}" stroke-width="10"/>`]
  let x = LEFT
  if (o.fixture) {
    out.push(rect(LEFT, 90, 285, 78, colors.flag, ' rx="10"'), text(LEFT + 142, 143, 44, say('card.example'), { weight: 700, anchor: 'middle' }))
    x = 422
  }
  out.push(text(x, 143, 44, fit(o.kicker, 44, INNER - (x - LEFT)), { weight: 600, fill: colors.muted }))
  // The number: the serif, the biggest size at which it is one line.
  const bigSize = [400, 340, 280, 230, 190, 150].find((sz) => wrap(o.big, sz, INNER, 1)) ?? 150
  out.push(text(LEFT, 560 + bigSize * 0.3, bigSize, fit(o.big, bigSize, INNER), { serif: true, fill: colors.accent }))
  // The sentence: the biggest size that holds it in eight lines.
  const size = [68, 62, 56, 52, 48].find((sz) => wrap(o.sentence, sz, INNER, 8)) ?? 48
  const lines = wrap(o.sentence, size, INNER, 8) ?? [fit(o.sentence, size, INNER)]
  const top = 560 + bigSize * 0.3 + 120
  lines.forEach((line, i) => out.push(text(LEFT, top + i * size * 1.3, size, line)))
  out.push(rect(LEFT, 1640, INNER, 4, colors.rule))
  out.push(text(LEFT, 1720, 42, fit(say(o.fixture ? 'card.brand.fixture' : 'card.brand'), 42, INNER), { fill: colors.muted }))
  out.push(text(LEFT, 1790, 46, fit(o.address, 46, INNER), { weight: 600 }))
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${STORY_CARD_SIZE.width}" height="${STORY_CARD_SIZE.height}" viewBox="0 0 ${STORY_CARD_SIZE.width} ${STORY_CARD_SIZE.height}" role="img"><title>${esc(o.alt)}</title>${out.join('')}</svg>`
}
