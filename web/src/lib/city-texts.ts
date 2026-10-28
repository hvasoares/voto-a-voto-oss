/**
 * The ready-made texts of one city (#65), PURE: the WhatsApp/SMS block (the card's headline, the turnout line, the margin line, the source and the short link)
 * and the read-aloud bulletin of about 90 seconds (every number spelled in words). The wording is the catalog's (`text.*`, plus `headline()` and `marginLine()`);
 * this file decides which sentence applies and fills the slots. No cause, no adjective, no winner label. Build checks: `textProblems()` (used by the
 * `check:texts` script and the tests).
 */
import type { CandidateTally, CityResult } from '@/shared/city-model'
import { DEFAULT_LOCALE, DEFAULT_REGISTER, message as say, type Locale, type MessageKey, type Register } from './sentences/catalog'
import './sentences/catalog-texts'
import { headline } from './sentences/headline'
import { marginLine, marginVotes } from './sentences/margin'
import { spell, spellPercent } from './number-words'

/** The block must fit one WhatsApp message and a short chain of SMS; the build fails above this many characters. */
export const WHATSAPP_LIMIT = 700
/** About 90 seconds at a read-aloud pace of 140 to 170 words a minute. */
export const BULLETIN_WORDS = { min: 90, max: 260 } as const

export interface CityTextsInput {
  result: CityResult | undefined
  cityName: string
  /** `RJ`, or `Exterior`. */
  ufLabel: string
  overseas?: boolean
  /** The city page's full address, scheme included. */
  url: string
  edition: { date: string }
  fixture: boolean
  /** The cycle and round asked for when the city has no data in it. */
  ano: number
  turno: 1 | 2
  register?: Register
  locale?: Locale
}

const sayer = (i: CityTextsInput) => {
  const voice = { locale: i.locale ?? DEFAULT_LOCALE, register: i.register ?? DEFAULT_REGISTER }
  return (key: string, params: Record<string, string | number> = {}, count?: number) => say(voice, key as MessageKey, params, count)
}

const round1 = (x: number) => Math.round(x * 10) / 10

function dateWords(iso: string, say: ReturnType<typeof sayer>, spelled: boolean): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const month = say('text.months').split('|')[m - 1]!
  return say('text.date', spelled ? { day: spell(d), month, year: spell(y) } : { day: d, month, year: y })
}

export function whatsappText(i: CityTextsInput): string {
  const say = sayer(i)
  const place = { cityName: i.cityName, overseas: i.overseas, register: i.register, locale: i.locale }
  const r = i.result
  const int = (n: number) => new Intl.NumberFormat(i.locale ?? DEFAULT_LOCALE).format(n)
  const pct = (x: number) => `${new Intl.NumberFormat(i.locale ?? DEFAULT_LOCALE, { maximumFractionDigits: 1 }).format(round1(x))}%`
  // "Votaram" and "não votaram" are the card's own split of the electorate: valid votes against everyone else (absences, blank and null votes).
  const turnout = r && r.aptos > 0 ? say('text.wa.turnout', { voted: int(r.validos), aptos: int(r.aptos), votedShare: pct(r.votedShare), not: int(r.naoVotaram), notShare: pct(r.notVotedShare) }) : ''
  const source = i.fixture ? say('text.wa.source.fixture') : say('text.wa.source', { date: dateWords(i.edition.date, say, false) })
  return [headline(r, place), turnout, marginLine(r, place), source, i.url].filter(Boolean).join('\n')
}

/** `Candidato nº 5` (a name the data does not have) is read as words too. */
function readableName(c: CandidateTally, say: ReturnType<typeof sayer>): string {
  return /^Candidat[oa] nº \d+$/.test(c.nome) ? say('text.candidate.fallback', { n: spell(c.numero) }) : c.nome.replace(/\d+/g, (d) => spell(Number(d)))
}

export function radioBulletin(i: CityTextsInput): string {
  const say = sayer(i)
  const r = i.result
  const turno = say(`text.radio.round.${i.turno}`)
  const open = i.overseas
    ? say('text.radio.open.overseas', { turno, ano: spell(i.ano), city: i.cityName })
    : say('text.radio.open', { turno, ano: spell(i.ano), city: i.cityName, uf: i.ufLabel })
  const source = i.fixture ? say('text.radio.source.fixture') : say('text.radio.source', { date: dateWords(i.edition.date, say, true) })
  if (!r || r.aptos <= 0) return [open, say('text.radio.noData', { turno, ano: spell(i.ano) }), source, say('text.radio.limits'), say('text.radio.close')].join(' ')

  const parts = [open, say('text.radio.electorate', { aptos: spell(r.aptos) })]
  const not = r.naoVotaram
  if (r.comparecimento <= 0) parts.push(say('text.radio.nobody'))
  else parts.push(say('text.radio.turnout', { voted: spell(r.validos), votedShare: spellPercent(r.votedShare), not: spell(not), notShare: spellPercent(r.notVotedShare) }))
  if (r.validos > 0) {
    const [first, second] = r.ranking
    const shown = [first, second].filter((c): c is CandidateTally => !!c && c.votos > 0)
    for (const c of shown) parts.push(say('text.radio.candidate', { name: readableName(c, say), votes: spell(c.votos), share: spellPercent((c.votos / r.validos) * 100) }))
    const rest = r.validos - shown.reduce((n, c) => n + c.votos, 0)
    if (rest > 0 && shown.length) parts.push(say('text.radio.others', { votes: spell(rest), share: spellPercent((rest / r.validos) * 100) }))
    const margin = marginVotes(r)
    if (margin !== undefined) {
      if (margin === 0) parts.push(say('text.radio.margin.tie'))
      else {
        let line = say('text.radio.margin.gap', { n: spell(margin) }, margin)
        if (not > 0) line += margin > not ? say('text.radio.margin.exceeds') : say('text.radio.margin.fits', { times: spell(Math.floor(not / margin)) }, Math.floor(not / margin))
        parts.push(line)
      }
    }
  }
  parts.push(source, say('text.radio.limits'), say('text.radio.close'))
  return parts.join(' ')
}

/** What the build checks; empty means the two texts pass. */
export function textProblems(whatsapp: string, bulletin: string, o: { hasData: boolean } = { hasData: true }): string[] {
  const problems: string[] = []
  if (whatsapp.length > WHATSAPP_LIMIT) problems.push(`whatsapp-too-long: ${whatsapp.length} > ${WHATSAPP_LIMIT}`)
  if (/\{\w+\}/.test(whatsapp) || /\{\w+\}/.test(bulletin)) problems.push('unfilled-slot')
  const digits = bulletin.match(/\d+/g)
  if (digits) problems.push(`bulletin-digits: ${digits.slice(0, 3).join(' ')}`)
  if (/%/.test(bulletin)) problems.push('bulletin-percent-sign')
  const words = bulletin.split(/\s+/).filter(Boolean).length
  if ((o.hasData && words < BULLETIN_WORDS.min) || words > BULLETIN_WORDS.max) problems.push(`bulletin-length: ${words} words, expected ${BULLETIN_WORDS.min}..${BULLETIN_WORDS.max}`)
  return problems
}
