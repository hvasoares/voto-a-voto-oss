/**
 * Meu Brasil as a story (#97), PURE: a sequence of six to eight vertical cards built only from the places the visitor picked (one to three), one idea and one number each, the most surprising fact on
 * the second card, the share card last. Every number is about a PLACE, never about the visitor: the words never name the visitor, whom they voted for, why, or what kind of voter they are, and the
 * roles of the places (where they live, vote, were born) are not shown. It reuses the sequence of #47 (`StorySequence`, `story-card.ts`) and the places of #27 (`meu-brasil.ts`).
 *
 * The cards, in order (`meuStoryPlan`):
 *   places     the places as picked (the number is how many)
 *   2nd card   THE MOST SURPRISING FACT: the place whose city arc (#41) changed side the most (a place that changed in 2022 and again or back in 2026 over one that changed once; the arc of a place
 *              that never changed, tied or missed a cycle does not compete); ties go to the order of the places. With no change in any place there is no surprise to tell: the second card is the first per-place card.
 *   per place  turnout in 2026, the people who did not vote in 2026, the arc (the year the side changed), turnout in 2022 and in 2018: a card for each place that has the cycle, in rounds (every place's
 *              2026 turnout, then every place's non-voters, then every place's arc ...), as many as the eight cards allow
 *   twin       the twin city of the FIRST place (#31): its turnout in 2026
 *   curiosity  the first curiosity of the FIRST place (#33), when it has one
 *   share      last
 * A place missing a cycle skips the cards of that cycle (and its arc); a first place with no twin or no curiosity skips that card; the sequence stays between six and eight cards for places with at least two
 * cycles (a place with one cycle has too few facts to tell: the sequence is then shorter, and says what it has).
 */
import type { Arc } from './arcs'
import type { Fact } from './curiosities'
import { curiosityLine } from '@/slots/city/curiosities'
import type { CityResult } from '@/shared/city-model'
import { CATALOG, message, type MessageKey } from './sentences/catalog'
import { voiceOf as voice, type VoiceInput } from './sentences/voice'
import { STORY_PLAIN, STORY_STANDARD } from './sentences/catalog-story'
import { STORY_TEXT_MAX } from './story'

Object.assign(CATALOG['pt-BR'].standard, STORY_STANDARD)
Object.assign(CATALOG['pt-BR'].plain, STORY_PLAIN)

export const MEU_STORY_MIN = 6
export const MEU_STORY_MAX = 8
export const MEU_STORY_YEARS = [2018, 2022, 2026] as const

/** One picked place and what the cards read of it: its name, its arc and its 2nd-round result of each cycle. */
export interface StoryPlace {
  name: string
  /** "RJ", "Exterior". */
  ufLabel: string
  /** `rj/cidade-exemplo` */
  key: string
  arc: Arc
  results: Partial<Record<number, CityResult>>
}
export interface StoryTwin {
  name: string
  ufLabel: string
  /** `sp/vila-modelo` */
  key: string
  /** Its 2nd-round result of 2026. */
  result: CityResult
}
export interface MeuStoryInput {
  places: readonly StoryPlace[]
  twin?: StoryTwin
  /** The first curiosity of the first place. */
  curiosity?: Fact
}

export type MeuKind = 'places' | 'turnout' | 'nonvoters' | 'arc' | 'twin' | 'curiosity' | 'share'
export interface MeuStep {
  kind: MeuKind
  /** Index into `places` of the place the card is about. */
  place?: number
  /** The cycle of a turnout or non-voters card. */
  ano?: number
  surprising?: boolean
}

/** How many times the side with the most votes changed over the three cycles, from the arc; 0 when it did not, tied or missed a cycle. */
export function sideChanges(arc: Arc): number {
  return arc.kind === 'switchedTwice' || arc.kind === 'returned' ? 2 : arc.kind === 'switched2022' || arc.kind === 'switched2026' ? 1 : 0
}

/** The per-place cards of one place, in the order they are offered: 2026 turnout, 2026 non-voters, the arc, then 2022 and 2018. */
const POOL: readonly { kind: 'turnout' | 'nonvoters' | 'arc'; ano?: number }[] = [
  { kind: 'turnout', ano: 2026 },
  { kind: 'nonvoters', ano: 2026 },
  { kind: 'arc' },
  { kind: 'turnout', ano: 2022 },
  { kind: 'nonvoters', ano: 2022 },
  { kind: 'turnout', ano: 2018 },
  { kind: 'nonvoters', ano: 2018 },
]

const has = (p: StoryPlace, ano: number) => !!p.results[ano] && p.results[ano]!.aptos > 0
const available = (p: StoryPlace, s: { kind: string; ano?: number }) => (s.kind === 'arc' ? p.arc.kind !== 'missing' : has(p, s.ano!))

export function meuStoryPlan(input: MeuStoryInput): MeuStep[] {
  const { places } = input
  if (!places.length) return []
  // The most surprising fact: the place whose side changed the most; the first of the places on a tie.
  let top = -1
  let surprising = -1
  places.forEach((p, i) => {
    const c = sideChanges(p.arc)
    if (c > top && c > 0) ((top = c), (surprising = i))
  })
  // The cards each place offers, in rounds: every place's first offer, then every place's second, ...
  const offers: MeuStep[] = POOL.flatMap((s) => places.flatMap((p, i) => (available(p, s) ? [{ kind: s.kind, place: i, ano: s.ano } as MeuStep] : [])))
  const isTop = (o: MeuStep) => surprising >= 0 && o.kind === 'arc' && o.place === surprising
  const fixed = 2 + (input.twin ? 1 : 0) + (input.curiosity ? 1 : 0)
  const rest = offers.filter((o) => !isTop(o))
  const lead: MeuStep[] = surprising >= 0 ? [{ kind: 'arc', place: surprising, surprising: true }] : []
  const slots = MEU_STORY_MAX - fixed - (lead.length ? 1 : 0)
  let body = rest.slice(0, Math.max(0, slots))
  // With no change in any place the second card is simply the first per-place card, told as it is (it is not called "the most surprising").
  const plan: MeuStep[] = [{ kind: 'places' }, ...lead, ...body]
  if (input.twin) plan.push({ kind: 'twin', place: 0 })
  if (input.curiosity) plan.push({ kind: 'curiosity', place: 0 })
  plan.push({ kind: 'share' })
  return plan
}

