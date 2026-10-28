/**
 * Everything the share of "Ficaram em casa" (#32) needs for ONE cycle and round, pure: the picture, the text alternative and the share text in both
 * registers, the page address, the file name. Pre-rendered at build time by the page; the share island only sends it.
 */
import { stayHomeCardSvg } from './stay-home-card'
import type { StayHomeRow, StayHomeView } from './stay-home'
import type { StayHomeModel } from './stay-home-view'
import { DEFAULT_LOCALE, REGISTERS, type Locale, type Register } from './sentences/catalog'
import { stayhomeAlt, stayhomeShareText } from './sentences/stayhome'
import { shortAddress } from './share-text'

export interface StayHomeContent {
  svg: string
  height: number
  variants: Record<Register, { alt: string; text: string }>
  url: string
  address: string
  filename: string
}

export interface StayHomeContentOptions {
  origin: string
  base: string
  fixture: boolean
  /** The view the plain address shows. */
  defaultView: StayHomeView
  locale?: Locale
}

/** `https://votoavoto.exemplo.br/mapa/ficaram-em-casa/` for the plain view, `.../2022-2/` for the others. */
export function stayHomeUrl(origin: string, base: string, view: StayHomeView, defaultView: StayHomeView): string {
  const b = base.endsWith('/') ? base : `${base}/`
  const same = view.ano === defaultView.ano && view.turno === defaultView.turno
  return `${origin}${b.startsWith('/') ? b : `/${b}`}mapa/ficaram-em-casa/${same ? '' : `${view.ano}-${view.turno}/`}`
}

export function stayHomeContent(model: StayHomeModel, rows: readonly StayHomeRow[], o: StayHomeContentOptions): StayHomeContent {
  const locale = o.locale ?? DEFAULT_LOCALE
  const view = { ano: model.ano, turno: model.turno }
  const url = stayHomeUrl(o.origin, o.base, view, o.defaultView)
  const address = shortAddress(url)
  const variants = Object.fromEntries(
    REGISTERS.map((register) => {
      const text = `${stayhomeShareText({ locale, register }, model.ano, model.turno)} ${url}`
      return [register, { alt: register === 'standard' ? model.alt : stayhomeAlt(rows, model.ano, model.turno, { locale, register }), text }]
    }),
  ) as StayHomeContent['variants']
  const drawn = stayHomeCardSvg(model, { address, fixture: o.fixture, locale, alt: variants.standard.alt })
  return { svg: drawn.svg, height: drawn.height, variants, url, address, filename: `voto-a-voto-ficaram-em-casa-${model.ano}-${model.turno}.png` }
}

