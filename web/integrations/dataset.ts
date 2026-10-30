import type { AstroIntegration } from 'astro'
import { resolve } from 'node:path'
import { writeEditions } from './editions'
import { generateShards, shardsModule } from './shards'
import { copyNerdsShards } from './nerds-shards'
import { writePageData } from './page-data'
import { QR_FAMILY, qrPageRecords } from './qr-pages'
import { SHARE_FAMILY, sharePageRecords } from './share-pages'
import { siteOrigin } from '../src/lib/share-url'
import { currentEdition } from '../src/lib/editions-load'
import { loadCityRoutes } from '../src/lib/city-routes'
import { datasetFixture } from '../src/lib/shard-files'
import { normalizeBase } from '../src/paths'

/**
 * The dataset side of the build: writes the shards of the chosen dataset under `public/data` (wiping older
 * version directories and the previously copied CSVs) and exports the `virtual:data-shards` plugin so page and
 * client code agree on the served version. The chosen DATA_DIR has to hold all five dataset files —
 * generateShards fails the build with the path when one is missing.
 */
export function dataset(): AstroIntegration {
  return {
    name: 'voto-dataset',
    hooks: {
      'astro:config:setup': async ({ config }) => {
        const root = new URL(config.root).pathname
        const fingerprint = generateShards(resolve(root, 'public/data'), process.env, root)
        copyNerdsShards(resolve(root, 'public/data'), fingerprint, process.env, root)
        // The editions (#59) are served beside the shards: committed in editions/, copied unchanged.
        writeEditions(resolve(root, 'public'))
        // The per-page data files (private#205): one writer, each family supplies only its records. The QR family is the pilot (private#208);
        // the next families add a line here.
        const cities = await loadCityRoutes()
        const fixture = await datasetFixture()
        const base = normalizeBase(config.base)
        writePageData(resolve(root, 'public/data'), fingerprint, QR_FAMILY, qrPageRecords(cities, fixture, base))
        // The share sheet's family (private#209): the picture's inputs and the message numbers; the page is not changed yet.
        const build = { origin: siteOrigin(), base, fixture, edition: (await currentEdition()).id }
        writePageData(resolve(root, 'public/data'), fingerprint, SHARE_FAMILY, await sharePageRecords(cities, build))
      },
    },
  }
}

export { shardsModule }