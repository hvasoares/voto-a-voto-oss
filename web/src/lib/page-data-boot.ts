/**
 * THE page script's one line of a stub family (private#208, the pilot): finds the stub's area, builds the URL of the page's data file and hands the
 * family's `draw` to the loader (`lib/page-data-loader.ts`, private#207). A family's script is then three lines (see `scripts/qr-page.ts`):
 *
 *     import { SHARD_VERSION } from 'virtual:data-shards'
 *     bootPageData<Record>({ family: 'qr', version: SHARD_VERSION, draw: drawQrScreen })
 *
 * The page's address inside the family (`rj/cidade-exemplo`) is read from `data-page-path` on the `<main>` the stub draws (the family's page passes it
 * as an attribute); the file is `<base>data/v<version>/<family>/<path>.json`, the same path the writer (`integrations/page-data.ts`) wrote.
 */
import { loadPageData } from './page-data-loader'
import { pageDataPath } from '@/shared/page-data'
import { linkHref, siteBase } from '@/paths'

export interface PageDataBoot<T> {
  family: string
  /** The served data version (`SHARD_VERSION` of `virtual:data-shards`). */
  version: string
  draw: (data: T, host: HTMLElement) => void
}

export function bootPageData<T>({ family, version, draw }: PageDataBoot<T>): Promise<void> {
  const area = document.querySelector<HTMLElement>('[data-stub-area]')
  const path = document.querySelector<HTMLElement>('[data-page-path]')?.dataset.pagePath
  if (!area || !path) return Promise.resolve()
  return loadPageData<T>({ area, url: linkHref(`data/${pageDataPath(version, family, path)}`, siteBase()), family, path, draw })
}
