/**
 * The picture of "Ficaram em casa" (#32), PURE like the other cards: `stayHomeCardSvg(model, options)` returns an SVG string, 1080 wide. The title and
 * the cycle and round, the tile mosaic with the percentage printed on every state (the colour is never the only cue), the seven-step scale with its six
 * edges, the base of the numbers, the short address and the source. No candidate. The claim about cities stays on the page: the picture carries only what
 * the map shows. The words come from the catalog (`stayhome.*`); the colours are the screen's teal steps (`stay-home.ts`).
 */
import { colors } from '@/shared/tokens'
import { UF_TILES } from '@/slots/home/uf-grid'
import { esc, fit, rect, text, textWidth, wrap } from './share-card'
import { DEFAULT_LOCALE, message, type Locale, type Register } from './sentences/catalog'
import { stayhomeSay, subtitle } from './sentences/stayhome'
import { stayHomeHex } from './stay-home'
import type { StayHomeModel } from './stay-home-view'

export const STAY_HOME_CARD_WIDTH = 1080
const LEFT = 98
const INNER = 884
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
  let y = 69
  if (o.fixture) {
    out.push(rect(LEFT, y, 285, 78, colors.flag, ' rx="10"'), text(LEFT + 142, y + 53, 44, message(voice, 'card.example'), { weight: 700, anchor: 'middle' }))
    y += 78 + 36
  }
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

  const base = stayhomeSay(voice, 'stayhome.card.base')
  const baseLines = wrap(base, 30, INNER, 4) ?? [fit(base, 30, INNER)]
  for (const line of baseLines) {
    out.push(text(LEFT, y, 30, line, { fill: colors.muted }))
    y += 40
  }
  y += 24
  const addrSize = [44, 40, 36, 32].find((sz) => textWidth(o.address, sz, true) <= INNER) ?? 32
  out.push(text(LEFT, y, addrSize, fit(o.address, addrSize, INNER, true), { weight: 600 }))
  y += 52
  const brand = message(voice, o.fixture ? 'card.brand.fixture' : 'card.brand')
  out.push(text(LEFT, y, [36, 32, 28].find((sz) => textWidth(brand, sz) <= INNER) ?? 28, brand, { fill: colors.muted }))
  y += 70

  const H = Math.round(y)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STAY_HOME_CARD_WIDTH}" height="${H}" viewBox="0 0 ${STAY_HOME_CARD_WIDTH} ${H}" role="img"><title>${esc(o.alt ?? model.alt)}</title>${rect(0, 0, STAY_HOME_CARD_WIDTH, H, colors.paper)}<rect x="5" y="5" width="${STAY_HOME_CARD_WIDTH - 10}" height="${H - 10}" fill="none" stroke="${colors.ink}" stroke-width="10"/>${out.join('')}</svg>`
  return { svg, height: H }
}
