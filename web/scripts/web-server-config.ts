/**
 * The E2E webServer decision (ticket #108), kept pure so vitest covers every refusal without a build on
 * disk: `webServerConfig` gets the environment, the build stamp the caller read (or null) and the inputs the
 * caller recomputed from the working tree, and returns the command + timeout — or `error` when the run must
 * refuse to start. The default path (no switch) is byte-for-byte what it has always been; the test in
 * web-server-config.test.ts locks that string.
 *
 * No fs, no clock here: the caller (`playwright.config.ts`) reads the stamp and hashes the tree.
 */

/** What every `astro build` records in `.build-stamps/<OUT_DIR basename>.json` (see scripts/build-stamp.ts). */
export interface BuildStamp {
  /** SHA-256 over the sorted paths and contents of the build's source inputs. */
  sourceHash: string
  /** SITE_BASE, default `/`. */
  base: string
  /** BUILD_TARGET, normalized: `local` or `production`. */
  mode: string
  /** Resolved absolute DATA_DIR. */
  dataDir: string
  /** SHA-256 over the dataset's fingerprint files. */
  dataHash: string
  /** `unset`, or the SHA-256 of PUBLIC_DONATION_URL. */
  donation: string
  /** OUT_DIR as configured (e.g. `dist`); the stamp file is its basename. */
  outDir: string
  /** ISO timestamp of the build. */
  builtAt: string
}

/** The same fields recomputed from the current environment and tree, plus whether the output folder exists. */
export type CurrentInputs = Omit<BuildStamp, 'builtAt'> & { outputExists: boolean }

export interface WebServerDecision {
  command: string
  timeout: number
  /** Set when the run must refuse to start: the caller throws with this message. */
  error?: string
}

export const serveCommand = (outDir: string) => `OUT_DIR=${outDir} npx tsx scripts/serve.ts`
export const buildCommand = (outDir: string, mode: string) => `OUT_DIR=${outDir} BUILD_TARGET=${mode} npx astro build && ${serveCommand(outDir)}`

// The default build is slow (the real-data variant takes ~5 min); serving an existing build boots in seconds.
export const BUILD_TIMEOUT = 600_000
export const PREBUILT_TIMEOUT = 60_000

export function webServerConfig(
  env: Record<string, string | undefined>,
  stamp: BuildStamp | null,
  current: CurrentInputs | null,
): WebServerDecision {
  const mode = env.E2E_MODE === 'production' ? 'production' : 'local'
  const outDir = mode === 'production' ? 'dist-production' : 'dist'
  const refuse = (error: string): WebServerDecision => ({ command: serveCommand(outDir), timeout: PREBUILT_TIMEOUT, error })

  const prebuilt = env.E2E_PREBUILT
  if (prebuilt === undefined || prebuilt === '') return { command: buildCommand(outDir, mode), timeout: BUILD_TIMEOUT }
  if (prebuilt !== '1' && prebuilt !== 'force') return refuse(`E2E_PREBUILT must be 1 or force (got "${prebuilt}")`)
  if (stamp === null || current === null || !current.outputExists)
    return refuse(`no prebuilt site at ${outDir}: run "npm run build" first, or unset E2E_PREBUILT`)
  if (stamp.base !== current.base) return refuse(`prebuilt ${outDir} was built for base "${stamp.base}" but this run has "${current.base}"`)
  if (stamp.mode !== current.mode) return refuse(`prebuilt ${outDir} was built for mode "${stamp.mode}" but this run has "${current.mode}"`)
  if (stamp.dataDir !== current.dataDir) return refuse(`prebuilt ${outDir} was built with data dir "${stamp.dataDir}" but this run has "${current.dataDir}"`)
  if (stamp.dataHash !== current.dataHash) return refuse(`the dataset in ${current.dataDir} changed since the build of ${outDir}: run npm run build`)
  if (stamp.donation !== current.donation) {
    const label = (d: string) => (d === 'unset' ? 'unset' : 'set')
    return refuse(`prebuilt ${outDir} was built with donation ${label(stamp.donation)} but this run has ${label(current.donation)}`)
  }
  if (prebuilt !== 'force' && stamp.sourceHash !== current.sourceHash) return refuse('source changed since the build: run npm run build')
  return { command: serveCommand(outDir), timeout: PREBUILT_TIMEOUT }
}

/** "42s" / "3m" / "2h" / "5d" — the age in the `reusing build … built <age> ago` line. */
export function ageText(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}
