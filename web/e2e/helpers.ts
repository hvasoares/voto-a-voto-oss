import type { Page } from '@playwright/test'
import { normalizeBase } from '../../site/src/paths'

export const base = normalizeBase(process.env.SITE_BASE)
export const mode: 'local' | 'production' = process.env.E2E_MODE === 'production' ? 'production' : 'local'

/** Origins other than the site itself that may be requested. Analytics: none exists yet (ticket #20 adds its origin HERE). */
export const ANALYTICS_ORIGINS: string[] = []

/** Approved CDN origins: only the production build may use them. Empty until the user chooses a provider (see README). */
export async function approvedCdnOrigins(): Promise<string[]> {
  const { approvedOrigins } = (await import('../cdn.config.json', { with: { type: 'json' } })).default as { approvedOrigins: string[] }
  return approvedOrigins
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

/** The search is a React island that hydrates on first interaction: focus it and wait until React took over. */
export async function activateSearch(page: Page) {
  const box = page.getByRole('combobox', { name: 'Busque sua cidade' })
  await box.click()
  await page.waitForFunction(() => document.querySelector('astro-island') && !document.querySelector('astro-island')!.hasAttribute('ssr'))
  return box
}
