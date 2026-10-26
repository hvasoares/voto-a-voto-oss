import { withBase } from '../paths'
import { createStore } from './store'
import type { DataStore } from './types'

/** Browser store: every file is fetched from the site's own static address (`<base>data/<file>`). Nothing else. */
export function createBrowserStore(base: string): DataStore {
  return createStore(async (file) => {
    const res = await fetch(withBase(base, `data/${file}`))
    if (!res.ok) throw new Error(`data/${file}: HTTP ${res.status}`)
    return res.text()
  })
}
