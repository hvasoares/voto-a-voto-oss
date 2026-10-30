/** The three-cycle page (private#216): the stub loads the city's shard (`city/<uf>/<slug>.json`, the one the city card links), draws both rounds and wires the switching. A visitor without scripts has the stub's sentence and the link back. */
import { SHARD_VERSION } from 'virtual:data-shards'
import { cityDataPath } from '@/lib/api'
import { bootPageData } from '@/lib/page-data-boot'
import { checkCityShard, type CityShard } from '@/lib/city-shard'
import { drawCyclesPage } from '@/lib/cycles-page-draw'
import { mountCycles } from '@/lib/cycles-mount'

const address = document.querySelector<HTMLElement>('[data-page-path]')?.dataset.pagePath ?? ''
const [uf = '', slug = ''] = address.split('/')
void bootPageData<CityShard>({
  family: 'tres-ciclos',
  version: SHARD_VERSION,
  draw: drawCyclesPage(mountCycles),
  source: { file: (version) => cityDataPath(version, uf, slug), check: (json) => checkCityShard(json, address) },
})
