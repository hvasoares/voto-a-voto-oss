import { afterEach, describe, expect, it } from 'vitest'
import { getAnalytics, noopAnalytics, setAnalytics, type Analytics } from './index'

afterEach(() => setAnalytics(noopAnalytics))

describe('analytics', () => {
  it('is a no-op by default: calls neither throw nor return anything', () => {
    expect(getAnalytics().pageView('/', 'Início')).toBeUndefined()
    expect(getAnalytics().event('search', { results: 3, query_length: 5 })).toBeUndefined()
  })

  it('lets a provider be plugged in without callers changing', () => {
    const seen: string[] = []
    const spy: Analytics = { pageView: (p) => void seen.push(`pv:${p}`), event: (n) => void seen.push(`ev:${n}`) }
    setAnalytics(spy)
    getAnalytics().pageView('/rj/', 'RJ')
    getAnalytics().event('state_tile_tap')
    expect(seen).toEqual(['pv:/rj/', 'ev:state_tile_tap'])
  })
})
