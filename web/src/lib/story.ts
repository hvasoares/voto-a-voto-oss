/**
 * The state story (#47), PURE: which cards a state's sequence has and in which order, by fixed rules, and the words of each card. A sequence has six to eight cards, one idea and one number
 * each, and ends with the share card. The cards are counts of CITIES taken from the city arcs (#41, `arcs.json` per state) plus the municipality count of the state, and the state recap card (#28,
 * `recap.ts`), which is reused where it already covers a fact (the shares of the three cycles and their changes): no card repeats what the recap says.
 *
 *   opening   the municipalities of the state (always the first card)
 *   2nd card  the MOST SURPRISING fact: among `turned2026`, `turned2022` and `returned`, the one with the highest share of the cities with the three cycles and no tie (n / total × 100); ties go to
 *             the order turned2026, turned2022, returned. `steady` (the cities that did not change) is never a candidate: the most common is not the surprising one.
 *   then      the other facts in the order turned2026, turned2022, returned, steady, then the recap, and last the share card.
 *
 * A state whose cities lack cycles has no arc counts: its sequence is shorter (opening, recap, share), and a sequence under six cards is not built (`storyPlan` says so, the page is not made).
 */
import type { ArcCounts } from './arcs'
import { citiesChanged } from './season'
import { CATALOG, message, type MessageKey } from './sentences/catalog'
import { voiceOf as voice, type VoiceInput } from './sentences/voice'
import { STORY_PLAIN, STORY_STANDARD } from './sentences/catalog-story'

Object.assign(CATALOG['pt-BR'].standard, STORY_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, STORY_PLAIN)

export const STORY_MIN = 6
export const STORY_MAX = 8
/** The longest sentence of a card, in characters (the number is drawn apart). A card over it fails the build. */
export const STORY_TEXT_MAX = 150

export type StoryKind = 'cities' | 'turned2026' | 'turned2022' | 'returned' | 'steady' | 'recap' | 'share'
/** The facts that can be the most surprising one, in the order that breaks ties. */
export const SURPRISE_ORDER = ['turned2026', 'turned2022', 'returned'] as const
export const COUNT_ORDER = ['turned2026', 'turned2022', 'returned', 'steady'] as const
type CountKind = (typeof COUNT_ORDER)[number]

export interface StoryStep {
  kind: StoryKind
  /** The number the card carries (a count of cities or municipalities); the recap and the share card carry none of their own. */
  n?: number
  /** The base of a count of cities. */
  total?: number
  /** The 2nd card: the most surprising fact. */
  surprising?: boolean
}

export interface StoryInput {
  /** Municipalities of the state. */
  cities: number
  /** The state's city arcs (`arcs.json` `byState`); undefined when there are none. */
  arcs?: ArcCounts
  /** The state has a recap (#28). */
  recap: boolean
}

/** The count of cities of each fact, from the arcs (the same sums as the season's pivot, `citiesChanged`). */
export function countsOf(arcs: ArcCounts): Record<CountKind, { n: number; total: number }> {
  const { total, n } = citiesChanged(arcs)
  return {
    turned2026: { n, total },
    turned2022: { n: arcs.switched2022 + arcs.returned + arcs.switchedTwice, total },
    returned: { n: arcs.returned, total },
    steady: { n: arcs.same, total },
  }
}

/** The surprise of a count: the share of the cities with the three cycles, in percent. */
export const surprise = (c: { n: number; total: number }) => (c.total > 0 ? (c.n / c.total) * 100 : 0)

/** The sequence of a state, in order, the share card last. Not capped: see `STORY_MIN`/`STORY_MAX` for what the page requires. */
export function storyPlan(input: StoryInput): StoryStep[] {
  const counts = input.arcs && citiesChanged(input.arcs).total > 0 ? countsOf(input.arcs) : undefined
  const plan: StoryStep[] = [{ kind: 'cities', n: input.cities }]
  if (counts) {
    // The most surprising fact: the highest share of cities; the first of SURPRISE_ORDER on a tie.
    const first = SURPRISE_ORDER.reduce((best, k) => (surprise(counts[k]) > surprise(counts[best]) ? k : best), SURPRISE_ORDER[0])
    plan.push({ kind: first, ...counts[first], surprising: true })
    for (const k of COUNT_ORDER) if (k !== first) plan.push({ kind: k, ...counts[k] })
  }
  if (input.recap) plan.push({ kind: 'recap' })
  plan.push({ kind: 'share' })
  return plan
}

/** Whether the sequence has the six to eight cards a story needs. */
export const storyFits = (plan: readonly StoryStep[]) => plan.length >= STORY_MIN && plan.length <= STORY_MAX

interface Voice extends VoiceInput {}
const say = (v: Voice, key: string, params: Record<string, string | number> = {}) => message(voice(v), key as MessageKey, params)
const num = (n: number) => n.toLocaleString('pt-BR')

export interface StoryText {
  /** The number as the card draws it ("38", "645", "7" for the share card). */
  big: string
  /** The sentence under it (at most `STORY_TEXT_MAX` characters). */
  sentence: string
  /** The small line on top ("2022 → 2026"). */
  kicker: string
}

/** The words of a card. The share card's number is how many cards the sequence has (`cards`), which is the sequence, not a figure of the data. */
export function storyText(step: StoryStep, o: { name: string; cards: number }, v: Voice = {}): StoryText {
  const of = step.total === 1 ? say(v, 'story.of.one') : say(v, 'story.of.other', { total: num(step.total ?? 0) })
  const params = { name: o.name, of }
  const big = step.kind === 'share' ? num(o.cards) : step.n !== undefined ? num(step.n) : ''
  const sentence = say(v, `story.card.${step.kind}`, params)
  if (sentence.length > STORY_TEXT_MAX) throw new Error(`story card "${step.kind}" of ${o.name}: ${sentence.length} characters, the limit is ${STORY_TEXT_MAX}`)
  return { big, sentence, kicker: say(v, `story.kicker.${step.kind}`) }
}

export const storySay = (key: string, v: Voice = {}, params: Record<string, string | number> = {}) => say(v, key, params)
