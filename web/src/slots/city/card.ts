import type { CityResult } from '../../shared/city-model'
import { DEFAULT_LOCALE, message } from '../../lib/sentences/catalog'
import { CARD_REGISTER } from '../../lib/sentences/register'
import { headline, type Place } from '../../lib/sentences/headline'
import { arcLabel } from '../../lib/sentences/arc'
import { marginLine } from '../../lib/sentences/margin'
import { toLegendRows, toTurnoutBarProps } from '../../shared/city-figures'
import { candidateRow, turnoutBar } from '../../shared/components'
import { html, type Raw } from '../../shared/html'
import { noscriptText, questionText, yesNo, type Question } from '../../lib/question'
import '../../lib/sentences/catalog-twin'
import { messageHtml } from '../../lib/sentences/markup'
import { placeLinkHtml } from '../../lib/place-link'

/** The id of a panel's sentence block: the panel (the card's picture of bars and legend) is described by it. */
export const headlineId = (view: string) => `headline-${view}`

/** The place as the card tells it: always in plain language (#157). */
const plainPlace = (place: Place): Place => ({ ...place, register: CARD_REGISTER })

/**
 * What the card shows for one view, in two parts so the desktop layout can put them in two columns (#52): the figures
 * (bars and legend, or the neutral no-data notice) and the words (the headline sentence, in plain language). On a phone they stack
 * in the old order: bars, legend, sentence.
 */
export function viewFigures(result: CityResult | undefined, place: Place): Raw {
  if (!result) return html`<p class="city-nodata" data-nodata>${headline(undefined, plainPlace(place))}</p>`
  return html`<div class="city-figures">${turnoutBar(toTurnoutBarProps(result))}<ul class="legend" aria-label="Legenda">${toLegendRows(result).map(candidateRow)}</ul></div>`
}

export function viewSentence(result: CityResult | undefined, place: Place, view: string): Raw {
  if (!result) return html``
  const locale = place.locale ?? DEFAULT_LOCALE
  const sentence = html`<p class="city-headline" data-headline>${headline(result, plainPlace(place))}</p><p class="city-headline__note">${message({ locale, register: CARD_REGISTER }, 'headline.note')}</p>`
  return html`<div class="city-sentence" id="${headlineId(view)}" aria-live="polite">${sentence}</div>`
}

/**
 * The question of the city (#44) and its answer, which opens the page: the question once, then "Sim"/"Não" and the arc label of the city (#41),
 * in plain language, and the line that says it describes the sequence, not the cause. It belongs to the city, not to a view: the same under every
 * cycle and round tab. The answer is in the HTML (visible without scripts and without a guess); the guess buttons are drawn by `scripts/city-guess.ts`.
 */
export function viewQuestion(q: Question, place: Place): Raw {
  const line = arcLabel(q.arc, { locale: place.locale, register: CARD_REGISTER })
  const voice = { locale: place.locale }
  // The answer starts hidden (#149) and the guess script reveals it; without scripts the CSS (`city.css`, scripting: none) shows it and the hidden note there are no buttons.
  const noscript = html`<p class="city-q__needs" hidden>${noscriptText({ locale: voice.locale ?? DEFAULT_LOCALE, register: CARD_REGISTER })}</p>`
  return html`<section class="city-q" data-question="${q.kind}" data-answer="${q.answer ? 'yes' : 'no'}" aria-labelledby="city-q"><h2 class="city-q__q" id="city-q">${questionText(q, place.cityName, voice)}</h2>${noscript}<div class="city-arc" data-arc="${q.kind}" hidden><p class="city-q__yn">${yesNo(q.answer, voice)}.</p><p class="city-arc__pill">${line.label}</p><p class="city-arc__note">${line.note}</p></div></section>`
}

/** The twin city (#31) as the card links it: its display name, its state (the lower-case UF code) and the address of its card. */
export interface Twin {
  name: string
  uf: string
  href: string
}

/**
 * The twin line (#31): the closest peer city of another state and, under it, the one-line reason, in plain language. The city is a link to its card and, separately, its
 * state is a link to the state page (#184); the sentence is the catalog's, with the two links in its slots. Empty when the city has no twin (overseas posts, a state that holds every comparable city).
 */
export function viewTwin(twin: Twin | undefined, place: Place): Raw {
  if (!twin) return html``
  const locale = place.locale ?? DEFAULT_LOCALE
  const voice = { locale, register: CARD_REGISTER }
  const label = messageHtml(voice, 'twin.label', { name: html`<a class="city-twin__city" href="${twin.href}" data-twin-city>${twin.name}</a>`, uf: placeLinkHtml({ kind: 'uf', uf: twin.uf }, { text: `${twin.uf.toUpperCase()} ›` }) })
  return html`<p class="city-twin" data-twin><span>${label}</span><span class="city-twin__reason">${message(voice, 'twin.reason')}</span></p>`
}

/**
 * The margin line (#26) of one view, in plain language: the votes that would have changed the result and how many times
 * that fits in the people who did not vote. Empty when the round has nothing to turn (no data, one candidate).
 */
export function viewMargin(result: CityResult | undefined, place: Place): Raw {
  const text = marginLine(result, plainPlace(place))
  if (!text) return html``
  return html`<p class="city-margin" data-margin>${text}</p>`
}

/** Both parts in one string: what the card showed before the two columns (the phone order). */
export function viewPanel(result: CityResult | undefined, place: Place, view: string): Raw {
  return html`${viewFigures(result, place)}${viewSentence(result, place, view)}`
}
