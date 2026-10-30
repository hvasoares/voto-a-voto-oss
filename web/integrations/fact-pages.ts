import { loadFactPages } from '../src/lib/facts/pages'
import { factPageRecord } from '../src/lib/facts/page-record'
import { currentEdition } from '../src/lib/editions-load'
import type { PageRecords } from './page-data'

/** The family name of the calculation pages' data files: `data/v<fingerprint>/fato/<scope>/<page>.json`. */
export const FACT_FAMILY = 'fato'

/**
 * The records of the calculation pages (private#212): one per `/fato/...` page, `<scope>/<page>`. They come from `loadFactPages`, the call that runs
 * `assertPublishable` and makes the seal, so a record that fails the gate fails the build before any file is written. The writer of
 * `integrations/page-data.ts` turns them into files.
 */
export async function factPageRecords(): Promise<PageRecords[]> {
  const { id, date } = await currentEdition()
  return (await loadFactPages()).map((p) => ({ path: `${p.scope}/${p.page}`, data: factPageRecord(p, { id, date }) }))
}
