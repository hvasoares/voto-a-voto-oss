/**
 * The Meu Brasil sticker's picture (#37), PURE: `stickerSvg(sticker, options)` returns an SVG string 1080x1920 (the story size; the
 * same ratio prints as a poster) with a TRANSPARENT background, so the PNG is a sticker for a chat or a story. A paper card with a thick
 * ink border carries the tag, the one-line headline of the card (the very sentence of `meuBrasilHeadline`), a QR code to the card and the
 * short address. High contrast on purpose: ink on paper for every word (ratio above 15:1) and ink on white for the QR with the ISO quiet
 * zone, so it stays readable shrunk to a story. The QR is the card's own address, drawn as one path from `qrGlyph`.
 */
import { colors } from '@/shared/tokens'
import { glyphPath, qrGlyph, QR_QUIET_ZONE } from './qr-code'
import { exampleTag, fit, headlineBlock, largestFit, pictureSvg, rect, text, textWidth } from './share-picture'
import './sentences/catalog-meu-brasil'
import { DEFAULT_LOCALE, message, type Locale, type MessageKey } from './sentences/catalog'

export const STICKER_SIZE = { width: 1080, height: 1920 } as const
/** The side of the QR, quiet zone included, in px. */
export const STICKER_QR_SIDE = 600

export interface StickerOptions {
  /** The card's headline sentence: the sticker's text (and, with the address, its text alternative). */
  headline: string
  /** The card's full address, places included: what the QR encodes. */
  url: string
  /** Short address printed under the QR. */
  address: string
  fixture?: boolean
  locale?: Locale
  /** The sticker's text alternative (`<title>`). */
  alt: string
}

const LEFT = 130
const INNER = 820

export function stickerSvg(o: StickerOptions): string {
  const say = (key: MessageKey, params: Record<string, string | number> = {}) => message({ locale: o.locale ?? DEFAULT_LOCALE, register: 'standard' }, key, params)
  const { width: W, height: H } = STICKER_SIZE
  const card = `<rect x="60" y="100" width="${W - 120}" height="${H - 200}" rx="80" fill="${colors.paper}" stroke="${colors.ink}" stroke-width="16"/>`
  const out: string[] = []
  let y = 220
  const tag = say('mb.tag')
  const tagW = Math.ceil(textWidth(tag, 44, true)) + 60
  out.push(rect(LEFT, y, tagW, 84, colors.accent, ' rx="12"'), text(LEFT + tagW / 2, y + 57, 44, tag, { weight: 700, fill: colors['accent-fg'], anchor: 'middle' }))
  if (o.fixture) out.push(exampleTag(LEFT + tagW + 24, y, say('card.example'), true))
  y += 84 + 70

  y = headlineBlock(out, o.headline, y, { sizes: [56, 52, 48, 44, 40], lines: 7, left: LEFT, inner: INNER })

  // The QR, centred, ink on white with its quiet zone.
  const glyph = qrGlyph(o.url)
  const modules = glyph.size + QR_QUIET_ZONE * 2
  const scale = STICKER_QR_SIDE / modules
  const qx = (W - STICKER_QR_SIDE) / 2
  const qy = y + 50
  out.push(
    `<rect x="${qx}" y="${qy}" width="${STICKER_QR_SIDE}" height="${STICKER_QR_SIDE}" rx="24" fill="#ffffff" stroke="${colors.ink}" stroke-width="6"/>`,
    `<path transform="translate(${qx + QR_QUIET_ZONE * scale} ${qy + QR_QUIET_ZONE * scale}) scale(${scale})" d="${glyphPath(glyph)}" fill="${colors.ink}" shape-rendering="crispEdges"/>`,
  )
  y = qy + STICKER_QR_SIDE + 70
  out.push(text(W / 2, y, 40, fit(say('mb.sticker.scan'), 40, INNER), { fill: colors.ink, anchor: 'middle' }))
  y += 64
  const addrSize = largestFit(o.address, [44, 40, 36], INNER, true)
  out.push(text(W / 2, y, addrSize, fit(o.address, addrSize, INNER, true), { weight: 700, anchor: 'middle' }))
  y += 56
  const brand = say(o.fixture ? 'card.brand.fixture' : 'card.brand')
  out.push(text(W / 2, y, largestFit(brand, [34, 30, 26], INNER), brand, { fill: colors.ink, anchor: 'middle' }))

  // Centre the content in the card: what is left above (the tag's 120 px from the top) is left below.
  const shift = Math.max(0, Math.round((H - 120 - 60 - y - 120) / 2))
  return pictureSvg({ width: W, height: H, title: o.alt, body: `${card}<g transform="translate(0 ${shift})">${out.join('')}</g>` })
}
