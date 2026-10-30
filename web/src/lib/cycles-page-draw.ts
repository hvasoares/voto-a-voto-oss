/**
 * The three-cycles page of a city DRAWN from its shard (private#216, the lighter-site milestone): the markup of the old pre-rendered page, built on the client
 * from `city/<uf>/<slug>.json`, the shard the city card already links (`PageDataDownload`), so no data file of its own is written. Nothing is decided here:
 *  - the numbers and the text of the bars are `buildCycleBlock` (the model) and `roundPanel` (the view), the pure pair the build used, over `cityShardResult`;
 *  - the legend, the switch link and the page's footer are the old page's words and links, unchanged;
 *  - the switching of rounds is `mountCycles` (`scripts/city-cycles.ts`), run on the drawn panels: there is one copy of it.
 * The stub's link back is the old "Cartão da cidade" link; the stub's heading becomes the page's own ("Três ciclos"), its title stays the document's.
 */
import { siteHref } from '@/paths'
import { displayName } from '@/shared/city-search'
import { CYCLES } from '@/shared/city-model'
import { sourceFooter } from '@/shared/footer'
import { esc } from '@/shared/html'
import { cityShardResult, type CityShard } from '@/lib/city-shard'
import { DEFAULT_TURNO, buildCycleBlock } from '@/slots/city-cycles/cycles-model'
import { roundPanel } from '@/slots/city-cycles/cycles-view'

/** The page's content (the panels of both rounds, the legend and the switch link, the footer) as markup. */
export function cyclesPageHtml(shard: CityShard): string {
  const { city } = shard
  const name = displayName(city.nome)
  const here = siteHref(`/${city.uf}/${city.slug}/tres-ciclos/`)
  const panels = ([1, 2] as const).map((turno) =>
    roundPanel({
      turno,
      subtitle: `Presidente 2018, 2022 e 2026 · ${name} (${turno}º turno)`,
      blocks: CYCLES.map((ano) => buildCycleBlock({ ano, turno, city, result: cityShardResult(shard, ano, turno) })),
      hidden: turno !== DEFAULT_TURNO,
    }).toString(),
  )
  const other = DEFAULT_TURNO === 2 ? 1 : 2
  return `<div class="cycles" data-cycles data-turno="${DEFAULT_TURNO}" data-path="${esc(here)}" data-uf="${esc(city.uf)}" data-slug="${esc(city.slug)}" data-name="${esc(name)}">${panels.join('')}</div>
<p class="cycles__legend">O candidato de menor número na urna fica à esquerda, em vermelho; o outro, em azul, em todos os ciclos.</p>
<a class="cycles-switch" href="${esc(here)}?turno=${other}" data-switch data-base="${esc(here)}" data-turno="${other}">Ver o ${other}º turno ›</a>
${sourceFooter({ source: 'Fonte: TSE, dados finais', aboutHref: siteHref('sobre-os-dados/') })}`
}

/** The draw function of the family, for `bootPageData` (`scripts/city-cycles.ts` hands it, with the switching, to the loader). */
export const drawCyclesPage =
  (mount: (host: HTMLElement) => void) =>
  (shard: CityShard, host: HTMLElement): void => {
    host.innerHTML = cyclesPageHtml(shard)
    const heading = host.closest('main')?.querySelector('h1')
    if (heading) heading.textContent = 'Três ciclos'
    // The stub carries the link to the shard (#64) in its area; it goes above the page footer, where the old page had it.
    const download = host.ownerDocument.querySelector('[data-component="page-data"]')
    if (download) host.querySelector('footer')?.before(download)
    mount(host.querySelector<HTMLElement>('[data-cycles]')!)
  }
