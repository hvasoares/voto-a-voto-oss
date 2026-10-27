import type { AstroIntegration } from 'astro'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { dataDir } from '../src/lib/data-dir'

/** Files the browser may fetch. Today only the search needs cities.csv; ticket #49 replaces this with JSON shards. */
export const BROWSER_DATA_FILES = ['cities.csv', 'manifest.json'] as const

/** Copies the browser-visible part of the chosen dataset to public/data (gitignored) so dev and build serve it at <base>data/. */
export function dataset(): AstroIntegration {
  return {
    name: 'voto-dataset',
    hooks: {
      'astro:config:setup': ({ config }) => {
        const root = new URL(config.root).pathname
        const from = dataDir(process.env, root)
        const to = resolve(root, 'public/data')
        mkdirSync(to, { recursive: true })
        for (const f of BROWSER_DATA_FILES) {
          if (!existsSync(resolve(from, f))) throw new Error(`DATA_DIR ${from} is missing ${f}`)
          copyFileSync(resolve(from, f), resolve(to, f))
        }
      },
    },
  }
}
