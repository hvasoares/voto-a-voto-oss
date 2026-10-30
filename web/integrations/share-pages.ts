import { loadCityShard } from '../src/lib/shard-files'
import { shareSheetRecord, type ShareSheetBuild } from '../src/lib/share-sheet-record'
import type { CityRoute } from '../src/lib/city-routes'
import type { PageRecords } from './page-data'

/** The family name of the share sheets' data files: `data/v<fingerprint>/compartilhar/<uf>/<slug>.json`. */
export const SHARE_FAMILY = 'compartilhar'

/**
 * The records of the share family (private#209): one per city route, `<uf>/<slug>`, holding what `shareSheetContent` needs
 * (`lib/share-sheet-record.ts`). The writer of `integrations/page-data.ts` turns them into files; this only reads each city's shard.
 */
export async function sharePageRecords(cities: readonly CityRoute[], build: ShareSheetBuild): Promise<PageRecords[]> {
  return Promise.all(
    cities.map(async ({ uf, slug }) => ({ path: `${uf}/${slug}`, data: shareSheetRecord((await loadCityShard(uf, slug))!, build) })),
  )
}
