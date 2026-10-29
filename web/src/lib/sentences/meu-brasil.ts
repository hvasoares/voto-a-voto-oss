/**
 * The headline of Meu Brasil (#27), PURE: the catalog's `mb.*` filled from the cards. Same words for every place and candidate,
 * numbers only (the share of the electorate that did not vote, whole percents as the bars show them); no winner, no cause.
 *   one place     the share in each cycle that has data           "... foi de 21% em 2018, 20% em 2022 e 30% em 2026."
 *   two or three  the share in each place, in the latest cycle all have  "No 2º turno de 2026, ... foi de 30% em A, 26% em B e 22% em C."
 *   no cycle in common, or no place   `mb.noData` / `mb.none`
 */
import { commonCycle, type PlaceCard } from '../meu-brasil'
import { message as say, type MessageKey } from './catalog'
import './catalog-meu-brasil'
import { voiceOf, type VoiceInput } from './voice'

export interface MeuBrasilVoice extends VoiceInput {}

const pctOf = (card: PlaceCard, ano: number): number | undefined => {
  const b = card.cycles.find((c) => c.ano === ano)
  return b?.status === 'data' ? b.notVotedPct : undefined
}

export function meuBrasilHeadline(cards: readonly PlaceCard[], voice: MeuBrasilVoice = {}): string {
  const v = voiceOf(voice)
  const message = (key: MessageKey, params: Record<string, string | number> = {}) => say(v, key, params)
  const list = new Intl.ListFormat(v.locale, { style: 'long', type: 'conjunction' })
  if (cards.length === 0) return message('mb.none')
  if (cards.length === 1) {
    const [card] = cards as [PlaceCard]
    const parts = card.cycles.flatMap((b) => (b.status === 'data' ? [message('mb.part.cycle', { pct: b.notVotedPct, ano: b.ano })] : []))
    return parts.length ? message('mb.single', { place: card.name, parts: list.format(parts) }) : message('mb.noData')
  }
  const ano = commonCycle(cards)
  if (ano === undefined) return message('mb.noData')
  return message('mb.multi', { ano, parts: list.format(cards.map((c) => message('mb.part.place', { pct: pctOf(c, ano)!, place: c.name }))) })
}
