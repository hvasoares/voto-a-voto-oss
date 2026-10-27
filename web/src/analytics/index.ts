/**
 * The single analytics interface. Screens call THIS and nothing else; the consent-gated GA4 provider
 * (ticket #20) is plugged in behind it without a screen changing.
 *
 * Rules for event properties: simple values only; never personal data and never raw
 * user-typed text (e.g. search: send result count and query length, not the query).
 * The names and properties are documented in src/analytics/events.ts and enforced there by the
 * GA4 provider: nothing reaches Google before the visitor's consent, and with no measurement id
 * configured the interface stays exactly this no-op.
 */
export type EventProps = Record<string, string | number | boolean>

export interface Analytics {
  pageView(path: string, title: string): void
  event(name: string, props?: EventProps): void
}

export const noopAnalytics: Analytics = {
  pageView() {},
  event() {},
}

/**
 * The analytics every caller talks to. It is a stable proxy whose methods delegate to the installed
 * provider AT CALL TIME (not a captured reference): islands hydrate and memoize their analytics
 * instance long before the visitor answers the consent banner, so a swapped value would strand their
 * emissions on the no-op forever. With the proxy, a late install still reaches every caller.
 * Everything before the install (and without consent or an id) goes to the no-op: dropped, never queued.
 */
let installed: Analytics = noopAnalytics

const current: Analytics = {
  pageView(path: string, title: string): void {
    installed.pageView(path, title)
  },
  event(name: string, props?: EventProps): void {
    installed.event(name, props)
  },
}

export function getAnalytics(): Analytics {
  return current
}

/**
 * Load-time emissions: the page scripts run before the boot script and want to report the page's
 * opening — `onAnalyticsReady` runs the callback the moment the boot installs, or immediately when it
 * already did. When the boot settles WITHOUT an install (consent still unknown or refused at load),
 * the pending emissions are resolved to the no-op: dropped, and never replayed by a later grant.
 */
const pending: ((a: Analytics) => void)[] = []
let settled = false

export function onAnalyticsReady(callback: (a: Analytics) => void): void {
  if (settled) callback(installed)
  else pending.push(callback)
}

export function setAnalytics(next: Analytics): void {
  settled = true
  installed = next
  while (pending.length) pending.shift()!(next)
}

/** The boot's verdict "analytics decided, nothing to install": pending load emissions hit the no-op. */
export function settleAnalyticsWithoutInstall(): void {
  setAnalytics(noopAnalytics)
}
