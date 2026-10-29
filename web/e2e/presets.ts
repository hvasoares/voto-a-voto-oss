/**
 * Shared e2e presets (ticket #132): the phone and desktop frames (and the one-off sizes of the specs named
 * in each comment), the no-JavaScript context options, the "skip when the dataset is missing" guard and the
 * metrics-notice acknowledgement. Specs use these instead of repeating the literals; `no-raw-presets.test.ts`
 * fails when a literal comes back, and `scripts/e2e-literals.ts` is the census a migration proves itself with.
 *
 * Nothing here is re-exported by `helpers.ts` on purpose: `base` already makes that file the hub of ~120
 * specs, and these presets are the second thing a spec reaches for.
 */
import { test, type BrowserContextOptions, type Page } from '@playwright/test'
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NOTICE_ACKNOWLEDGED_VALUE, NOTICE_STORAGE_KEY } from '../src/lib/storage-keys'

export interface Viewport {
  width: number
  height: number
}

/** The phone frame of the phone project and of every reference screenshot (#51). */
export const PHONE: Viewport = { width: 390, height: 844 }

/** The desktop frame of the desktop project (#51). */
export const DESKTOP: Viewport = { width: 1440, height: 900 }

/** desktop-nerds-{escada,mapa,par-distribuicao,tabela}: one chart band at the full desktop width. */
export const WIDE_BAND: Viewport = { width: 1440, height: 300 }

/** desktop-pages: the estado map slot starts below the fold; a 160 px frame proves nothing was fetched. */
export const BELOW_FOLD: Viewport = { width: 1440, height: 160 }

/** capture-sobre: the canvas of the "Sobre os dados / desktop" Sketch frame capture. */
export const SOBRE_FRAME: Viewport = { width: 1280, height: 900 }

/** overlay: the transparency canvas of the overlay builder's screenshots. */
export const OVERLAY_FRAME: Viewport = { width: 1280, height: 720 }

/** capture-preview: the share svg rendered at exactly the raster og:image size. */
export const OG_CARD: Viewport = { width: 480, height: 476 }

/** desktop-home: the 1200 px content column check runs centered above 1440. */
export const ULTRAWIDE: Viewport = { width: 1800, height: 900 }

/** capture (qr poster-print): A4 at 96 dpi print emulation, 210x297 mm in CSS px. */
export const PRINT_A4: Viewport = { width: 794, height: 1123 }

/** cara-a-cara and capture-cara-a-cara: the modo duelo frame. */
export const DUEL: Viewport = { width: 1920, height: 1080 }

/** nerds-estado: one pixel under the 1024 px breakpoint — the proof nothing desktop is fetched. */
export const UNDER_BREAKPOINT: Viewport = { width: 1023, height: 900 }

/** A viewport a spec computes (parameterised `for (const [w, h] of ...)` loops). */
export const viewport = (width: number, height: number): Viewport => ({ width, height })

/**
 * Context options for a no-JavaScript run: `browser.newContext(noJs())`, or spread first when the context
 * needs more: `browser.newContext({ ...noJs(), viewport: PHONE, locale: 'pt-BR' })`.
 */
export const noJs = (overrides: BrowserContextOptions = {}): BrowserContextOptions => ({ javaScriptEnabled: false, ...overrides })

/** The test.use form: `useNoJs()` for a suite, `useNoJs({ viewport: DESKTOP })` with the desktop frame. */
export const useNoJs = (overrides: BrowserContextOptions = {}) => test.use(noJs(overrides))

/**
 * The "metrics notice acknowledged" state of a first visit: an init script writing the product's own key and
 * value (src/lib/storage-keys.ts). Specs that assert on the notice UI itself keep their raw interactions.
 */
export async function acknowledgeNotice(page: Page): Promise<void> {
  const pair: [string, string] = [NOTICE_STORAGE_KEY, NOTICE_ACKNOWLEDGED_VALUE]
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), pair)
}

/** What `test.skip(...)` consumes: `test.skip(...dataGuard())`. */
export type DataGuard = [skip: boolean, reason: string]

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url))

/** Playwright wipes test-results at run start and the runner process (not the workers) reads it at the end. */
const GUARD_LOG = resolve(WEB_ROOT, 'test-results', 'data-guard.log')

/** Directories committed to git: their absence in CI is a packaging bug, never a skippable one. */
const TRACKED_DIRS = new Set(['../data', 'fixtures/data'])

const recordGuardSkip = (label: string, file: string): void => {
  mkdirSync(dirname(GUARD_LOG), { recursive: true })
  appendFileSync(GUARD_LOG, `${label}\t${file}\n`)
}

/**
 * The "skip when the dataset is missing" guard of the real-data specs. `test.skip(...dataGuard())` skips
 * (and says `no <dir>/<file>`) when `<dir>/<file>` is absent. `dir` unset means `process.env.DATA_DIR ??
 * '../data'`; pass `'fixtures/data'` for the fixture variant. A `null` dir means the run must name its data
 * (`dataGuard('cities.csv', process.env.DATA_DIR ?? null)`: DATA_DIR-required, a skip in every environment,
 * since `npm run test:real` is not in CI). In CI, a missing tracked directory throws instead of skipping.
 */
export function dataGuard(file = 'cities.csv', dir?: string | null): DataGuard {
  const effective = dir === undefined ? process.env.DATA_DIR ?? '../data' : (dir ?? process.env.DATA_DIR)
  const label = effective ?? 'DATA_DIR'
  const missing = effective === undefined || !existsSync(resolve(effective, file))
  if (missing) {
    if (effective !== undefined && process.env.CI === 'true' && TRACKED_DIRS.has(effective.replace(/\/$/, '')))
      throw new Error(`data directory ${effective} missing in CI`)
    recordGuardSkip(label, file)
  }
  return [missing, `no ${label}/${file}`]
}

