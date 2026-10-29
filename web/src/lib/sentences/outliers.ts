/**
 * The words of "Cidades fora da curva" (#34), PURE: the catalog's `outlier.*` (and the report's fact sentences) filled from the numbers. Same words for every
 * city. Importing this file loads the sentences (`catalog-outliers.ts`).
 */
import { message as say, type MessageKey } from './catalog'
import './catalog-outliers'
import { voiceOf, type VoiceInput } from './voice'

export interface OutlierVoice extends VoiceInput {}

export function outlierSay(voice: OutlierVoice, key: string, params: Record<string, string | number> = {}): string {
  return say(voiceOf(voice), key as MessageKey, params)
}
