/**
 * The picture of "Ficaram em casa" (#32), PURE like the other cards: `stayHomeCardSvg(model, options)` returns an SVG string, 1080 wide. The title and
 * the cycle and round, the tile mosaic with the percentage printed on every state (the colour is never the only cue), the seven-step scale with its six
 * edges, the base of the numbers, the short address and the source. No candidate. The claim about cities stays on the page: the picture carries only what
 * the map shows. The words come from the catalog (`stayhome.*`); the colours are the screen's teal steps (`stay-home.ts`).
 */
import { colors } from '@/shared/tokens'
import { UF_TILES } from '@/slots/home/uf-grid'
import { fit, INNER, LEFT, rect, text, wrap } from './share-picture'
import { fixtureBand, flowCard, footerBlock, mutedLines } from './share-picture-flow'
import { DEFAULT_LOCALE, message, type Locale, type Register } from './sentences/catalog'
import { stayhomeSay, subtitle } from './sentences/stayhome'
import { stayHomeHex } from './stay-home'
import type { StayHomeModel } from './stay-home-view'

export const STAY_HOME_CARD_WIDTH = 1080
const TILE = 122
const PITCH = 125
const GRID_W = 7 * PITCH - (PITCH - TILE)

export interface StayHomeCardOptions {
  /** Short address without scheme: `votoavoto.exemplo.br/mapa/ficaram-em-casa`. */
  address: string
  fixture?: boolean
  locale?: Locale
  register?: Register
  /** Replaces the text alternative (`<title>`); the model's by default. */
  alt?: string
}

export interface StayHomeCard {
  svg: string
  height: number
}

export function stayHomeCardSvg(model: StayHomeModel, o: StayHomeCardOptions): StayHomeCard {
  const voice = { locale: o.locale ?? DEFAULT_LOCALE, register: o.register ?? ('standard' as const) }
  const out: string[] = []
  let y = fixtureBand(out, o.fixture, message(voice, 'card.example'), 69)
  const title = stayhomeSay(voice, 'stayhome.title')
  y += 64
  out.push(text(LEFT, y, 64, title, { serif: true }))
  const sub = subtitle(voice, model.ano, model.turno)
  const subLines = wrap(sub, 36, INNER, 3) ?? [fit(sub, 36, INNER)]
  y += 24
  for (const line of subLines) {
    y += 46
    out.push(text(LEFT, y, 36, line, { fill: colors.muted }))
  }
  y += 40

  const gridX = LEFT + (INNER - GRID_W) / 2
  const top = y
  for (const tile of UF_TILES) {
    const cell = model.cells[tile.uf]
    if (!cell) continue
    const x = gridX + (tile.col - 1) * PITCH
    const ty = top + (tile.row - 1) * PITCH
    const ink = cell.fg === 'var(--foreground)' ? colors.ink : colors.paper
    out.push(rect(x, ty, TILE, TILE, stayHomeHex(cell.bin), ` rx="8" stroke="${colors.rule}" stroke-width="2"`))
    out.push(text(x + TILE / 2, ty + 54, 36, tile.uf.toUpperCase(), { weight: 700, fill: ink, anchor: 'middle' }))
    out.push(text(x + TILE / 2, ty + 96, 32, cell.text, { fill: ink, anchor: 'middle' }))
  }
  y = top + 7 * PITCH + 24

  const n = model.legend.fills.length
  const sw = INNER / n
  model.legend.fills.forEach((_, i) => out.push(rect(LEFT + i * sw, y, sw, 40, stayHomeHex((i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7), ` stroke="${colors.rule}" stroke-width="1"`)))
  y += 40 + 34
  model.legend.edges.forEach((edge, i) => out.push(text(LEFT + (i + 1) * sw, y, 28, edge, { fill: colors.muted, anchor: 'middle' })))
  y += 40
  out.push(text(LEFT, y, 28, stayhomeSay(voice, 'stayhome.card.legend', { edges: model.legend.edges.join(', ') }), { fill: colors.muted }))
  y += 52

  y = mutedLines(out, stayhomeSay(voice, 'stayhome.card.base'), y, { size: 30, lines: 4, step: 40 }) + 24
  y = footerBlock(out, y, { address: o.address, brand: message(voice, o.fixture ? 'card.brand.fixture' : 'card.brand'), addressSizes: [44, 40, 36, 32] })
  return flowCard(STAY_HOME_CARD_WIDTH, y, o.alt ?? model.alt, out)
}
