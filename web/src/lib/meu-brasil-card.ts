/**
 * The Meu Brasil card's picture (#27), PURE like the other cards: `meuBrasilCardSvg(cards, options)` returns an SVG string 1080 wide
 * (the height follows the number of places). The headline on top (the picture's text alternative too), then per place its name and
 * the three cycles side by side: the year, the valid votes split between the two candidates (the lower ballot number dark, as on
 * the three-cycle screen), and under it a beige bar for the share of the electorate that did not vote with its number. A cycle
 * without data says "sem dados". The legend, the short address and the source close the card. All words come from the catalog.
 */
import { colors } from '@/shared/tokens'
import type { PlaceCard } from './meu-brasil'
import { esc, fit, rect, text, textWidth, wrap } from './share-card'
import { DEFAULT_LOCALE, message, type Locale, type Register } from './sentences/catalog'
import { meuBrasilHeadline } from './sentences/meu-brasil'
import type { MessageKey } from './sentences/catalog'

export const MEU_BRASIL_CARD_WIDTH = 1080
const LEFT = 98
const INNER = 884
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

const FILL = { a: colors['cand-a'], b: colors['cand-b'], outros: colors['cand-outros'] } as const

export function meuBrasilCardSvg(cards: readonly PlaceCard[], o: MeuBrasilCardOptions): { svg: string; height: number } {
  const voice = { locale: o.locale ?? DEFAULT_LOCALE, register: o.register ?? 'standard' }
  const say = (key: MessageKey, params: Record<string, string | number> = {}) => message(voice, key, params)
  const headline = meuBrasilHeadline(cards, voice)
  const out: string[] = []
  let y = 69
  if (o.fixture) {
    out.push(rect(LEFT, y, 285, 78, colors.flag, ' rx="10"'), text(LEFT + 142, y + 53, 44, say('card.example'), { weight: 700, anchor: 'middle' }))
    y += 78 + 36
  }
  const size = [48, 44, 40, 36].find((sz) => wrap(headline, sz, INNER, 4)) ?? 36
  const lines = wrap(headline, size, INNER, 4) ?? [fit(headline, size, INNER)]
  y += size
  for (const line of lines) (out.push(text(LEFT, y, size, line, { serif: true })), (y += size * 1.3))
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
          out.push(rect(sx, y + 44, w, 56, FILL[s.tone ?? s.key]))
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
  const legend = say('mb.legend')
  for (const line of wrap(legend, 30, INNER, 3) ?? [fit(legend, 30, INNER)]) (out.push(text(LEFT, y, 30, line, { fill: colors.muted })), (y += 40))
  y += 26
  const addrSize = [44, 40, 36].find((sz) => textWidth(o.address, sz, true) <= INNER) ?? 36
  out.push(text(LEFT, y, addrSize, fit(o.address, addrSize, INNER, true), { weight: 600 }))
  y += 52
  const brand = say(o.fixture ? 'card.brand.fixture' : 'card.brand')
  out.push(text(LEFT, y, [36, 32, 28].find((sz) => textWidth(brand, sz) <= INNER) ?? 28, brand, { fill: colors.muted }))
  y += 70

  const H = Math.round(y)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MEU_BRASIL_CARD_WIDTH}" height="${H}" viewBox="0 0 ${MEU_BRASIL_CARD_WIDTH} ${H}" role="img"><title>${esc(o.alt ?? headline)}</title>${rect(0, 0, MEU_BRASIL_CARD_WIDTH, H, colors.paper)}<rect x="5" y="5" width="${MEU_BRASIL_CARD_WIDTH - 10}" height="${H - 10}" fill="none" stroke="${colors.ink}" stroke-width="10"/>${out.join('')}</svg>`
  return { svg, height: H }
}
