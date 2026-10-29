/**
 * The arc label of a city card (#41), PURE: the catalog's wording (`arc.*`) for one `Arc`, and the line that says it
 * describes the sequence and not the cause. The label is picked from the closed list of templates; nothing else is said.
 */
import type { Arc } from '../arcs'
import { DEFAULT_LOCALE, DEFAULT_REGISTER, message as say, type Locale, type MessageKey, type Register } from './catalog'
import './catalog-arc'

export interface ArcPlace {
  locale?: Locale
  register?: Register
}

export function arcLabel(arc: Arc, place: ArcPlace = {}): { label: string; note: string } {
  const voice = { locale: place.locale ?? DEFAULT_LOCALE, register: place.register ?? DEFAULT_REGISTER }
  const years = new Intl.ListFormat(voice.locale, { style: 'long', type: 'conjunction' }).format((arc.years ?? []).map(String))
  return { label: say(voice, `arc.${arc.kind}` as MessageKey, { years }), note: say(voice, 'arc.note') }
}
