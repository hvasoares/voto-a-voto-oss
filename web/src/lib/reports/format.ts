/**
 * Pure formatting helpers of the reports. pt-BR separators (dot for thousands, comma for the decimal),
 * always computed from a number the tests pin. Sign conventions of the pp figures:
 * positive is toward Lula, negative toward Flavio; zero carries no sign.
 */

/** One fixed decimal with the pt-BR decimal comma: -4.53 -> "-4,5"; trailing ",0" kept ("90,5" / "34,0"). */
export function formatDecimal(value: number): string {
  const fixed = (Math.round(value * 10) / 10).toFixed(1)
  return fixed.replace('.', ',')
}

/** Same with an explicit sign for non-zero values: 4.97 -> "+5,0", -4.53 -> "-4,5", 0 -> "0,0". */
export function formatSignedDecimal(value: number): string {
  return value > 0 ? `+${formatDecimal(value)}` : formatDecimal(value)
}

/** A pp figure for the prose: "+9,8 pp". */
export function formatSignedPp(value: number): string {
  return `${formatSignedDecimal(value)} pp`
}

/** "36400" -> "36.400" (pt-BR thousands separator, like the site's other numbers). */
export function formatInt(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** A whole number with the thousands dot, signed for non-zero ("0", "+3.862.039", "-2.403"). */
export function formatSignedInt(n: number): string {
  const abs = String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return n > 0 ? `+${abs}` : n < 0 ? `-${abs}` : '0'
}

/** A share with one fixed decimal: 90.4615 -> "90,5%", 59.0 -> "59,0%". */
export function formatFixedPct(value: number): string {
  return `${formatDecimal(value)}%`
}