/**
 * The arc label of a city card (#41), PURE: the catalog's wording (`arc.*`) for one `Arc`, and the line that says it
 * describes the sequence and not the cause. The label is picked from the closed list of templates; nothing else is said.
 */
import type { Arc } from '../arcs'
import { message as say, type MessageKey } from './catalog'
import './catalog-arc'
import { voiceOf, type VoiceInput } from './voice'

export interface ArcPlace extends VoiceInput {}

export function arcLabel(arc: Arc, place: ArcPlace = {}): { label: string; note: string } {
  const voice = voiceOf(place)
  const years = new Intl.ListFormat(voice.locale, { style: 'long', type: 'conjunction' }).format((arc.years ?? []).map(String))
  return { label: say(voice, `arc.${arc.kind}` as MessageKey, { years }), note: say(voice, 'arc.note') }
}
