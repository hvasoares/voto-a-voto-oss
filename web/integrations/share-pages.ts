import { loadCityShard } from '../src/lib/shard-files'
import { cityTextsOf } from '../src/lib/city-texts-build'
import { shareSheetRecord, type ShareSheetBuild } from '../src/lib/share-sheet-record'
import type { CityRoute } from '../src/lib/city-routes'
import type { PageRecords } from './page-data'

/** The family name of the share sheets' data files: `data/v<fingerprint>/compartilhar/<uf>/<slug>.json`. */
export const SHARE_FAMILY = 'compartilhar'

/**
 * The records of the share family (private#209): one per city route, `<uf>/<slug>`, holding what `shareSheetContent` needs
 * (`lib/share-sheet-record.ts`) and the city's question. The writer of `integrations/page-data.ts` turns them into files; this only reads each city's shard.
 */
export async function sharePageRecords(cities: readonly CityRoute[], build: ShareSheetBuild): Promise<PageRecords[]> {
  return Promise.all(
    cities.map(async ({ uf, slug }) => {
      const data = shareSheetRecord((await loadCityShard(uf, slug))!, build)
      // The build gate of the ready-made texts (#65): the page draws them in the browser, so a text over its limit fails the build here, not on the visitor's screen.
      cityTextsOf(data, build)
      return { path: `${uf}/${slug}`, data }
    }),
  )
}
