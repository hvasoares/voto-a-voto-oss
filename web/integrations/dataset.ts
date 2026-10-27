import type { AstroIntegration } from 'astro'
import { resolve } from 'node:path'
import { writeEditions } from './editions'
import { generateShards, shardsModule } from './shards'

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
      'astro:config:setup': ({ config }) => {
        const root = new URL(config.root).pathname
        generateShards(resolve(root, 'public/data'), process.env, root)
        // The editions (#59) are served beside the shards: committed in editions/, copied unchanged.
        writeEditions(resolve(root, 'public'))
      },
    },
  }
}

export { shardsModule }