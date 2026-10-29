/**
 * The ready phrases of the creator guide (#67), PURE: for one city, the participation sentence (the card's headline), the result sentence and the arc sentence, in the
 * chosen register. Each phrase says numbers and where they sit in the sequence, never why. Words are the catalog's (`guide.*`, `headline()`, `arc.*`).
 */
import type { CityShard } from './city-shard'
import { cityShardResult } from './city-shard'
import { cityArc } from './arcs'
import { arcLabel } from './sentences/arc'
import { message as say, type MessageKey, type Register } from './sentences/catalog'
import './sentences/catalog-guide'
import { voiceOf } from './sentences/voice'
import { formatPoints } from './number-format'
import { headline } from './sentences/headline'
import { defaultView } from '@/slots/city/city-view'
import { displayName } from '@/shared/city-search'

export interface Phrase {
  kind: 'turnout' | 'result' | 'sequence'
  text: string
}

export function creatorPhrases(shard: CityShard, register: Register): { phrases: Phrase[]; noData?: string } {
  const voice = voiceOf({ register })
  const t = (key: string, params: Record<string, string | number> = {}) => say(voice, key as MessageKey, params)
  const city = displayName(shard.city.nome)
  const view = defaultView((ano, turno) => !!cityShardResult(shard, ano, turno))
  const r = cityShardResult(shard, view.ano, view.turno)
  if (!r) return { phrases: [], noData: t('guide.nodata', { city, turno: view.turno, ano: view.ano }) }
  const phrases: Phrase[] = [{ kind: 'turnout', text: headline(r, { cityName: city, overseas: shard.city.uf === 'zz', register }) }]
  const [first, second] = r.ranking
  if (r.validos > 0 && first && second && second.votos > 0) {
    const pct = (n: number) => formatPoints(Math.round((n / r.validos) * 1000) / 10)
    phrases.push({ kind: 'result', text: t('guide.result', { turno: r.turno, ano: r.ano, city, a: first.nome, pa: pct(first.votos), b: second.nome, pb: pct(second.votos) }) })
  }
  const arc = arcLabel(cityArc(shard), { register })
  phrases.push({ kind: 'sequence', text: t('guide.sequence', { city, label: arc.label, note: arc.note }) })
  return { phrases }
}
