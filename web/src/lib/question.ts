/**
 * The question of a city (#44), PURE: one question from a closed list of seven (one per arc, `arcs.ts`), and its answer, which is
 * the arc itself. Nothing is computed that the page does not already show: the answer is the arc label of the card, so the question
 * adds only its own sentence to the page.
 *
 * Why this list: the arc is the one fact of the city that is a yes or a no, and that the three cycles settle. Which question a
 * city gets is the rule "the question the arc settles": a city that changed side asks about the change (the answer is yes), the
 * 4.977 that did not change ask whether they did (no), a tie asks about the tie, a city with a missing cycle asks whether the
 * results exist (no: the answer says which years are missing). An overseas post has the same list in its own words. Every city
 * has exactly one question, so ties between candidates for "the most informative" cannot happen.
 */
import { cityArc, type Arc, type ArcKind } from './arcs'
import type { CityShard } from './city-shard'
import { arcLabel } from './sentences/arc'
import { CATALOG, message, type MessageKey } from './sentences/catalog'
import { voiceOf as voice, type VoiceInput } from './sentences/voice'
import { GUESS_STANDARD } from './sentences/catalog-guess'
import { QUESTION_PLAIN, QUESTION_STANDARD } from './sentences/catalog-question'

Object.assign(CATALOG['pt-BR'].standard, QUESTION_STANDARD, GUESS_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, QUESTION_PLAIN, GUESS_STANDARD)

export interface Question {
  kind: ArcKind
  arc: Arc
  /** Overseas posts read "o voto no exterior em ...". */
  overseas: boolean
  /** True when the right guess is "Sim". */
  answer: boolean
}

/** The right guess of each question of the closed list. */
export const ANSWERS: Record<ArcKind, boolean> = { same: false, switched2022: true, switched2026: true, returned: true, switchedTwice: true, tie: true, missing: false }

export function questionOf(arc: Arc, overseas: boolean): Question {
  return { kind: arc.kind, arc, overseas, answer: ANSWERS[arc.kind] }
}

export function pickQuestion(shard: CityShard): Question {
  return questionOf(cityArc(shard), shard.city.uf === 'zz')
}

interface Voice extends VoiceInput {}

export function questionText(q: Question, cityName: string, v: Voice = {}): string {
  const years = new Intl.ListFormat(voice(v).locale, { style: 'long', type: 'conjunction' }).format((q.arc.years ?? []).map(String))
  return message(voice(v), `question.${q.kind}${q.overseas ? '.o' : ''}` as MessageKey, { city: cityName, years })
}

/** The note shown where scripts are off: the question cannot be asked, the answer is shown (#149). */
export function noscriptText(v: Voice = {}): string {
  return message(voice(v), 'question.noscript' as MessageKey)
}

/** "Sim" or "Não". */
export function yesNo(value: boolean, v: Voice = {}): string {
  return message(voice(v), (value ? 'question.yes' : 'question.no') as MessageKey)
}

/** The answer line: "Sim" or "Não", then the arc label that is already on the card. */
export function answerText(q: Question, v: Voice = {}): string {
  return `${yesNo(q.answer, v)}. ${arcLabel(q.arc, v).label}`
}
