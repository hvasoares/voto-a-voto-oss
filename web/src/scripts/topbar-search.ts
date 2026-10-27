import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import CitySearch from '@/components/CitySearch'

/** Mounts the existing CitySearch (the one Home uses) into the top bar's pre-rendered field, focused, with what was typed. Loaded by desktop-shell.ts on the first interaction. */
export function mount(host: HTMLElement, typed: string): void {
  createRoot(host).render(createElement(CitySearch, { base: host.dataset.base ?? '/', bar: true, initialText: typed, autoFocus: true }))
}
