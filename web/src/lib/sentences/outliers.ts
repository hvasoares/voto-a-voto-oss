/**
 * The words of "Cidades fora da curva" (#34), PURE: the catalog's `outlier.*` (and the report's fact sentences) filled from the numbers. Same words for every
 * city. Importing this file loads the sentences (`catalog-outliers.ts`).
 */
import { DEFAULT_LOCALE, DEFAULT_REGISTER, message as say, type Locale, type MessageKey, type Register } from './catalog'
import './catalog-outliers'

export interface OutlierVoice {
  locale?: Locale
  register?: Register
}

export function outlierSay(voice: OutlierVoice, key: string, params: Record<string, string | number> = {}): string {
  return say({ locale: voice.locale ?? DEFAULT_LOCALE, register: voice.register ?? DEFAULT_REGISTER }, key as MessageKey, params)
}
