import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Page } from '@playwright/test'
import { normalizeBase } from '../src/paths'

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
  const box = page.getByRole('combobox', { name: 'Busque sua cidade' })
  await box.click()
  await page.waitForFunction(() => document.querySelector('astro-island') && !document.querySelector('astro-island')!.hasAttribute('ssr'))
  return box
}
