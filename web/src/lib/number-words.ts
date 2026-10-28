/**
 * Numbers spelled for the ear (pt-BR), PURE: `spell(1234)` -> "mil duzentos e trinta e quatro", `spellPercent(33.6)` ->
 * "trinta e três vírgula seis por cento". Used by the read-aloud bulletin (#65), where a figure is read, not seen. Masculine forms only
 * (the bulletin counts "votos" and "eleitores"). Whole numbers up to 999.999.999.
 */
const DECIMAL_POINT = 'vírgula'
const PERCENT = 'por cento'
const UNITS = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

/** 1..999 */
function below1000(n: number): string {
  if (n === 100) return 'cem'
  const h = Math.floor(n / 100)
  const rest = n % 100
  const parts: string[] = []
  if (h) parts.push(HUNDREDS[h]!)
  if (rest) parts.push(rest < 20 ? UNITS[rest]! : TENS[Math.floor(rest / 10)]! + (rest % 10 ? ` e ${UNITS[rest % 10]}` : ''))
  return parts.join(' e ')
}

export function spell(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) throw new RangeError(`spell: ${n} is outside 0..999999999`)
  if (n === 0) return UNITS[0]!
  const millions = Math.floor(n / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const rest = n % 1000
  const parts: string[] = []
  if (millions) parts.push(millions === 1 ? 'um milhão' : `${below1000(millions)} milhões`)
  if (thousands) parts.push(thousands === 1 ? 'mil' : `${below1000(thousands)} mil`)
  if (rest) parts.push(below1000(rest))
  // "e" joins the last group when it is round (100, 200, ... or under 100): "mil e quinhentos", "dois milhões e duzentos"; otherwise groups are just listed.
  const last = rest || (thousands ? thousands * 1000 : millions * 1_000_000)
  const lastIsRound = rest ? rest < 100 || rest % 100 === 0 : false
  if (parts.length === 1) return parts[0]!
  return parts.slice(0, -1).join(' ') + (lastIsRound || (!rest && last) ? ' e ' : ' ') + parts.at(-1)
}

/** One decimal place at most: 33.6 -> "trinta e três vírgula seis por cento"; 5 -> "cinco por cento"; 0.04 -> "menos de um décimo por cento" is NOT used: callers pass rounded values. */
export function spellPercent(x: number): string {
  const v = Math.round(x * 10) / 10
  const whole = Math.trunc(v)
  const tenth = Math.round((v - whole) * 10)
  const decimal = tenth ? [DECIMAL_POINT, spell(tenth)] : []
  return [spell(whole), ...decimal, PERCENT].join(' ')
}
