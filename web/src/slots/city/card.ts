import type { CityResult } from '../../shared/city-model'
import { DEFAULT_LOCALE, REGISTERS, message, type Register } from '../../lib/sentences/catalog'
import { headline, type Place } from '../../lib/sentences/headline'
import { arcLabel } from '../../lib/sentences/arc'
import { marginLine } from '../../lib/sentences/margin'
import { toLegendRows, toTurnoutBarProps } from '../../shared/city-figures'
import { candidateRow, turnoutBar } from '../../shared/components'
import { html, type Raw } from '../../shared/html'
import { calcLink } from '../../lib/facts/link'
import { noscriptText, questionText, yesNo, type Question } from '../../lib/question'
import '../../lib/sentences/catalog-twin'
import '../../lib/sentences/catalog-register'

/** The address of the fact that explains the figure at an anchor (`lib/facts/gate.ts` `factLinks`): it throws for a figure with no record, so the card cannot print a number without one. */
export type FactLinks = (anchor: string) => string

/** The id of a panel's sentence block: the panel (the card's picture of bars and legend) is described by it. */
export const headlineId = (view: string) => `headline-${view}`

/** The same place told in each register, for the pre-rendered variants (the page shows one; the switch picks). */
const voices = (place: Place) => REGISTERS.map((register) => ({ register, place: { ...place, register } }))

/**
 * The switch between the registers: two toggle buttons in a labelled group. Rendered hidden: without scripts the
 * standard sentence is all there is, and the script that wires it (scripts/city-card.ts) reveals it.
 */
export function registerSwitch(locale = DEFAULT_LOCALE): Raw {
  const voice = { locale, register: 'standard' as Register }
  const choice = (register: Register) => html`<button type="button" class="register__choice" data-register-choice="${register}" aria-pressed="${String(register === 'standard')}">${message(voice, `register.${register}`)}</button>`
  return html`<div class="register" role="group" aria-label="${message(voice, 'register.label')}" data-register-switch hidden>${REGISTERS.map(choice)}</div>`
}

/**
 * What the card shows for one view, in two parts so the desktop layout can put them in two columns (#52): the figures
 * (bars and legend, or the neutral no-data notice) and the words (the register switch and the headline sentence in both
 * registers; CSS shows the one the reader chose and no script is needed for the standard one). On a phone they stack
 * in the old order: bars, legend, switch, sentence.
 */
export function viewFigures(result: CityResult | undefined, place: Place, links: FactLinks): Raw {
  if (!result) return html`${voices(place).map((v) => html`<p class="city-nodata" data-nodata data-register="${v.register}">${headline(undefined, v.place)}</p>`)}`
  return html`<div class="city-figures">${turnoutBar(toTurnoutBarProps(result, { voted: links('votaram'), notVoted: links('naoVotaram') }))}<ul class="legend" aria-label="Legenda">${toLegendRows(result, links).map(candidateRow)}</ul></div>`
}

export function viewSentence(result: CityResult | undefined, place: Place, view: string, links: FactLinks): Raw {
  if (!result) return html``
  const locale = place.locale ?? DEFAULT_LOCALE
  const sentence = voices(place).map(
    (v) => html`<div data-register="${v.register}"><p class="city-headline" data-headline>${headline(result, v.place)}</p><p class="city-headline__note">${message({ locale, register: v.register }, 'headline.note')}</p></div>`,
  )
  return html`${registerSwitch(locale)}<div class="city-sentence" id="${headlineId(view)}" aria-live="polite">${sentence}</div>${calcLink(links('frase'), locale)}`
}

/**
 * The question of the city (#44) and its answer, which opens the page: the question once, then "Sim"/"Não" and the arc label of the city (#41),
 * in both registers, and the line that says it describes the sequence, not the cause. It belongs to the city, not to a view: the same under every
 * cycle and round tab. The answer is in the HTML (visible without scripts and without a guess); the guess buttons are drawn by `scripts/city-guess.ts`.
 */
export function viewQuestion(q: Question, place: Place): Raw {
  const lines = voices(place).map((v) => ({ register: v.register, ...arcLabel(q.arc, { locale: place.locale, register: v.register }) }))
  const voice = { locale: place.locale }
  // The answer starts hidden (#149) and the guess script reveals it; without scripts the CSS (`city.css`, scripting: none) shows it and the hidden note there are no buttons.
  const noscript = html`${voices(place).map((v) => html`<p class="city-q__needs" data-register="${v.register}" hidden>${noscriptText({ locale: voice.locale ?? DEFAULT_LOCALE, register: v.register })}</p>`)}`
  return html`<section class="city-q" data-question="${q.kind}" data-answer="${q.answer ? 'yes' : 'no'}" aria-labelledby="city-q"><h2 class="city-q__q" id="city-q">${questionText(q, place.cityName, voice)}</h2>${noscript}<div class="city-arc" data-arc="${q.kind}" hidden><p class="city-q__yn">${yesNo(q.answer, voice)}.</p>${lines.map((l) => html`<p class="city-arc__pill" data-register="${l.register}">${l.label}</p>`)}${lines.map((l) => html`<p class="city-arc__note" data-register="${l.register}">${l.note}</p>`)}</div></section>`
}

/** The twin city (#31) as the card links it: its display name, the label of its state and the address of its card. */
export interface Twin {
  name: string
  uf: string
  href: string
}

/**
 * The twin line (#31): a link to the closest peer city of another state and, under it, the one-line reason, in both
 * registers. Empty when the city has no twin (overseas posts, a state that holds every comparable city).
 */
export function viewTwin(twin: Twin | undefined, place: Place): Raw {
  if (!twin) return html``
  const locale = place.locale ?? DEFAULT_LOCALE
  const each = (render: (voice: { locale: typeof locale; register: Register }, register: Register) => Raw) => voices(place).map((v) => render({ locale, register: v.register }, v.register))
  const label = each((voice, register) => html`<span data-register="${register}">${message(voice, 'twin.label', { name: twin.name, uf: twin.uf })}</span>`)
  const reason = each((voice, register) => html`<span class="city-twin__reason" data-register="${register}">${message(voice, 'twin.reason')}</span>`)
  return html`<a class="city-twin" href="${twin.href}" data-twin>${label} ›${reason}</a>`
}

/**
 * The margin line (#26) of one view, in both registers: the votes that would have changed the result and how many times
 * that fits in the people who did not vote. Empty when the round has nothing to turn (no data, one candidate).
 */
export function viewMargin(result: CityResult | undefined, place: Place, links: FactLinks): Raw {
  const lines = voices(place).map((v) => ({ register: v.register, text: marginLine(result, v.place) }))
  if (!lines[0]!.text) return html``
  return html`${lines.map((l) => html`<p class="city-margin" data-register="${l.register}" data-margin>${l.text}</p>`)}${calcLink(links('margem'), place.locale)}`
}

/** Both parts in one string: what the card showed before the two columns (the phone order). */
export function viewPanel(result: CityResult | undefined, place: Place, view: string, links: FactLinks): Raw {
  return html`${viewFigures(result, place, links)}${viewSentence(result, place, view, links)}`
}
