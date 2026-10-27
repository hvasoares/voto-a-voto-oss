/**
 * The GA4 provider of ticket #20: the `Analytics` implementation plugged in by the boot script ONLY
 * after the visitor granted consent (src/lib/consent.ts) and only when a measurement ID is configured
 * (src/analytics/id.ts). No call before consent, no request before consent, ever — by construction the
 * provider only comes to exist when the boot script installs it, on a granted consent.
 *
 * After consent, in the browser, this module:
 * - injects `https://www.googletagmanager.com/gtag/js?id=<ID>` as a script tag, exactly once per page;
 *   the browser fetches Google only here — never at build time and never before the consent;
 * - queues commands in window.dataLayer through the standard `gtag` stub (so a blocked load — an ad
 *   blocker — is safe: commands pile up locally, no error, the screens are untouched);
 * - calls `gtag('config', <ID>, { send_page_view: false })`: page views are explicit events (the boot
 *   script sends one per page load; the automatic one would double-count);
 * - deliberately does NOT set anonymize_ip and configures no identifiers: GA4 does not log IP addresses
 *   by default and nothing beyond the documented events of src/analytics/events.ts is ever sent.
 * Unknown event names / properties are dropped here — the events table is the contract, and every event
 * goes out as `gtag('event', name, props)` in GA4's own transport.
 */
import { noopAnalytics, type Analytics, type EventProps } from './index'
import { eventProps, EVENT_NAMES } from './events'

export interface Ga4Window {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}

/** The googletagmanager origin, kept visible for the blocked-origin (ad blocker) e2e. */
export const GA_SCRIPT_HOST = 'https://www.googletagmanager.com'

export function gaScriptUrl(id: string): string {
  return `${GA_SCRIPT_HOST}/gtag/js?id=${encodeURIComponent(id)}`
}

/** Injects the gtag script tag once per page (no-op outside the browser — plain node unit tests). */
export function injectGaScript(id: string, doc: Pick<Document, 'head'> | undefined = typeof document === 'undefined' ? undefined : document): void {
  if (!doc) return
  if (doc.head.querySelector('script[data-vv-ga4]')) return
  const script = document.createElement('script')
  script.async = true
  script.src = gaScriptUrl(id)
  script.dataset.vvGa4 = 'true'
  // A blocked load is fine: the gtag stub below keeps queueing commands locally and nothing throws.
  doc.head.appendChild(script)
}

export function ga4Provider(id: string): Analytics {
  const w = globalThis as unknown as Ga4Window
  const dataLayer = (w.dataLayer ??= [])
  // The standard gtag stub: pushes commands until (and even after) googletagmanager's gtag.js replaces
  // it at load — with the script blocked, the queue just stays local and the site never errors.
  if (w.gtag === undefined) {
    w.gtag = (...args: unknown[]) => {
      dataLayer.push(args)
    }
  }
  const gtag = w.gtag
  injectGaScript(id)
  gtag('js', new Date())
  // send_page_view: false — the boot script sends page_view explicitly, on this and every page.
  gtag('config', id, { send_page_view: false })

  const emit = (name: string, props: EventProps): void => {
    // Only documented events and only their documented properties reach Google.
    if (!EVENT_NAMES.has(name)) return
    const allowed = eventProps(name)
    const clean: EventProps = {}
    for (const [key, value] of Object.entries(props)) if (allowed.has(key)) clean[key] = value
    gtag('event', name, clean)
  }

  return {
    pageView(path: string, title: string): void {
      emit('page_view', { page_path: path, page_title: title })
    },
    event(name: string, props?: EventProps): void {
      emit(name, props ?? {})
    },
  }
}

/** The boot glue in one testable function: a GA4 analytics only for a granted consent WITH an id. */
export function analyticsFor(state: 'unknown' | 'granted' | 'refused', id: string): Analytics {
  return state === 'granted' && id.trim() !== '' ? ga4Provider(id) : noopAnalytics
}