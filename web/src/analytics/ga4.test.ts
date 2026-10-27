// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import type { Analytics } from './index'
import { analyticsFor, ga4Provider, gaScriptUrl, GA_SCRIPT_HOST } from './ga4'
import { noopAnalytics } from './index'

interface Window_ {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}

const id = 'G-TEST1234567'

/** The queued gtag commands (what would reach Google once gtag.js loads). */
function commands(): unknown[][] {
  return ((globalThis as Window_).dataLayer ?? []) as unknown[][]
}

/** The event names queued by an analytics instance (exercising it directly). */
function sentEventNames(a: Analytics): string[] {
  const before = commands().length
  a.event('search', { results: 1, query_length: 6 })
  a.pageView('/rj/', 'RJ')
  return commands()
    .slice(before)
    .filter((c) => c[0] === 'event')
    .map((c) => c[1] as string)
}

afterEach(() => {
  const w = globalThis as Window_
  delete w.dataLayer
  delete w.gtag
  for (const el of document.querySelectorAll('script[data-vv-ga4]')) el.remove()
})

describe('ga4 provider (the analytics a granted consent installs)', () => {
  it('queues js + config (config: no automatic page view) and injects the script tag exactly once per page', () => {
    ga4Provider(id)
    ga4Provider(id) // the script tag is deduplicated on the document, not per provider
    const queue = commands()
    expect(queue[0]).toEqual(['js', expect.any(Date)])
    expect(queue[1]).toEqual(['config', id, { send_page_view: false }])
    const tags = document.querySelectorAll<HTMLScriptElement>('script[data-vv-ga4]')
    expect(tags.length).toBe(1)
    expect(tags[0]!.src).toBe(gaScriptUrl(id))
    expect(tags[0]!.async).toBe(true)
  })

  it('url carries the id and always points at googletagmanager.com', () => {
    expect(gaScriptUrl(id)).toBe(`${GA_SCRIPT_HOST}/gtag/js?id=${id}`)
    expect(gaScriptUrl('G-X&Y')!).toContain('id=G-X%26Y')
  })

  it('sends page_view with the given path/title and events with their properties', () => {
    const a = ga4Provider(id)
    const before = commands().length
    a.pageView('/rj/', 'RJ · Voto a Voto')
    a.event('search', { results: 3, query_length: 5 })
    const queue = commands().slice(before)
    expect(queue[0]).toEqual(['event', 'page_view', { page_path: '/rj/', page_title: 'RJ · Voto a Voto' }])
    expect(queue[1]).toEqual(['event', 'search', { results: 3, query_length: 5 }])
  })

  it('drops event names and properties outside the events table', () => {
    const a = ga4Provider(id)
    a.event('definitely_not_documented')
    a.event('search', { results: 1, typed_text: 'cidade exemplo' })
    const events = commands().filter((c) => (c as unknown[])[1] === 'search')
    expect(events).toEqual([['event', 'search', { results: 1 }]]) // the typed text never even queues
    expect(commands().some((c) => (c as unknown[])[1] === 'definitely_not_documented')).toBe(false)
  })

  it('an event without properties queues as `event name {}` (share_cancelled)', () => {
    const a = ga4Provider(id)
    a.event('share_cancelled')
    const events = commands().filter((c) => (c as unknown[])[1] === 'share_cancelled')
    expect(events).toEqual([['event', 'share_cancelled', {}]])
  })
})

describe('analyticsFor — the boot glue: the notice model installs whenever an id is configured', () => {
  it('without a configured id: analytics is a no-op and no script tag appears', () => {
    expect(analyticsFor('')).toBe(noopAnalytics)
    expect(analyticsFor('   ')).toBe(noopAnalytics)
    expect(sentEventNames(analyticsFor(''))).toEqual([])
    expect(document.querySelectorAll('script[data-vv-ga4]').length).toBe(0)
  })

  it('with a configured id: the real queueing provider (no consent gate — implied by use)', () => {
    expect(sentEventNames(analyticsFor(id))).toEqual(['search', 'page_view'])
    expect(document.querySelectorAll('script[data-vv-ga4]').length).toBe(1)
  })
})