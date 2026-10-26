import type { Page } from '@playwright/test'
import { enumerateRoutes } from '../src/app'
import { createNodeStore, dataDir } from '../src/data/node'
import { normalizeBase, withBase } from '../src/paths'
import { slots } from '../src/slots/registry'

export const base = normalizeBase(process.env.SITE_BASE)
/** Limit every e2e check to one slot: SLOT=city npx playwright test */
export const onlySlot = process.env.SLOT

export const routes = (await enumerateRoutes(slots, createNodeStore(dataDir()))).map((r) => ({
  slotId: r.slot.meta.id,
  hydrated: r.slot.hydrated,
  path: withBase(base, r.path),
}))
export const selected = routes.filter((r) => !onlySlot || r.slotId === onlySlot)

export const slotMetas = slots.map((s) => ({ ...s.meta, hydrated: s.hydrated })).filter((m) => !onlySlot || m.id === onlySlot)

/** Records every request the page makes. */
export function collectRequests(page: Page): { url: string; method: string; type: string }[] {
  const seen: { url: string; method: string; type: string }[] = []
  page.on('request', (r) => seen.push({ url: r.url(), method: r.method(), type: r.resourceType() }))
  return seen
}

/** A request is allowed when it is a GET to the site's own origin for a static file or page. */
export function violations(requests: { url: string; method: string; type: string }[], origin: string): string[] {
  return requests
    .filter((r) => {
      if (r.url.startsWith('data:') || r.url.startsWith('blob:')) return false
      const u = new URL(r.url)
      return u.origin !== origin || r.method !== 'GET' || ['websocket', 'eventsource', 'ping', 'other'].includes(r.type)
    })
    .map((r) => `${r.method} ${r.type} ${r.url}`)
}

export async function waitReady(page: Page): Promise<void> {
  await page.waitForFunction(() => document.documentElement.dataset.ready !== undefined)
}