export const meuStoryFits = (plan: readonly MeuStep[]) => plan.length >= MEU_STORY_MIN && plan.length <= MEU_STORY_MAX

type Voice = VoiceInput
const say = (v: Voice, key: string, params: Record<string, string | number> = {}) => message(voice(v), key as MessageKey, params)
const num = (n: number) => n.toLocaleString('pt-BR')
const list = (v: Voice, items: string[]) => new Intl.ListFormat(voice(v).locale, { style: 'long', type: 'conjunction' }).format(items)
/** The place as a card names it: with its state, or (when a sentence would be too long) by its name alone. */
let bare = false
const label = (p: { name: string; ufLabel: string }) => (bare ? p.name : `${p.name} · ${p.ufLabel}`)

export interface MeuStoryText {
  big: string
  sentence: string
  kicker: string
  /** Where the number is explained: the page of the fact record that covers it (the calculation link), relative to the site root; `anchor` is its fragment. */
  calc?: { path: string; anchor: string }
}

/** The words and the record of a card. Throws for a sentence over the limit (a test runs every city name through it). */
export function meuStoryText(step: MeuStep, input: MeuStoryInput, cards: number, v: Voice = {}): MeuStoryText {
  const full = write(step, input, cards, v, false)
  if (full.sentence.length <= STORY_TEXT_MAX) return full
  // Too long with the states named: the same card with the names alone; still too long, the build fails.
  const short = write(step, input, cards, v, true)
  if (short.sentence.length > STORY_TEXT_MAX) throw new Error(`meu brasil story card "${step.kind}": ${short.sentence.length} characters, the limit is ${STORY_TEXT_MAX}`)
  return short
}

function write(step: MeuStep, input: MeuStoryInput, cards: number, v: Voice, names: boolean): MeuStoryText {
  bare = names
  const place = step.place !== undefined ? input.places[step.place] : undefined
  return ((): MeuStoryText => {
    switch (step.kind) {
      case 'places':
        return { big: num(input.places.length), sentence: say(v, 'mbstory.card.places', { names: list(v, input.places.map(label)) }), kicker: say(v, 'mbstory.kicker.places') }
      case 'turnout': {
        const r = place!.results[step.ano!]!
        return { big: `${r.votedPct}%`, sentence: say(v, 'mbstory.card.turnout', { place: label(place!), ano: step.ano! }), kicker: say(v, 'mbstory.kicker.turnout', { ano: step.ano! }), calc: calcOf(place!.key, step.ano!, 'votaram') }
      }
      case 'nonvoters': {
        const r = place!.results[step.ano!]!
        return { big: num(r.naoVotaram), sentence: say(v, 'mbstory.card.nonvoters', { place: label(place!), ano: step.ano! }), kicker: say(v, 'mbstory.kicker.nonvoters', { ano: step.ano! }), calc: calcOf(place!.key, step.ano!, 'naoVotaram') }
      }
      case 'arc': {
        const arc = place!.arc
        const big = arc.kind === 'same' ? '3' : arc.kind === 'switched2026' ? '2026' : arc.kind === 'tie' ? String(arc.years![0]) : '2022'
        return { big, sentence: say(v, `mbstory.card.arc.${arc.kind}`, { place: label(place!) }), kicker: say(v, 'mbstory.kicker.arc') }
      }
      case 'twin': {
        const twin = input.twin!
        return { big: `${twin.result.votedPct}%`, sentence: say(v, 'mbstory.card.twin', { twin: label(twin), place: label(place!), ano: 2026 }), kicker: say(v, 'mbstory.kicker.twin'), calc: calcOf(twin.key, 2026, 'votaram') }
      }
      case 'curiosity': {
        const f = input.curiosity!
        const line = curiosityLine(f, voice(v).register, voice(v).locale)
        return { big: say(v, 'curio.rank', { n: f.rank }), sentence: say(v, 'mbstory.card.curiosity', { what: line.what, group: line.group }), kicker: say(v, 'mbstory.kicker.curiosity'), calc: { path: `fato/${place!.key}/comparacoes/`, anchor: f.code } }
      }
      case 'share': {
        const named = say(v, 'mbstory.card.share', { places: list(v, input.places.map((p) => p.name)) })
        // The names of three long places can fill the card: the last resort is the sentence without them.
        return { big: num(cards), sentence: names && named.length > STORY_TEXT_MAX ? say(v, 'mbstory.card.share.generic') : named, kicker: say(v, 'mbstory.kicker.share') }
      }
    }
  })()
}

/** The 2026 cycle has a fact page per city and round; the earlier ones are explained by the page of the rules (the same split as the city card: `olderCyclesFacts`). */
function calcOf(key: string, ano: number, anchor: 'votaram' | 'naoVotaram'): { path: string; anchor: string } {
  return ano >= 2026 ? { path: `fato/${key}/${ano}-2/`, anchor } : { path: 'fato/metodo/ciclos-anteriores/', anchor }
}
