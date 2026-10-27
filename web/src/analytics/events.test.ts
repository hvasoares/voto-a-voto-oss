import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EVENT_PROPS } from './event-props'
import { EVENTS, EVENT_NAMES, eventDoc, eventProps } from './events'

/** The repo root: every `emitted` path in the table is relative to it. The walk covers the wired sources of src/ (not the tests, not this table, not the provider). */
const ROOT = resolve(import.meta.dirname, '..', '..')
const SRC = join(ROOT, 'src')
const SKIP = new Set(['public', 'fixtures', 'data', 'data-test', '__tests__'])
const NAME_CALL = /(?:\.event|\bemit)\(\s*'([^']+)'/g

function* sources(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) yield* sources(full)
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\./.test(entry) && entry !== 'events.ts' && entry !== 'ga4.ts') yield full
  }
}

/** Every event name the site emits: a string-literal first argument of `.event(` or `emit(`. Dynamic names would break the documented contract, so only literals count. */
function wiredEventNames(): Set<string> {
  const names = new Set<string>()
  for (const file of sources(SRC)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      if (/^\s*(\/\/|\*|\/\*)/.test(line.trim())) continue // a comment, not code
      for (const match of line.matchAll(NAME_CALL)) {
        const name = match[1]
        if (name) names.add(name)
      }
    }
  }
  return names
}

describe('the events table (ticket #20: every name and property documented in one place)', () => {
  it('the lean table the browser reads says exactly what the documented table says', () => {
    expect(EVENT_PROPS).toEqual(Object.fromEntries(EVENTS.map((e) => [e.name, Object.keys(e.props)])))
  })

  it('every event name the site emits is in the table', () => {
    const wired = wiredEventNames()
    // Sanity for the scan itself: the codebase really does emit a full vocabulary, not nothing.
    expect(wired.size).toBeGreaterThanOrEqual(15)
    const outside = [...wired].filter((n) => !EVENT_NAMES.has(n))
    expect(outside).toEqual([])
  })

  it('every table entry really is emitted by its listed files, and page_view comes from the boot script', () => {
    for (const doc of EVENTS) {
      expect(doc.description.length).toBeGreaterThan(10)
      expect(doc.emitted.length).toBeGreaterThan(0)
      for (const file of doc.emitted) {
        const code = readFileSync(join(ROOT, file), 'utf8')
        const emitsHere = new RegExp(`(?:\\.event|\\bemit)\\(\\s*'${doc.name}'`).test(code) || (doc.name === 'page_view' && /pageView\(/.test(code))
        expect(emitsHere, `${doc.name} claims ${file}, but that file does not emit it`).toBe(true)
      }
    }
    // page_view is emitted through the interface's pageView (one boot script, every page).
    expect(readFileSync(join(SRC, 'scripts/analytics-boot.ts'), 'utf8')).toMatch(/getAnalytics\(\)\.pageView\(/)
  })

  it('the ticket-20 events the screens own are wired today (page_view goes through pageView, checked below)', () => {
    const wired = wiredEventNames()
    for (const name of [
      'city_view',
      'search',
      'share_opened',
      'share_completed',
      'image_downloaded',
      'qr_screen_shown',
      'poster_printed',
      'report_opened',
      'state_tile_tap',
    ]) {
      expect(wired.has(name), `${name} should be wired`).toBe(true)
    }
  })

  it('lookup helpers agree with the table (the provider drops unknown names and properties)', () => {
    expect(eventDoc('page_view')?.props).toEqual({ page_path: expect.any(String), page_title: expect.any(String) })
    expect(eventDoc('share_cancelled')!.props).toEqual({})
    expect(eventProps('not_an_event')!.size).toBe(0)
  })
})