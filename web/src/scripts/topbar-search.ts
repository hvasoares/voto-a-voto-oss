import { createElement } from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import CitySearch from '@/components/CitySearch'

/** Mounts the existing CitySearch (the one Home uses) into the top bar's pre-rendered field, focused, with what was typed. Loaded by desktop-shell.ts on the first interaction. */
export function mount(host: HTMLElement, typed: string): void {
  // Synchronous: a key typed between reading the plain field and the replacement being drawn would be lost (the flaky "focuses the top bar search" spec).
  const root = createRoot(host)
  flushSync(() => root.render(createElement(CitySearch, { base: host.dataset.base ?? '/', bar: true, initialText: typed, autoFocus: true })))
}
