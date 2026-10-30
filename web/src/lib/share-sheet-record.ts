/**
 * The share sheet of a city as DATA (private#209, the lighter-site milestone): what `data/v<fingerprint>/compartilhar/<uf>/<slug>.json` holds, and
 * the one function that turns it back into the sheet's content.
 *
 *  - `ShareSheetRecord`   the inputs of `shareContent` (`share-model.ts`) for the city's default view: the card's numbers (the `CityResult` the
 *                         city card shows, untouched), the city's names and the build's address, base, fixture flag and edition. No sentence is
 *                         stored: the headline, the message and the picture's words are drawn from the catalog when the record is read;
 *  - `shareSheetRecord`   PURE, build time: the record from the city's shard (the writer in `integrations/share-pages.ts` calls it, so the default view
 *                         and its numbers are chosen once);
 *  - `shareSheetContent`  the record read back: the same `ShareContent` (picture, message, address, file name) the page prints today, by the one
 *                         builder `shareContent`; the parity test pins the SVG string.
 * Since private#210 it also carries what the stub page draws besides the picture: the city's question (the guess card) and the edition's date (the
 * ready-made texts); the sentences of the sheet are still all drawn from the catalog. No file system, no fetch: it runs in Node and in the browser.
 */
import type { CityResult } from '@/shared/city-model'
import { cityShardResult, type CityShard } from './city-shard'
import { shareContent, type ShareContent } from './share-model'
import { defaultView } from '@/slots/city/city-view'
import { pickQuestion, type Question } from './question'

export interface ShareSheetRecord {
  uf: string
  slug: string
  /** The city's name as the shard has it (`displayName` is applied by `shareContent`). */
  nome: string
  /** The view the page pre-renders; the other views come from the city's own shard. */
  view: { ano: number; turno: 1 | 2 }
  /** The numbers of that view; null when the city has no data in it (the catalog's `noData`). */
  result: CityResult | null
  origin: string
  base: string
  fixture: boolean
  edition: string
  /** `edition.date` (YYYY-MM-DD): the "Textos prontos" block dates its source line with it (`cityTextsOf`). */
  editionDate: string
  /** The city's question (#44): with a guess kept in this browser the sheet draws the guess card instead of the bars. */
  question: Question
}

export type ShareSheetBuild = Pick<ShareSheetRecord, 'origin' | 'base' | 'fixture' | 'edition' | 'editionDate'>

export function shareSheetRecord(shard: CityShard, build: ShareSheetBuild): ShareSheetRecord {
  const { uf, slug, nome } = shard.city
  const view = defaultView((ano, turno) => !!cityShardResult(shard, ano, turno))
  return { uf, slug, nome, view, result: cityShardResult(shard, view.ano, view.turno) ?? null, question: pickQuestion(shard), ...build }
}

export function shareSheetContent({ uf, slug, nome, result, origin, base, fixture, edition }: ShareSheetRecord): ShareContent | null {
  return result ? shareContent(result, { uf, slug, nome }, { origin, base, fixture, edition }) : null
}
