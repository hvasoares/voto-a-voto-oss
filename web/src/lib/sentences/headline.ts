/**
 * The headline sentence of a city card, PURE: `headline(result, place)` builds one neutral sentence from the numbers of
 * a CityResult and the catalog (`catalog.ts`; the wording is there, this file only decides WHICH sentence applies and
 * fills its slots). The same string is the card's headline, the text alternative of the card and of the share picture,
 * and the share text (plus the link). Same words and treatment for every candidate; no loaded words, no cause.
 *
 * Which sentence (N = share of the electorate that did not vote, W = share the most voted candidate got, R = the
 * runner-up's; the comparison is made on the one-decimal values that are shown):
 *   no data in the cycle    -> `noData`
 *   no electorate           -> `noElectorate`;  nobody turned out -> `nobodyTurnedOut`;  zero valid votes -> `noValidVotes`
 *   everyone voted          -> `everyoneVoted`
 *   tie for the lead        -> `tie.two` / `tie.many`;  a single candidate -> `single`
 *   N against W             -> `vsLeader` unless N is below W by more than 15%; then N against R -> `vsRunnerUp`
 *                              (a tie for second names all of them: `runnerUp.tied`)
 *   tiny electorate (< 100 registered voters): the same sentences in head counts, not percentages
 * Overseas posts use the `lead.overseas` start ("No exterior, em ...") and the same figures.
 */
import type { CandidateTally, CityResult } from '@/shared/city-model'
import { DEFAULT_LOCALE, template, type Locale, type Register, type Voice } from './catalog'
import { drawPhrase, phrase, phraseWord, type PhrasePart } from './phrase'
import './catalog-headline'
import { formatInteger, formatShare } from '../number-format'
import { voiceOf } from './voice'

/** Below this many registered voters percentages are too coarse to read; the sentence uses counts. */
export const TINY_ELECTORATE = 100
const CLOSE = 0.15

export interface Place {
  /** Display name of the city (or overseas post). */
  cityName: string
  /** Overseas posts (uf `zz`) are "no exterior", not a city of a state. */
  overseas?: boolean
  locale?: Locale
  /** `standard` (default) or `plain` (linguagem simples). */
  register?: Register
}

type Band = 'above' | 'slightly' | 'equal' | 'almost' | 'below'

function band(n: number, x: number): Band {
  if (n === x) return 'equal'
  const ratio = n / x
  if (ratio > 1 + CLOSE) return 'above'
  if (ratio > 1) return 'slightly'
  return ratio >= 1 - CLOSE ? 'almost' : 'below'
}

const round1 = (x: number) => Math.round(x * 10) / 10

/** The headline as data (private#213): the catalog keys and the numbers it is made of, drawn in either register by `drawPhrase`; `headline` is this, drawn. */
export function headlineSentence(r: CityResult | undefined, place: Omit<Place, 'register'>): PhrasePart {
  const locale = place.locale ?? DEFAULT_LOCALE
  const message = phrase
  if (!r) return message('noData')

  const int = (n: number) => formatInteger(n, locale)
  /** 33.6 -> "33,6%"; a non-zero part never reads as 0% and a partial one never as 100%. */
  const pct = (x: number): PhrasePart => {
    const v = round1(x)
    if (x > 0 && v === 0) return message('pct.lessThan', { pct: formatShare(0.001, locale) })
    if (x < 100 && v >= 100) return message('pct.moreThan', { pct: formatShare(0.999, locale) })
    return formatShare(v / 100, locale)
  }
  const names = new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' })
  const ref = (nome: string): PhrasePart => (/^Candidat[oa]\b/.test(nome) ? message('label.article', { name: nome }) : nome)

  const lead = message(place.overseas ? 'lead.overseas' : 'lead.city', { city: place.cityName, turno: r.turno, ano: r.ano })
  if (r.aptos <= 0) return message('noElectorate', { lead })
  if (r.comparecimento <= 0) return message('nobodyTurnedOut', { lead, aptos: int(r.aptos) }, r.aptos)
  if (r.validos <= 0) return message('noValidVotes', { lead })
  if (r.naoVotaram <= 0) return message('everyoneVoted', { lead })

  const tiny = r.aptos < TINY_ELECTORATE
  // measure(votes) is what the sentence compares: the electorate share (one decimal) or a head count.
  const measure = (votos: number) => (tiny ? votos : round1((votos / r.aptos) * 100))
  const show = (votos: number): PhrasePart => (tiny ? message('votes.count', { n: int(votos) }, votos) : pct((votos / r.aptos) * 100))
  const nonVoters = tiny
    ? message('nonVoters.count', { n: int(r.naoVotaram), aptos: int(r.aptos) }, r.naoVotaram)
    : message('nonVoters.share', { share: pct(r.notVotedShare) })

  const [first, second] = r.ranking as [CandidateTally, CandidateTally]
  const top = r.ranking.filter((c) => c.votos === first.votos)
  if (top.length > 1) {
    const each = tiny ? show(first.votos) : message('share.ofElectorate', { share: show(first.votos) })
    return top.length === 2
      ? message('tie.two', { lead, a: top[0]!.nome, b: top[1]!.nome, each, nonVoters })
      : message('tie.many', { lead, count: top.length, each, nonVoters })
  }
  if (!second || second.votos <= 0) return message('single', { lead, nonVoters, name: ref(first.nome), value: show(first.votos) })

  const n = measure(r.naoVotaram)
  const against = band(n, measure(first.votos))
  if (against !== 'below') {
    return message('vsLeader', { lead, nonVoters, phrase: message(`phrase.${against}`), name: first.nome, value: show(first.votos) })
  }
  const runners = r.ranking.filter((c) => c.votos === second.votos)
  const rel = band(n, measure(second.votos))
  const who =
    runners.length === 1
      ? ref(second.nome)
      : message('runnerUp.tied', { count: phraseWord('numberWords', runners.length), names: names.format(runners.map((c) => c.nome)) })
  const role = (rel === 'above' || rel === 'below') && runners.length === 1 ? message('runnerUp.role') : ''
  return message('vsRunnerUp', { lead, nonVoters, phrase: message(`phrase.${rel}`), who, role, value: show(second.votos) })
}

export function headline(r: CityResult | undefined, place: Place): string {
  const voice: Voice = voiceOf(place)
  return drawPhrase(headlineSentence(r, place), voice, template)
}
