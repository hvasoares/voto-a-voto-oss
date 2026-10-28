/** The optional guess of the city page (#44), loaded by `city-card.ts` after the page is ready: two buttons ("Sim", "Não") before the answer, the match
 * after a tap. The answer is already in the page (`data-answer`), so nothing is fetched and nothing leaves the browser: the guess goes to the
 * browser's own storage (`lib/guess-store.ts`) and nowhere else. Imports the guess words' data file only, not the catalog (the city page's script stays small). Browser only. */
import { browserStorage, readGuess, saveGuess, type Guess } from '@/lib/guess-store'
import { GUESS_STANDARD as SAY } from '@/lib/sentences/catalog-guess'

const fill = (tpl: string, params: Record<string, string>) => tpl.replace(/\{(\w+)\}/g, (_, k: string) => params[k] ?? '')
const label = (g: Guess) => SAY[g === 'yes' ? 'question.yes' : 'question.no']!

export function mountGuess(box: HTMLElement, city: string): void {
  const answer = (box.dataset.answer === 'yes' ? 'yes' : 'no') as Guess
  const storage = browserStorage()
  let guess = readGuess(city, storage)

  const wrap = document.createElement('div')
  wrap.className = 'city-q__guess'
  const note = Object.assign(document.createElement('p'), { className: 'city-arc__note' })
  const group = document.createElement('div')
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', SAY['question.guess.group']!)
  const result = Object.assign(document.createElement('p'), { className: 'city-margin', hidden: true })
  result.setAttribute('role', 'status')
  const buttons = (['yes', 'no'] as const).map((g) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'city-q__btn', textContent: label(g) })
    b.dataset.guess = g
    b.addEventListener('click', () => {
      guess = guess === g ? undefined : g
      saveGuess(city, guess, storage)
      show()
    })
    group.append(b)
    return b
  })
  const show = () => {
    for (const b of buttons) b.setAttribute('aria-pressed', String(b.dataset.guess === guess))
    box.dataset.guess = guess ?? ''
    result.hidden = !guess
    result.textContent = guess ? fill(SAY[guess === answer ? 'question.guess.right' : 'question.guess.wrong']!, { guess: label(guess), answer: label(answer) }) : ''
    note.textContent = SAY[guess ? 'question.guess.undo' : 'question.guess.note']!
  }
  wrap.append(note, group, result)
  box.querySelector('.city-q__q')?.after(wrap)
  show()
  box.dataset.guessReady = 'true'
}
