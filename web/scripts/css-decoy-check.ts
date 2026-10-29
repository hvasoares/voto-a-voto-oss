/**
 * Regression check for #125: build output folders left next to `src/` (a `dist-*` copy of a second build,
 * a scratch folder, ...) must not change the built CSS. Tailwind v4's automatic source detection scans every
 * untracked, non-ignored folder under web/, so global.css pins `source(none)` plus `@source "../"` (web/src).
 * This script proves a decoy copy of build output cannot leak its classes into the CSS:
 *
 *   1. Build the fixture site (default DATA_DIR) into a temp OUT_DIR and hash the shared CSS file.
 *   2. Create the decoy folders below under web/, each holding an HTML file with a unique utility class.
 *   3. Build again into another temp OUT_DIR and hash; the decoys are deleted in a `finally` either way.
 *   4. The caller asserts: hashes equal, the decoy colour is absent, the CSS is non-empty and keeps a class
 *      known to be used (`text-step-1`) — so a broken or empty build cannot pass.
 *
 * A second case proves the check can fail: with `source(none)` temporarily removed from a copy of global.css
 * the same decoys DO change the hash. (Copying the stylesheet is cheap, so this runs automated too.)
 *
 * Runs inside `npm test` (scripts/css-decoy-check.test.ts); standalone: `npx tsx scripts/css-decoy-check.ts`.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { withBuildLock } from './build-lock'

const here = dirname(fileURLToPath(import.meta.url))
export const webRoot = resolve(here, '..')
const astroBin = resolve(webRoot, 'node_modules/astro/bin/astro.mjs')
const globalCss = resolve(webRoot, 'src/styles/global.css')

/** Folders under web/ the check writes; unique utility classes nothing real uses. */
export const DECOY_DIRS = ['dist-decoy', 'out-decoy', 'tmp-decoy', '.captures-decoy', 'test-results-decoy']
export const DECOY_CLASSES = 'bg-[#123457] p-[13px]'
export const DECOY_COLOUR = '123457'

const build = (outDir: string): void => {
  rmSync(outDir, { recursive: true, force: true })
  withBuildLock(webRoot, () =>
    execFileSync(process.execPath, [astroBin, 'build'], {
      cwd: webRoot,
      env: { ...process.env, OUT_DIR: outDir },
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  )
}

/** The bytes of the shared global stylesheet in a build, plus its sha256. */
const hashCss = (outDir: string): { hash: string; css: string } => {
  const astroDir = join(outDir, '_astro')
  const file = readdirSync(astroDir).find((f) => /^global\..*\.css$/.test(f))
  if (!file) throw new Error(`no global stylesheet in ${astroDir}`)
  const css = readFileSync(join(astroDir, file), 'utf8')
  return { hash: createHash('sha256').update(css).digest('hex'), css }
}

const writeDecoys = (): void => {
  for (const dir of DECOY_DIRS) {
    const full = join(webRoot, dir)
    mkdirSync(full, { recursive: true })
    writeFileSync(join(full, 'a.html'), `<p class="${DECOY_CLASSES}">decoy</p>\n`)
  }
}

const removeDecoys = (): void => {
  for (const dir of DECOY_DIRS) rmSync(join(webRoot, dir), { recursive: true, force: true })
}

export interface DecoyRun {
  before: { hash: string; css: string }
  after: { hash: string; css: string }
}

/** Builds with and without the decoy folders. Throws on build failure; always removes the decoys. */
export function runDecoyCheck(): DecoyRun {
  const beforeDir = mkdtempSync(join(tmpdir(), 'css-decoy-before-'))
  const afterDir = mkdtempSync(join(tmpdir(), 'css-decoy-after-'))
  try {
    build(beforeDir)
    const before = hashCss(beforeDir)
    writeDecoys()
    try {
      build(afterDir)
    } finally {
      removeDecoys()
    }
    return { before, after: hashCss(afterDir) }
  } finally {
    rmSync(beforeDir, { recursive: true, force: true })
    rmSync(afterDir, { recursive: true, force: true })
  }
}

/**
 * Negative control: build a copy of global.css WITHOUT the `source(none)` pin while decoys are in place —
 * automatic detection must pick the decoy classes up, changing the CSS. global.css is restored in a `finally`.
 */
export function runDecoyNegativeControl(): { hash: string; css: string } {
  const original = readFileSync(globalCss, 'utf8')
  const pin = '@import "tailwindcss" source(none);'
  if (!original.includes(pin)) throw new Error(`global.css is missing ${pin}`)
  const outDir = mkdtempSync(join(tmpdir(), 'css-decoy-negative-'))
  writeFileSync(globalCss, original.replace(pin, '@import "tailwindcss";'))
  try {
    writeDecoys()
    try {
      build(outDir)
    } finally {
      removeDecoys()
    }
    return hashCss(outDir)
  } finally {
    writeFileSync(globalCss, original)
    rmSync(outDir, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!existsSync(astroBin)) throw new Error('run npm install first')
  const { before, after } = runDecoyCheck()
  console.log(`css without decoys: ${before.css.length} B, sha256 ${before.hash}`)
  console.log(`css with decoys:      ${after.css.length} B, sha256 ${after.hash}`)
  const failures = [
    before.hash === after.hash ? null : 'the decoy folders changed the CSS bytes',
    after.css.includes(DECOY_COLOUR) ? `the CSS contains the decoy colour ${DECOY_COLOUR}` : null,
    after.css.length === 0 ? 'the CSS is empty' : null,
    after.css.includes('text-step-1') ? null : 'the CSS lost text-step-1, a class the pages use',
  ].filter(Boolean)
  if (failures.length) {
    console.error(`DECOY CHECK FAILED:\n${failures.join('\n')}`)
    process.exit(1)
  }
  console.log('css-decoy-check OK: the CSS bytes are the same with and without the decoy folders.')
}
