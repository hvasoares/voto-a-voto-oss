import type { CityResult } from '../../shared/city-model'
import { DEFAULT_LOCALE, REGISTERS, message, type Register } from '../../lib/sentences/catalog'
import { headline, type Place } from '../../lib/sentences/headline'
import { toLegendRows, toTurnoutBarProps } from '../../shared/city-figures'
import { candidateRow, turnoutBar } from '../../shared/components'
import { html, type Raw } from '../../shared/html'

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
 * What the card shows for one view: bars, legend, the register switch and the headline sentence in both registers
 * (CSS shows the one the reader chose; no script is needed for the standard one), or the neutral no-data notice.
 */
export function viewPanel(result: CityResult | undefined, place: Place, view: string): Raw {
  const locale = place.locale ?? DEFAULT_LOCALE
  if (!result) return html`${voices(place).map((v) => html`<p class="city-nodata" data-nodata data-register="${v.register}">${headline(undefined, v.place)}</p>`)}`
  const sentence = voices(place).map(
    (v) => html`<div data-register="${v.register}"><p class="city-headline" data-headline>${headline(result, v.place)}</p><p class="city-headline__note">${message({ locale, register: v.register }, 'headline.note')}</p></div>`,
  )
  return html`${turnoutBar(toTurnoutBarProps(result))}<ul class="legend" aria-label="Legenda">${toLegendRows(result).map(candidateRow)}</ul>${registerSwitch(locale)}<div class="city-sentence" id="${headlineId(view)}" aria-live="polite">${sentence}</div>`
}
