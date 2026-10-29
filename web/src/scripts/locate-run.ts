/** The tap on "Usar minha localização", loaded only then (dynamic import from home-locate.ts): ask, find, open or explain. */
import { loadCentroids } from '@/lib/centroids-data'
import { findMyCity } from '@/lib/locate-flow'
import { LOCATE_MESSAGES } from '@/lib/locate-messages'
import { linkHref } from '@/paths'

export async function run(button: HTMLButtonElement, status: HTMLElement, base: string): Promise<void> {
  button.disabled = true
  button.setAttribute('aria-busy', 'true')
  status.hidden = false
  status.textContent = LOCATE_MESSAGES.searching
  const outcome = await findMyCity({ geolocation: navigator.geolocation, loadShard: () => loadCentroids(base) })
  if (outcome.status === 'found') {
    // Opens the city; nothing is saved (only a pick on Home saves a place, #35).
    location.assign(linkHref(`/${outcome.uf}/${outcome.slug}/`, base))
    return
  }
  button.disabled = false
  button.removeAttribute('aria-busy')
  status.textContent = outcome.status === 'unsupported' ? LOCATE_MESSAGES.unavailable : LOCATE_MESSAGES[outcome.status]
}
