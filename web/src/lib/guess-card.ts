/**
 * The guess card (#45), PURE: the share content of a city when the visitor guessed its question (#44). The same share content as the normal card (picture, text alternative per register,
 * message text, short address, file name), with the question, the result of the guess and the answer where the bars were. The card never shows a guess the visitor did not make: with
 * no guess the caller uses `shareContent` (the normal card), and this function needs the guess to exist. The words are the catalog's (`guess.card.*`, `question.*`).
 */
import type { City } from '@/data'
import { displayName, ufLabel } from '@/shared/city-search'
import { shareCardSvg } from './share-card'
import type { Guess } from './guess-store'
import { questionText, yesNo, type Question } from './question'
import { arcLabel } from './sentences/arc'
import { DEFAULT_LOCALE, message, REGISTERS, type MessageKey, type Register } from './sentences/catalog'
import type { ShareContent, ShareContentOptions } from './share-model'
import { shortAddress } from './share-text'
import { cityUrl } from './share-url'

/** The sentence that says whether the guess matched the data (the same words as under the buttons on the city page). */
export function guessResult(q: Question, guess: Guess, register: Register = 'standard'): string {
  const voice = { locale: DEFAULT_LOCALE, register }
  const key = (guess === 'yes') === q.answer ? 'question.guess.right' : 'question.guess.wrong'
  return message(voice, key as MessageKey, { guess: yesNo(guess === 'yes', voice), answer: yesNo(q.answer, voice) })
}

export function guessContent(q: Question, guess: Guess, city: Pick<City, 'uf' | 'slug' | 'nome'>, o: ShareContentOptions): ShareContent {
  const url = cityUrl(o.origin, o.base, city.uf, city.slug)
  const address = shortAddress(url)
  const name = displayName(city.nome)
  const locale = o.locale ?? DEFAULT_LOCALE
  const right = (guess === 'yes') === q.answer
  const std = { locale, register: 'standard' as const }
  const variants = Object.fromEntries(
    REGISTERS.map((register) => {
      const question = questionText(q, name, { locale, register })
      const result = guessResult(q, guess, register)
      return [register, { alt: `${question} ${result} ${arcLabel(q.arc, { locale, register }).label}.`, text: message({ locale, register }, 'guess.card.share' as MessageKey, { question, result, url }) }]
    }),
  ) as ShareContent['variants']
  const card = {
    sub: message(std, 'guess.card.sub' as MessageKey, { uf: ufLabel(city.uf) }),
    question: questionText(q, name, std),
    result: message(std, (right ? 'guess.card.right' : 'guess.card.wrong') as MessageKey, { guess: yesNo(guess === 'yes', std) }),
    answer: message(std, 'guess.card.answer' as MessageKey, { answer: yesNo(q.answer, std), label: arcLabel(q.arc, std).label }),
  }
  const empty = { ano: 2026, turno: 2 as const, aptos: 0, validos: 0, votedPct: 0, notVotedPct: 0, voted: [], notVoted: [] }
  const svg = shareCardSvg(empty, { cityName: name, ufLabel: ufLabel(city.uf), alt: variants.standard.alt, address, fixture: o.fixture, width: o.width, height: o.height, locale, guess: card })
  return { svg, text: variants.standard.text, variants, url, address, filename: `voto-a-voto-${city.uf}-${city.slug}-palpite.png` }
}

