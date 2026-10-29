/**
 * The words of "Brasil e regiões" (#91), PURE: the catalog's `brasil.*` filled from a `BrasilView`. The headline reads the national bar aloud, the same words
 * for both candidates in ballot-number order, so it names no winner and gives no reason; the text alternative of the picture adds the five regions with the
 * numbers the page prints. Importing this file loads the sentences (`catalog-brasil.ts`).
 */
import type { BrasilView } from '../brasil'
import { message as say, type MessageKey } from './catalog'
import './catalog-brasil'
import { voiceOf, type VoiceInput } from './voice'

export interface BrasilVoice extends VoiceInput {}
type Params = Record<string, string | number>

const brasilSay = (voice: BrasilVoice, key: string, params: Params = {}): string => say(voiceOf(voice), key as MessageKey, params)

/** "No Brasil, no 2º turno de 2026, os votos válidos foram: Lula 51,78% e Flávio Bolsonaro 48,22%." */
export function brasilHeadline(view: BrasilView, voice: BrasilVoice = {}): string {
  const [a, b] = view.nationalCandidates
  if (!a || !b) return ''
  return brasilSay(voice, 'brasil.headline', { turno: view.turno, ano: view.ano, a: a.labelFull, pa: a.pctText, b: b.labelFull, pb: b.pctText })
}

/** One region read aloud: the two shares of its valid votes and the turnout of its electorate. */
export function regionSentence(r: BrasilView['regions'][number], voice: BrasilVoice = {}): string {
  const [a, b] = r.candidates
  return brasilSay(voice, 'brasil.region', { region: r.label, a: a?.labelFull ?? '', pa: a?.pctText ?? '', b: b?.labelFull ?? '', pb: b?.pctText ?? '', c: r.compareceramText, n: r.naoText })
}

/** The picture's text alternative: the headline and the regions, with every number the picture and the page show. */
export function brasilAlt(view: BrasilView, voice: BrasilVoice = {}): string {
  const head = brasilHeadline(view, voice)
  if (!view.regions.length) return head
  return `${head} ${brasilSay(voice, 'brasil.regions', { parts: view.regions.map((r) => regionSentence(r, voice)).join('; ') })}`
}

export const brasilRegionShare = (r: BrasilView['regions'][number], voice: BrasilVoice = {}) => brasilSay(voice, 'brasil.regionShare', { p: r.shareText })
export const brasilTurnout = (r: BrasilView['regions'][number], voice: BrasilVoice = {}) => brasilSay(voice, 'brasil.turnout', { c: r.compareceramText, n: r.naoText })
export const brasilBlanks = (r: BrasilView['regions'][number], voice: BrasilVoice = {}) => brasilSay(voice, 'brasil.blanks', { b: r.brancosText, n: r.nulosText })
export const brasilBase = (turno: number, voice: BrasilVoice = {}) => brasilSay(voice, 'brasil.base', { turno })
export const brasilShareLabel = (voice: BrasilVoice = {}) => brasilSay(voice, 'brasil.share')
export const brasilShareNote = (voice: BrasilVoice = {}) => brasilSay(voice, 'brasil.share.note')
export const brasilNoJs = (voice: BrasilVoice = {}) => brasilSay(voice, 'brasil.nojs')
export const brasilVotes = (name: string, votos: string, voice: BrasilVoice = {}) => brasilSay(voice, 'brasil.votes', { name, votos })
export const brasilLegend = (voice: BrasilVoice = {}) => brasilSay(voice, 'brasil.legend')
