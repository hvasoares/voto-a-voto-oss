/**
 * Single analytics interface. Screens call this and nothing else.
 * Today it is a no-op: NO Google (or any third-party) code is loaded.
 * Ticket #20 swaps `setAnalytics(...)` for a consent-gated provider without touching screens.
 *
 * Rules for event properties: simple values only; never personal data and never raw
 * user-typed text (e.g. search: send result count and query length, not the query).
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

let current: Analytics = noopAnalytics

export function getAnalytics(): Analytics {
  return current
}

export function setAnalytics(next: Analytics): void {
  current = next
}