/** The run start clears the counter (globalSetup); the run end prints it (globalTeardown). */
export function clearGuardLog(): void {
  rmSync(GUARD_LOG, { force: true })
}

/** Prints `data guard: N tests skipped (no <dir>/<file>)` — one line per directory/file pair, 0 when none. */
export function printGuardReport(): void {
  let lines: string[] = []
  try {
    lines = readFileSync(GUARD_LOG, 'utf8').trim().split('\n').filter(Boolean).sort()
  } catch {
    lines = []
  }
  if (lines.length === 0) {
    console.log('data guard: 0 tests skipped')
    return
  }
  const counts = new Map<string, number>()
  for (const line of lines) counts.set(line, (counts.get(line) ?? 0) + 1)
  let total = 0
  for (const [key, n] of [...counts].sort()) {
    total += n
    const [dir, file] = key.split('\t')
    console.log(`data guard: ${n} test${n === 1 ? '' : 's'} skipped (no ${dir}/${file})`)
  }
  if (counts.size > 1) console.log(`data guard: ${total} tests skipped in total`)
}

/* — the raw-literal scan (#132's lint half; this module is the one file exempt from it) — */

export type RawRule = 'viewport-size' | 'viewport-option' | 'no-js' | 'data-guard' | 'notice-ack'

export interface RawFinding {
  file: string
  /** 1-based. */
  line: number
  rule: RawRule
  /** The offending text, trimmed (possibly truncated). */
  literal: string
  /** The preset to write instead. */
  preset: string
}

const PRESET_HINT: Record<RawRule, string> = {
  'viewport-size': 'PHONE / DESKTOP / a named constant / viewport(w, h) from presets.ts',
  'viewport-option': 'PHONE / DESKTOP / a named constant / viewport(w, h) from presets.ts',
  'no-js': 'noJs() / useNoJs() from presets.ts',
  'data-guard': 'dataGuard() from presets.ts',
  'notice-ack': 'acknowledgeNotice(page) from presets.ts',
}

const lineOf = (source: string, index: number): number => source.slice(0, index).split('\n').length

/**
 * Balanced scanner: from an opening `(` at `open`, the call's full text through its closing `)` — strings,
 * template literals and comments opaque. undefined when unbalanced. Exported for capture.ts's own lint scan
 * (#133).
 */
export function scanCall(source: string, open: number): string | undefined {
  let depth = 0
  let quote: string | undefined
  for (let i = open; i < source.length; i++) {
    const ch = source[i]!
    if (quote) {
      if (ch === '\\') i++
      else if (ch === quote) quote = undefined
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch
      continue
    }
    if (ch === '/' && source[i + 1] === '/') {
      const end = source.indexOf('\n', i)
      if (end === -1) return undefined
      i = end
      continue
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2)
      if (end === -1) return undefined
      i = end + 1
      continue
    }
    if (ch === '(' || ch === '{' || ch === '[') depth++
    if (ch === ')' || ch === '}' || ch === ']') {
      depth--
      if (depth === 0) return source.slice(open, i + 1)
    }
  }
  return undefined
}

/**
 * Pure scan of one e2e source for the raw literals the presets replaced (the no-raw-presets vitest walks
 * every e2e TypeScript file except this one with it; a finding reads `<file>:<line> <rule>: "<literal>" — use <preset>`).
 * Catches: setViewportSize with an object literal, `viewport: {`, any `javaScriptEnabled:` (false or a
 * variable), `test.skip(` over existsSync, and addInitScript bodies that write the notice key.
 */
export function findRawLiterals(source: string, file: string): RawFinding[] {
  const found: RawFinding[] = []
  const add = (rule: RawRule, index: number, literal: string) =>
    found.push({ file, line: lineOf(source, index), rule, literal: literal.replace(/\s+/g, ' ').trim().slice(0, 80), preset: PRESET_HINT[rule] })

  // setViewportSize with an object literal containing the width — a preset/viewport(...) identifier passes.
  for (const m of source.matchAll(/setViewportSize\s*\(/g)) {
    const call = scanCall(source, m.index! + m[0].length - 1)
    if (call && /^\(\s*\{[\s\S]*?\bwidth\s*[,:]/.test(call)) add('viewport-size', m.index!, call)
  }
  // "viewport: {" anywhere (test.use, newContext, browser.newPage, capture metadata).
  for (const m of source.matchAll(/\bviewport\s*:\s*\{/g)) add('viewport-option', m.index!, m[0])
  // javaScriptEnabled: false at any spacing, or followed by a variable.
  for (const m of source.matchAll(/javaScriptEnabled\s*:\s*[A-Za-z0-9_.$]+/g)) add('no-js', m.index!, m[0])
  // test.skip( whose call carries existsSync — the raw data guard.
  for (const m of source.matchAll(/test\.skip\s*\(/g)) {
    const call = scanCall(source, m.index! + m[0].length - 1)
    if (call && /\bexistsSync\s*\(/.test(call)) add('data-guard', m.index!, call)
  }
  // addInitScript bodies writing the notice key (bare or inside a larger script).
  for (const m of source.matchAll(/addInitScript\s*\(/g)) {
    const call = scanCall(source, m.index! + m[0].length - 1)
    if (call && (/'voto-a-voto:notice'/.test(call) || /localStorage\s*\.\s*setItem\s*\(\s*'[^']*:notice'/.test(call))) add('notice-ack', m.index!, call)
  }
  return found
}
