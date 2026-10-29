/**
 * The words of "Ficaram em casa" (#32), PURE: the catalog's `stayhome.*` filled from the rows of one cycle and round. Same words for every
 * state; numbers only. Importing this file loads the sentences (`catalog-stayhome.ts`).
 */
import { formatInt } from '@/shared/city-model'
import { formatShare, type Claim, type StayHomeRow } from '../stay-home'
import { message as say, type MessageKey } from './catalog'
import './catalog-stayhome'
import { voiceOf, type VoiceInput } from './voice'

export interface StayHomeVoice extends VoiceInput {}
type Params = Record<string, string | number>

export function stayhomeSay(voice: StayHomeVoice, key: string, params: Params = {}): string {
  return say(voiceOf(voice), key as MessageKey, params)
}

export const turnoLabel = (voice: StayHomeVoice, turno: 1 | 2) => stayhomeSay(voice, `stayhome.turno.${turno}`)

export const viewLabel = (voice: StayHomeVoice, ano: number, turno: 1 | 2) => stayhomeSay(voice, 'stayhome.view', { ano, turno: turnoLabel(voice, turno) })

export const subtitle = (voice: StayHomeVoice, ano: number, turno: 1 | 2) => stayhomeSay(voice, 'stayhome.sub', { ano, turno: turnoLabel(voice, turno) })

/** The picture's text alternative, the share text starts with the same facts. */
export function stayhomeAlt(rows: readonly StayHomeRow[], ano: number, turno: 1 | 2, voice: StayHomeVoice = {}): string {
  if (!rows.length) return stayhomeSay(voice, 'stayhome.noData', { ano, turno: turnoLabel(voice, turno) })
  const parts = rows.map((r) => stayhomeSay(voice, 'stayhome.alt.part', { uf: r.uf.toUpperCase(), pct: formatShare(r.share) }))
  return stayhomeSay(voice, 'stayhome.alt', { ano, turno: turnoLabel(voice, turno), parts: parts.join('; ') })
}

export const stayhomeShareText = (voice: StayHomeVoice, ano: number, turno: 1 | 2) => stayhomeSay(voice, 'stayhome.share.text', { ano, turno: turnoLabel(voice, turno) })

/** "Em 52,5% das cidades, ..." for the cycle and round chosen, with its limits sentence. */
export function claimLines(claim: Claim, ano: number, turno: 1 | 2, voice: StayHomeVoice = {}): [string, string] {
  const pct = `${Math.floor(claim.tenths / 10)},${claim.tenths % 10}`
  return [stayhomeSay(voice, 'stayhome.claim', { pct, ano, turno: turnoLabel(voice, turno) }), stayhomeSay(voice, 'stayhome.claim.limits')]
}

export const selectedLines = (voice: StayHomeVoice, row: StayHomeRow): [string, string] => [
  stayhomeSay(voice, 'stayhome.selected.line1', { aptos: formatInt(row.aptos), nao: formatInt(row.naoVotaram) }),
  stayhomeSay(voice, 'stayhome.selected.line2'),
]
