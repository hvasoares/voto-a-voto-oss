/**
 * The voice a sentence is told in, with its defaults (#141): the registers and locale, each with its
 * default, and `voiceOf`, the one place the defaults are applied. Previously every sentence module
 * redeclared the optional-pair interface and the `x ?? DEFAULT_LOCALE` / `y ?? DEFAULT_REGISTER` fill;
 * they now alias `VoiceInput` and call `voiceOf`.
 *
 * One tiny module with no runtime imports (the catalog is a TYPE import only), so the card's script can
 * use the registers and the defaults without shipping the catalog's wording — the promise `register.ts`
 * was written with; that file is now a re-export shim of this one. `DEFAULT_LOCALE` and
 * `DEFAULT_REGISTER` are defined here and here only (re-exported by `catalog.ts` and `register.ts`);
 * the shared-libs guard fails if either definition is copied back.
 */
import type { Locale, Voice } from './catalog'

export type Register = 'standard' | 'plain'
export const REGISTERS: readonly Register[] = ['standard', 'plain']

/** The locale a sentence defaults to: pt-BR is the one complete in both registers. */
export const DEFAULT_LOCALE: Locale = 'pt-BR'

/** The register a sentence defaults to. */
export const DEFAULT_REGISTER: Register = 'standard'

/** The one register the city card, its share text and its share picture are told in (#157): plain language. The standard wording stays in the catalog. */
export const CARD_REGISTER: Register = 'plain'

/**
 * A sentence's voice with holes: either part may be missing and `voiceOf` fills the default. The
 * feature modules expose it under their own name (`export interface DuelVoice extends VoiceInput {}`
 * and so on), so the shape is declared only here.
 */
export interface VoiceInput {
  locale?: Locale
  register?: Register
}

/** The voice with its holes filled by the defaults; `voiceOf()` is the full default voice. */
export function voiceOf(voice: VoiceInput = {}): Voice {
  return { locale: voice.locale ?? DEFAULT_LOCALE, register: voice.register ?? DEFAULT_REGISTER }
}
