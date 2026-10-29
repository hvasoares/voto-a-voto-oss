/**
 * The build stamp of ticket #108: every `astro build` records its inputs in
 * `.build-stamps/<OUT_DIR basename>.json` (outside the output folder, so it is never published or scanned;
 * the folder is git-ignored). With E2E_PREBUILT=1 the Playwright config recomputes the same fields from the
 * environment and the working tree (scripts/build-stamp.ts does the fs; scripts/web-server-config.ts decides)
 * and refuses to serve a build that no longer matches.
 *
 * Pure Node, no web/src imports beyond the plain data-dir helper — the same bar as shards-fingerprint.ts,
 * which playwright.config.ts and the astro integration both import.
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { FINGERPRINT_FILES } from '../integrations/shards-fingerprint'
import { dataDir } from '../src/lib/data-dir'
import type { BuildStamp, CurrentInputs } from './web-server-config'

/** Under public/, these are written BY the build, so they are outputs, not inputs. */
const GENERATED_PUBLIC = new Set(['public/data', 'public/preview', 'public/edicoes'])

function walkFiles(dir: string, root: string, out: string[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = relative(root, join(dir, entry.name)).split(sep).join('/')
    if (entry.isDirectory()) {
      if (!GENERATED_PUBLIC.has(rel)) walkFiles(join(dir, entry.name), root, out)
    } else {
      out.push(rel)
    }
  }
}

/** SHA-256 over the sorted paths and contents of every file the build reads from this checkout. */
export function sourceHash(root: string): string {
  const files: string[] = []
  for (const dir of ['src', 'integrations', 'public']) walkFiles(resolve(root, dir), root, files)
  files.push('astro.config.ts', 'package-lock.json')
  files.sort()
  const hash = createHash('sha256')
  for (const file of files) hash.update(file).update('\0').update(readFileSync(resolve(root, file))).update('\0')
  return hash.digest('hex')
}

/** SHA-256 over the dataset's fingerprint files (the six of FINGERPRINT_FILES, in fingerprint order). */
export function dataHash(dir: string): string {
  const hash = createHash('sha256')
  for (const f of FINGERPRINT_FILES) hash.update(f).update('\0').update(readFileSync(resolve(dir, f))).update('\0')
  return hash.digest('hex')
}

/**
 * The stamp fields recomputed from an environment and a checkout — what the integration writes at build
 * time and what the Playwright config compares against the stamp. `mode`/`outDir` come from the caller: the
 * integration derives them from BUILD_TARGET/OUT_DIR, the config from E2E_MODE.
 */
export function stampInputs(
  env: Record<string, string | undefined>,
  root: string,
  mode: string,
  outDir: string,
): Omit<CurrentInputs, 'outputExists'> {
  const dir = dataDir(env, root)
  return {
    sourceHash: sourceHash(root),
    base: env.SITE_BASE ?? '/',
    mode,
    dataDir: dir,
    dataHash: dataHash(dir),
    donation: env.PUBLIC_DONATION_URL ? createHash('sha256').update(env.PUBLIC_DONATION_URL).digest('hex') : 'unset',
    outDir,
  }
}

/** `.build-stamps/<OUT_DIR basename>.json`, so `dist` and `dist-production` never share a stamp. */
export function stampPath(root: string, outDir: string): string {
  return resolve(root, '.build-stamps', `${basename(resolve(root, outDir))}.json`)
}

/** The stamp of a previous build, or null when the file is missing, unreadable or the wrong shape. */
export function readStamp(root: string, outDir: string): BuildStamp | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(stampPath(root, outDir), 'utf8'))
  } catch {
    return null
  }
  const s = parsed as Partial<BuildStamp> | null
  if (
    typeof s?.sourceHash !== 'string' ||
    typeof s.base !== 'string' ||
    typeof s.mode !== 'string' ||
    typeof s.dataDir !== 'string' ||
    typeof s.dataHash !== 'string' ||
    typeof s.donation !== 'string' ||
    typeof s.outDir !== 'string' ||
    typeof s.builtAt !== 'string'
  ) {
    return null
  }
  return s as BuildStamp
}

export function writeStamp(root: string, stamp: BuildStamp): void {
  const file = stampPath(root, stamp.outDir)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(stamp, null, 2)}\n`)
}
