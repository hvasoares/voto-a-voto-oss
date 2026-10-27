import type { CityResult } from '../../shared/city-model'
import { DEFAULT_LOCALE, message } from '../../lib/sentences/catalog'
import { headline, type Place } from '../../lib/sentences/headline'
import { toLegendRows, toTurnoutBarProps } from '../../shared/city-figures'
import { candidateRow, turnoutBar } from '../../shared/components'
import { html, type Raw } from '../../shared/html'

/** The id of a panel's headline: the panel (the card's picture of bars and legend) is described by that sentence. */
export const headlineId = (view: string) => `headline-${view}`

/** What the card shows for one view: bars, legend and the headline sentence, or the neutral no-data notice. */
export function viewPanel(result: CityResult | undefined, place: Place, view: string): Raw {
  const id = headlineId(view)
  if (!result) return html`<p class="city-nodata" data-nodata>${headline(undefined, place)}</p>`
  return html`${turnoutBar(toTurnoutBarProps(result))}<ul class="legend" aria-label="Legenda">${toLegendRows(result).map(candidateRow)}</ul><p class="city-headline" id="${id}" data-headline>${headline(result, place)}</p><p class="city-headline__note">${message(place.locale ?? DEFAULT_LOCALE, 'headline.note')}</p>`
}
