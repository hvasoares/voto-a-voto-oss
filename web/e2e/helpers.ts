import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'
import { normalizeBase } from '../src/paths'
import { viewport } from './presets'

export const base = normalizeBase(process.env.SITE_BASE)
export const mode: 'local' | 'production' = process.env.E2E_MODE === 'production' ? 'production' : 'local'

/**
 * Origins other than the site itself that may be requested. Ticket #20 (GA4) is consent-gated by
 * construction: before consent NOTHING is loaded and NO request leaves the site, so this list stays
 * empty for the allow-list traces — the consent e2e (e2e/consent.spec.ts) stubs and blocks
 * googletagmanager.com itself, per test, around the granted/blocked scenarios.
 * A granted consent sends Google non-GET beacons anyway (never covered by this GET-only check).
 */
export const ANALYTICS_ORIGINS: string[] = []

/** Approved CDN origins: only the production build may use them. Empty until the user chooses a provider (see README). */
export async function approvedCdnOrigins(): Promise<string[]> {
  const file = resolve(process.env.CDN_CONFIG ?? 'cdn.config.json')
  return (JSON.parse(readFileSync(file, 'utf8')) as { approvedOrigins: string[] }).approvedOrigins
}

export async function allowedOrigins(siteOrigin: string): Promise<string[]> {
  return [siteOrigin, ...ANALYTICS_ORIGINS, ...(mode === 'production' ? await approvedCdnOrigins() : [])]
}

export interface Seen {
  url: string
  method: string
  type: string
}

/** Records every request the page makes. */
export function collectRequests(page: Page): Seen[] {
  const seen: Seen[] = []
  page.on('request', (r) => seen.push({ url: r.url(), method: r.method(), type: r.resourceType() }))
  return seen
}

/** A request is allowed when it is a GET (a plain fetch/page/asset, never a beacon or socket) to an allowed origin. */
export function violations(requests: Seen[], allowed: string[]): string[] {
  return requests
    .filter((r) => {
      if (r.url.startsWith('data:') || r.url.startsWith('blob:')) return false
      const u = new URL(r.url)
      return !allowed.includes(u.origin) || r.method !== 'GET' || ['websocket', 'eventsource', 'ping'].includes(r.type)
    })
    .map((r) => `${r.method} ${r.type} ${r.url}`)
}

/** Waits until the deferred module script of a page took over (the enhancement is wired); each screen script
 * sets `documentElement.dataset.ready`. Same wait as the vanilla app's. */
export async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
}

 export async function activateSearch(page: Page) {
  // The page's own search (the desktop top bar has another one, "bar"; it is hidden on a phone).
  const box = page.locator('[data-city-search="main"]').getByRole('combobox', { name: 'Busque sua cidade' })
  await box.click()
  await page.waitForFunction(() => [...document.querySelectorAll('astro-island')].some((i) => !i.hasAttribute('ssr')))
  return box
}

/** The three widths every desktop spec checks (#51): the phone, the tablet breakpoint and the desktop frame. */
export const WIDTHS = [390, 768, 1440] as const

/** No horizontal scroll at the page's current width. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }))
  if (sw > iw) throw new Error(`horizontal scroll: scrollWidth ${sw} > innerWidth ${iw}`)
}

/** Resizes the page, keeping the phone's height for 390 and the desktop frame's for the others. */
export async function resizeTo(page: Page, width: number): Promise<void> {
  await page.setViewportSize(viewport(width, width === 390 ? 844 : 900))
}

/** The Home's map lives in a lazy iframe from 1024 px up (#53): the document of the fragment. */
export const mapFrame = (page: Page) => page.frameLocator('[data-uf-map-frame]')

/** Moves the mouse onto the label of a state (inside its shape; the shape's own bounding box centre may lie over a neighbour). */
export async function hoverState(page: Page, uf: string) {
  const box = (await mapFrame(page).locator(`[data-map-uf="${uf}"] text`).boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
}

/** "Mapa por estado" at 1024 px and up is the document of a lazy iframe (#54). */
export const mapaFrame = (page: Page) => page.frameLocator('[data-mapa-frame]')

/**
 * E2E_CPU_RATE=4 puts the page under a CDP 4x CPU slowdown (Emulation.setCPUThrottlingRate), for the
 * flake-hunt repeats of #122: the readiness waits must pass with a loaded runner, not by luck of a fast
 * one. A no-op without the variable. (Custom `browser.newContext` pages need their own call.)
 */
export async function maybeThrottleCpu(page: Page): Promise<void> {
  const rate = Number(process.env.E2E_CPU_RATE ?? 0)
  if (!rate || rate <= 1) return
  await (await page.context().newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate })
}
