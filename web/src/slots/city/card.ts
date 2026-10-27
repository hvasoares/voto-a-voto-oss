import type { CityResult } from '../../shared/city-model'
import { takeaway } from '../../shared/takeaway'
import { toLegendRows, toTurnoutBarProps } from '../../shared/city-figures'
import { candidateRow, turnoutBar } from '../../shared/components'
import { html, type Raw } from '../../shared/html'

/** What the card shows for one view: bars, legend and the takeaway sentence, or the neutral no-data notice. */
export function viewPanel(result: CityResult | undefined, cityName: string): Raw {
  if (!result) return html`<p class="city-nodata" data-nodata>Sem dados nesse ciclo.</p>`
  return html`${turnoutBar(toTurnoutBarProps(result))}<ul class="legend" aria-label="Legenda">${toLegendRows(result).map(candidateRow)}</ul><p class="city-takeaway">${takeaway(result, cityName)}</p>`
}
