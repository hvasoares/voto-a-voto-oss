/**
 * The capture helper of #133: one place for the four steps every capture spec repeated — the mkdir of
 * .captures/<dir>, the fonts-ready wait, the screenshot and the JSON sidecar. The halves that can be pure
 * are pure (`captureFiles`, `sidecar`) with their own vitest cases; `capture()` is the thin effect shell.
 *
 * Sidecar contract (decided by the owner on 2026-10-28): keys in the order `route`, `viewport`,
 * `scrollY` (when the block records it), `fullPage` (when relevant), `capture` — the png path RELATIVE to
 * .captures/, so two checkouts write the same sidecar — then `fontsReady` (when the fonts wait ran), then
 * the block's `extra` fields. Pretty-printed with 2 spaces and a trailing newline, as before.
 *
 * This module is the one file the raw-capture lint (no-raw-capture.test.ts) never scans: its glob is
 * `capture*.spec.ts`, so the raw steps live here exactly once.
 */
import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import type { Page } from '@playwright/test'
import { scanCall, type Viewport } from './presets'

/** The captures root; the specs run with the web/ cwd, as they always did with resolve('.captures', ...). */
export const CAPTURES = resolve('.captures')

/** The png/json pair of one capture, both absolute. `dir` may nest (`reports/fixture`). */
export function captureFiles(name: string, dir: string, root = CAPTURES): { png: string; json: string } {
  const d = resolve(root, dir)
  return { png: resolve(d, `${name}.png`), json: resolve(d, `${name}.json`) }
}

/** The sidecar's `capture` value: the png path relative to the captures root, with forward slashes. */
export function captureRef(png: string, root = CAPTURES): string {
  return resolve(png).slice(root.length + 1).split(sep).join('/')
}

export interface SidecarFields {
  route: string
  viewport: Viewport
  /** recorded only for the blocks that recorded it before #133 */
  scrollY?: number
  /** recorded only for the blocks that recorded it before #133 */
  fullPage?: boolean
  /** the captureRef of the png; absent in the blocks whose sidecar predates the field */
  capture?: string
  /** present whenever the fonts wait ran */
  fontsReady?: boolean
  /** the block's own fields (slot/state/reference/…), appended after the standard keys */
  extra?: Record<string, unknown>
}

/** The sidecar text: standard keys in contract order, then extras; 2-space pretty print, trailing newline. */
export function sidecar(fields: SidecarFields): string {
  const out: Record<string, unknown> = { route: fields.route, viewport: fields.viewport }
  if (fields.scrollY !== undefined) out.scrollY = fields.scrollY
  if (fields.fullPage !== undefined) out.fullPage = fields.fullPage
  if (fields.capture !== undefined) out.capture = fields.capture
  if (fields.fontsReady !== undefined) out.fontsReady = fields.fontsReady
  Object.assign(out, fields.extra)
  return JSON.stringify(out, null, 2) + '\n'
}

export interface CaptureClip {
  x: number
  y: number
  width: number
  height: number
}

export interface CaptureOptions {
  /** directory under .captures/ (nested segments fine: 'reports/fixture') */
  dir: string
  /** the file stem: <name>.png / <name>.json */
  name: string
  /** the sidecar's route; required when the sidecar is written */
  route?: string
  /** the sidecar's viewport; default the page's own */
  viewport?: Viewport
  /** 'page' records the page's window.scrollY; a number records as-is; unset means the block never records it */
  scrollY?: number | 'page'
  /** screenshot({ fullPage }) — and the sidecar's fullPage, unless 'fullPage' is in `omit` */
  fullPage?: boolean
  /** screenshot({ clip }) */
  clip?: CaptureClip
  /** extra sidecar fields, appended after the standard keys */
  extra?: Record<string, unknown>
  /** standard sidecar keys the block's layout predates (mapa-rj/mapa-uf/reports/page-data have no `capture`) */
  omit?: readonly ('fullPage' | 'capture')[]
  /** false writes the png alone (the secondary shots of a block: …-full, desktop, filter-open) */
  sidecar?: boolean
  /** false skips the fonts wait (a capture whose picture never renders in the page, e.g. the fetched og:image raster) */
  fonts?: boolean
  /** bytes to write as the png instead of screenshotting (capture-preview's already-rasterised og:image) */
  png?: Buffer
  /** fonts-wait budget in ms — a test seam; production runs take the 5 s default */
  fontsTimeout?: number
  /** captures root override — a test seam; production runs take .captures/ */
  root?: string
}

export interface CaptureResult {
  png: string
  json?: string
  fontsReady?: boolean
}

/** The mkdir step alone, for blocks that park their own files in .captures/ (capture-cards' downloads). */
export function captureDir(dir: string, root = CAPTURES): string {
  const d = resolve(root, dir)
  try {
    mkdirSync(d, { recursive: true })
  } catch (err) {
    throw new Error(`cannot write capture to ${d}: ${(err as Error).message}`, { cause: err })
  }
  return d
}

