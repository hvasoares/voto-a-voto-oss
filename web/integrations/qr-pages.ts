import { cityUrl, siteOrigin } from '../src/lib/share-url'
import { displayName } from '../src/shared/city-search'
import { qrGlyph } from '../src/lib/qr-code'
import { cityQrRecord } from '../src/lib/qr-screen'
import type { CityRoute } from '../src/lib/city-routes'
import type { PageRecords } from './page-data'

/** The family name of the QR pages' data files: `data/v<fingerprint>/qr/<uf>/<slug>.json`. */
export const QR_FAMILY = 'qr'

/**
 * The records of the QR family (private#208): one per city route, `<uf>/<slug>`, holding what `drawQrScreen` needs (`lib/qr-screen.ts`). The
 * writer of `integrations/page-data.ts` turns them into files; this holds only what is the QR's own: the words, the link and the matrix.
 */
export function qrPageRecords(cities: readonly CityRoute[], fixture: boolean, base: string, origin = siteOrigin()): PageRecords[] {
  return cities.map(({ uf, slug, nome }) => ({
    path: `${uf}/${slug}`,
    data: cityQrRecord({ uf, slug, cityName: displayName(nome), fixture, glyph: qrGlyph(cityUrl(origin, base, uf, slug)) }, base),
  }))
}
