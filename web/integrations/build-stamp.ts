/**
 * Writes the build stamp of ticket #108: after every `astro build`, `.build-stamps/<OUT_DIR basename>.json`
 * records the inputs the build consumed (source hash, base, mode, dataset, donation, outDir, timestamp), so a
 * later E2E_PREBUILT=1 run can tell whether the existing output still matches the tree. The folder sits
 * outside the output directory and is git-ignored.
 */
import type { AstroIntegration } from 'astro'
import { fileURLToPath } from 'node:url'
import { stampInputs, writeStamp } from '../scripts/build-stamp'

export function buildStamp(): AstroIntegration {
  let root = ''
  return {
    name: 'voto-build-stamp',
    hooks: {
      'astro:config:setup': ({ config }) => {
        root = fileURLToPath(config.root)
      },
      'astro:build:done': () => {
        const env = process.env
        // BUILD_TARGET unset is the local bundle — the same normalization cdn.ts applies.
        const mode = env.BUILD_TARGET === 'production' ? 'production' : 'local'
        const outDir = env.OUT_DIR ?? 'dist'
        writeStamp(root, { ...stampInputs(env, root, mode, outDir), builtAt: new Date().toISOString() })
      },
    },
  }
}
