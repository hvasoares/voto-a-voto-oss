/**
 * Everything the Meu Brasil sticker needs for one set of places, pure: the picture, the card's headline it prints, the card's address
 * it encodes, the text alternative and the file name. The headline and the address are the card's own (`meuBrasilContent`).
 */
import type { PlaceCard } from './meu-brasil'
import { meuBrasilContent, type MeuBrasilContentOptions } from './meu-brasil-content'
import { DEFAULT_LOCALE, message } from './sentences/catalog'
import './sentences/catalog-meu-brasil'
import { stickerSvg } from './sticker-card'

export interface StickerContent {
  svg: string
  /** The card's headline, as printed. */
  headline: string
  alt: string
  /** What the QR encodes: the card's address with its places. */
  url: string
  address: string
  filename: string
}

export function stickerContent(cards: readonly PlaceCard[], o: MeuBrasilContentOptions): StickerContent {
  const locale = o.locale ?? DEFAULT_LOCALE
  const card = meuBrasilContent(cards, o)
  const headline = card.variants.standard.alt
  const alt = message({ locale, register: 'standard' }, 'mb.sticker.alt', { headline, address: card.address })
  return { svg: stickerSvg({ headline, url: card.url, address: card.address, fixture: o.fixture, locale, alt }), headline, alt, url: card.url, address: card.address, filename: 'voto-a-voto-meu-brasil-adesivo.png' }
}
