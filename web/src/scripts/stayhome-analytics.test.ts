// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics } from '@/analytics'

const events: [string, unknown][] = []
beforeEach(() => {
  vi.resetModules()
  events.length = 0
})
afterEach(() => {
  document.body.innerHTML = ''
  setAnalytics(noopAnalytics)
})

describe('stayhome-analytics', () => {
  it('counts the view as opened with the cycle and the round of the page, and nothing else', async () => {
    document.body.innerHTML = '<main data-page="mapa-ficaram-em-casa" data-ano="2022" data-turno="2"></main>'
    const analytics = await import('@/analytics')
    analytics.setAnalytics({ pageView() {}, event: (n, p) => void events.push([n, p]) })
    await import('./stayhome-analytics')
    expect(events).toEqual([['stayhome_opened', { ciclo: 2022, turno: 2 }]])
  })

  it('does nothing on another page', async () => {
    document.body.innerHTML = '<main data-page="mapa"></main>'
    const analytics = await import('@/analytics')
    analytics.setAnalytics({ pageView() {}, event: (n, p) => void events.push([n, p]) })
    await import('./stayhome-analytics')
    expect(events).toEqual([])
  })
})
