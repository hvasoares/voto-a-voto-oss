/**
 * The live overlay (#68), PURE: the configuration (place, measure, cycle, round, size, background), its address and the one number and sentence it shows.
 * The address carries the whole configuration (`?c=rj/cidade&m=nv&a=2026&t=2&s=600x200&f=transparente`) so it reproduces the chosen overlay anywhere. There is no
 * parameter that turns the source line off: whatever the address says, `parseOverlay` returns no such option and the overlay always prints the seal.
 */
import type { CityResult } from '@/shared/city-model'
import { marginVotes } from './sentences/margin'
import { DEFAULT_VOICE, message as say, type MessageKey } from './sentences/catalog'
import './sentences/catalog-overlay'
import { formatInteger, formatPoints } from './number-format'

export const MEASURES = ['nv', 'margem', 'comparecimento', 'resultado'] as const
export type OverlayMeasure = (typeof MEASURES)[number]
export const OVERLAY_CYCLES = [2018, 2022, 2026] as const
export const OVERLAY_SIZES = ['1920x1080', '1280x720', '600x200'] as const
export type OverlaySize = (typeof OVERLAY_SIZES)[number]
export const BACKGROUNDS = ['transparente', 'escuro', 'claro'] as const
export type OverlayBackground = (typeof BACKGROUNDS)[number]

export interface OverlayConfig {
  /** `rj/cidade-exemplo`; undefined when the address names no valid place. */
  city?: string
  measure: OverlayMeasure
  ano: number
  turno: 1 | 2
  size: OverlaySize
  background: OverlayBackground
}

export const DEFAULT_OVERLAY: OverlayConfig = { measure: 'nv', ano: 2026, turno: 2, size: '1920x1080', background: 'transparente' }

const CITY = /^[a-z]{2}\/[a-z0-9]+(?:-[a-z0-9]+)*$/
const pick = <T extends string | number>(list: readonly T[], value: string | null, fallback: T): T => list.find((x) => String(x) === value) ?? fallback

export function parseOverlay(search: string): OverlayConfig {
  const q = new URLSearchParams(search)
  const c = q.get('c') ?? ''
  return {
    city: CITY.test(c) ? c : undefined,
    measure: pick(MEASURES, q.get('m'), DEFAULT_OVERLAY.measure),
    ano: pick(OVERLAY_CYCLES, q.get('a'), DEFAULT_OVERLAY.ano),
    turno: pick([1, 2] as const, q.get('t'), DEFAULT_OVERLAY.turno),
    size: pick(OVERLAY_SIZES, q.get('s'), DEFAULT_OVERLAY.size),
    background: pick(BACKGROUNDS, q.get('f'), DEFAULT_OVERLAY.background),
  }
}

/** `?c=...&m=...&a=...&t=...&s=...&f=...`; '' without a place. Every value is written, so the address never depends on a default that may change. */
export function overlayQuery(c: OverlayConfig): string {
  if (!c.city) return ''
  return `?c=${c.city}&m=${c.measure}&a=${c.ano}&t=${c.turno}&s=${c.size}&f=${c.background}`
}

export const overlaySize = (s: OverlaySize): { width: number; height: number } => {
  const [width, height] = s.split('x').map(Number) as [number, number]
  return { width, height }
}

export interface OverlayFigure {
  /** The big number, as printed: `30%`, `2.800`. */
  big: string
  sentence: string
}

const t = (key: string, params: Record<string, string | number> = {}) => say(DEFAULT_VOICE, key as MessageKey, params)

/** The one number and sentence of the overlay for a result; `undefined` result says there is no data (never a zero). */
export function overlayFigure(result: CityResult | undefined, c: Pick<OverlayConfig, 'measure' | 'ano' | 'turno'>, cityName: string): OverlayFigure {
  const nodata = { big: '—', sentence: t('overlay.nodata', { city: cityName, turno: c.turno, ano: c.ano }) }
  if (!result || result.aptos <= 0) return nodata
  const slots = { city: cityName, turno: result.turno, ano: result.ano }
  const pct = (x: number) => formatPoints(Math.round(x * 10) / 10)
  if (c.measure === 'nv') return { big: pct(result.notVotedShare), sentence: t('overlay.s.nv', slots) }
  if (c.measure === 'comparecimento') return { big: pct((result.comparecimento / result.aptos) * 100), sentence: t('overlay.s.comparecimento', slots) }
  if (c.measure === 'margem') {
    const m = marginVotes(result)
    return m === undefined ? nodata : { big: formatInteger(m), sentence: t('overlay.s.margem', slots) }
  }
  const [first, second] = result.ranking
  if (!first || !second || result.validos <= 0) return nodata
  return { big: pct((first.votos / result.validos) * 100), sentence: t('overlay.s.resultado', { ...slots, name: first.nome, other: second.nome, pother: pct((second.votos / result.validos) * 100) }) }
}

export function sealText(o: { edition: string; address: string; fixture: boolean }): string {
  return t(o.fixture ? 'overlay.seal.fixture' : 'overlay.seal', { edition: o.edition, address: o.address })
}
