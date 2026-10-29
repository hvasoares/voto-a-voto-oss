/**
 * The Meu Brasil card's picture (#27), PURE like the other cards: `meuBrasilCardSvg(cards, options)` returns an SVG string 1080 wide
 * (the height follows the number of places). The headline on top (the picture's text alternative too), then per place its name and
 * the three cycles side by side: the year, the valid votes split between the two candidates (the lower ballot number dark, as on
 * the three-cycle screen), and under it a beige bar for the share of the electorate that did not vote with its number. A cycle
 * without data says "sem dados". The legend, the short address and the source close the card. All words come from the catalog.
 */
import { colors } from '@/shared/tokens'
import type { PlaceCard } from './meu-brasil'
import { fit, fixtureBand, flowCard, footerBlock, headlineBlock, INNER, LEFT, mutedLines, rect, SEGMENT_FILL, text } from './share-picture'
import { DEFAULT_LOCALE, message, type Locale, type Register } from './sentences/catalog'
import { meuBrasilHeadline } from './sentences/meu-brasil'
import './sentences/catalog-meu-brasil'
import type { MessageKey } from './sentences/catalog'

export const MEU_BRASIL_CARD_WIDTH = 1080
const COL_GAP = 30
const COL = (INNER - 2 * COL_GAP) / 3

export interface MeuBrasilCardOptions {
  /** Short address, without scheme and query: `votoavoto.exemplo.br/meu-brasil`. */
  address: string
  fixture?: boolean
  locale?: Locale
  register?: Register
  /** Replaces the text alternative; the headline by default. */
  alt?: string
}

export function meuBrasilCardSvg(cards: readonly PlaceCard[], o: MeuBrasilCardOptions): { svg: string; height: number } {
  const voice = { locale: o.locale ?? DEFAULT_LOCALE, register: o.register ?? 'standard' }
  const say = (key: MessageKey, params: Record<string, string | number> = {}) => message(voice, key, params)
  const headline = meuBrasilHeadline(cards, voice)
  const out: string[] = []
  let y = headlineBlock(out, headline, fixtureBand(out, o.fixture, say('card.example'), 69), { sizes: [48, 44, 40, 36], lines: 4 })
  y += 26

  for (const card of cards) {
    out.push(text(LEFT, y + 40, 46, fit(`${card.name} · ${card.ufLabel}`, 46, INNER, true), { weight: 700 }))
    y += 64
    card.cycles.forEach((b, i) => {
      const x = LEFT + i * (COL + COL_GAP)
      out.push(text(x, y + 30, 32, String(b.ano), { fill: colors.muted }))
      if (b.status === 'data' && b.validos > 0) {
        let sx = x
        for (const s of b.sides.filter((s) => s.pct > 0)) {
          const w = (s.pct / 100) * COL
          out.push(rect(sx, y + 44, w, 56, SEGMENT_FILL[s.tone ?? s.key]))
          sx += w
        }
      } else out.push(rect(x, y + 44, COL, 56, colors['paper-2']))
      if (b.status === 'data') {
        out.push(rect(x, y + 114, Math.max(4, (b.notVotedPct / 100) * COL), 30, colors.abstencao))
        out.push(text(x, y + 182, 30, fit(say('mb.notVoted', { pct: b.notVotedPct }), 30, COL), { fill: colors.muted }))
      } else out.push(text(x, y + 182, 30, say('recap.rowNoData'), { fill: colors.muted }))
    })
    y += 226
  }

  out.push(rect(LEFT, y - 12, INNER, 3, colors.rule))
  y += 30
  y = mutedLines(out, say('mb.legend'), y, { size: 30, lines: 3, step: 40 }) + 26
  y = footerBlock(out, y, { address: o.address, brand: say(o.fixture ? 'card.brand.fixture' : 'card.brand') })
  return flowCard(MEU_BRASIL_CARD_WIDTH, y, o.alt ?? headline, out)
}
