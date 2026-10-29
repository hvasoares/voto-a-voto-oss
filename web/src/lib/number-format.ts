/**
 * Locale number formatting (#141): the one place `new Intl.NumberFormat` is constructed (the shared-libs
 * guard keeps it so), so the locale's thousands separator, decimal comma and percent rounding are tested
 * once instead of being recopied per module. Rounding to the displayed precision stays the caller's.
 */
import { DEFAULT_LOCALE } from './sentences/voice'
import type { Locale } from './sentences/catalog'

/** 36400 -> "36.400": a whole number, grouped the locale's way. */
export function formatInteger(value: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale).format(value)
}

/** 33.64 -> "33,6": at most `digits` decimals (default one), the locale's decimal mark. */
export function formatDecimal(value: number, locale: Locale = DEFAULT_LOCALE, digits = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)
}

/** 0.3364 -> "33,6%": a 0..1 share as one phrase, at one decimal. */
export function formatShare(share: number, locale: Locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(share)
}

/** 33.6 -> "33,6%": percentage points (a 0..100 number) with the percent sign. */
export function formatPoints(points: number, locale: Locale = DEFAULT_LOCALE): string {
  return `${formatDecimal(points, locale)}%`
}
