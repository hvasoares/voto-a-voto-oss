/**
 * The words of the head-to-head (#30), PURE: the catalog's `duel.*` filled from the two places' figures. Same words for every place and
 * candidate, numbers only; the mark means "higher number" and nothing else; the unsigned difference between the two candidates never
 * names a side. Importing this file loads the head-to-head's sentences (`catalog-duel.ts`).
 */
import type { DuelData, DuelPlace, Level, Measure, MeasureKey } from '../duel-model'
import { message as say, type MessageKey } from './catalog'
import './catalog-duel'
import { voiceOf, type VoiceInput } from './voice'

export interface DuelVoice extends VoiceInput {}
type Params = Record<string, string | number>

export function duelSay(voice: DuelVoice, key: MessageKey, params: Params = {}): string {
  return say(voiceOf(voice), key, params)
}

/** "Comparecimento", "Virada desde 2022". */
export function measureLabel(voice: DuelVoice, key: MeasureKey, data: Pick<DuelData, 'prev'>): string {
  return duelSay(voice, `duel.m.${key}` as MessageKey, { ano: data.prev })
}

/** The sentence a screen reader gets (the picture's text alternative) and the share text starts with. */
export function duelAlt(level: Level, a: DuelPlace, b: DuelPlace, measures: readonly Measure[], data: Pick<DuelData, 'ano' | 'prev'>, voice: DuelVoice = {}): string {
  const parts = measures.map((m) => {
    const measure = measureLabel(voice, m.key, data)
    if (m.a.rank === undefined || m.b.rank === undefined) return duelSay(voice, 'duel.alt.noValue', { measure, place: m.a.rank === undefined ? a.name : b.name })
    const part = duelSay(voice, 'duel.alt.part', { measure, va: m.a.text, a: a.name, vb: m.b.text, b: b.name })
    return m.higher ? duelSay(voice, 'duel.alt.higher', { part, place: m.higher === 'a' ? a.name : b.name }) : part
  })
  return duelSay(voice, 'duel.alt', { ano: data.ano, a: a.name, b: b.name, parts: parts.join('; ') })
}