/**
 * The fonts-ready wait with its budget: true when the page's fonts settled within `timeoutMs` (default 5 s),
 * false on timeout — in which case the caller still captures and records it, so a fallback-font capture can
 * never be mistaken for a good one.
 */
export async function waitFonts(page: Page, timeoutMs = 5000): Promise<boolean> {
  const budget = new Promise<boolean>((done) => setTimeout(() => done(false), timeoutMs))
  return await Promise.race([page.evaluate(() => document.fonts.ready.then(() => true)), budget])
}

/**
 * One capture: mkdir, fonts wait, png, sidecar. The png lands first; the sidecar is written to a temp name
 * and renamed over its final one; a failure after the png removes the png, so a capture never exists
 * without its sidecar. Captures overwrite; the directory is never cleaned.
 */
export async function capture(page: Page, opts: CaptureOptions): Promise<CaptureResult> {
  const { png, json } = captureFiles(opts.name, opts.dir, opts.root)
  try {
    mkdirSync(dirname(png), { recursive: true })
  } catch (err) {
    throw new Error(`cannot write capture to ${png}: ${(err as Error).message}`, { cause: err })
  }
  let fontsReady: boolean | undefined
  if (opts.fonts !== false) {
    const budget = opts.fontsTimeout ?? 5000
    fontsReady = await waitFonts(page, budget)
    if (!fontsReady) console.warn(`capture ${opts.dir}/${opts.name}: fonts not ready after ${budget} ms — capturing with fallback fonts`)
  }
  if (opts.png) writeFileSync(png, opts.png)
  else await page.screenshot({ path: png, animations: 'disabled', fullPage: opts.fullPage, clip: opts.clip })
  if (opts.sidecar === false) return { png, fontsReady }
  try {
    if (opts.route === undefined) throw new Error(`capture ${opts.dir}/${opts.name}: a sidecar needs the route`)
    const fields: SidecarFields = {
      route: opts.route,
      viewport: opts.viewport ?? page.viewportSize()!,
      fontsReady,
      extra: opts.extra,
    }
    if (opts.scrollY === 'page') fields.scrollY = await page.evaluate(() => window.scrollY)
    else if (opts.scrollY !== undefined) fields.scrollY = opts.scrollY
    if (opts.fullPage !== undefined && !opts.omit?.includes('fullPage')) fields.fullPage = opts.fullPage
    if (!opts.omit?.includes('capture')) fields.capture = captureRef(png, opts.root)
    const tmp = `${json}.${process.pid}.tmp`
    writeFileSync(tmp, sidecar(fields))
    renameSync(tmp, json)
    return { png, json, fontsReady }
  } catch (err) {
    // no png without its sidecar
    rmSync(png, { force: true })
    throw err
  }
}

/* — the raw-capture scan (#133's lint half; this module is exempt from it by glob: it is no *.spec.ts) — */

export type RawCaptureStep = 'mkdir-captures' | 'sidecar-write' | 'fonts-ready' | 'screenshot-to-captures'

export interface RawCaptureFinding {
  file: string
  /** 1-based. */
  line: number
  step: RawCaptureStep
  /** The offending text, trimmed (possibly truncated). */
  literal: string
}

const lineOf = (source: string, index: number): number => source.slice(0, index).split('\n').length

/**
 * Pure scan of one capture spec for the raw steps capture(...) replaced: `mkdirSync(` over `.captures`,
 * `writeFileSync(` of a `.json` path, the bare `document.fonts.ready` wait, and a screenshot whose `path:`
 * sits under `.captures`. A screenshot without a path, or to another directory (a comparison screenshot),
 * is not a capture and passes.
 */
export function findRawCaptureSteps(source: string, file: string): RawCaptureFinding[] {
  const found: RawCaptureFinding[] = []
  const add = (step: RawCaptureStep, index: number, literal: string) =>
    found.push({ file, line: lineOf(source, index), step, literal: literal.replace(/\s+/g, ' ').trim().slice(0, 80) })

  for (const m of source.matchAll(/\bmkdirSync\s*\(/g)) {
    const call = scanCall(source, m.index! + m[0].length - 1)
    if (call?.includes('.captures')) add('mkdir-captures', m.index!, call)
  }
  for (const m of source.matchAll(/\bwriteFileSync\s*\(/g)) {
    const call = scanCall(source, m.index! + m[0].length - 1)
    if (call && /\.json\b/.test(call)) add('sidecar-write', m.index!, call)
  }
  for (const m of source.matchAll(/\bdocument\.fonts\.ready\b/g)) add('fonts-ready', m.index!, m[0])
  for (const m of source.matchAll(/\b(?:page\d*|page2)\.screenshot\s*\(/g)) {
    const call = scanCall(source, m.index! + m[0].length - 1)
    if (call && /\bpath\s*:/.test(call) && call.includes('.captures')) add('screenshot-to-captures', m.index!, call)
  }
  return found
}
