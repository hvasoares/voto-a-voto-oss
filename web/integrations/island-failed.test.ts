import { afterEach, describe, expect, it, vi } from 'vitest'
import { markIslandFailed } from './island-failed.js'

function fakeDom() {
  const note = { hidden: true, removeAttribute: vi.fn((name: string) => name === 'hidden' && (note.hidden = false)) }
  vi.stubGlobal('document', { querySelector: vi.fn((sel: string) => (sel === '[data-island-failed]' ? note : null)) })
  return { el: { dataset: {} as Record<string, string> }, note }
}

afterEach(() => vi.unstubAllGlobals())

describe('markIslandFailed (what the three island directives do when a load rejects)', () => {
  it('sets data-failed on the island and reveals the [data-island-failed] note', () => {
    const { el, note } = fakeDom()
    markIslandFailed(el as unknown as HTMLElement)
    expect(el.dataset.failed).toBe('1')
    expect(note.hidden).toBe(false)
  })

  it('is idempotent when called twice (hydration check after a rejected load)', () => {
    const { el, note } = fakeDom()
    markIslandFailed(el as unknown as HTMLElement)
    markIslandFailed(el as unknown as HTMLElement)
    expect(el.dataset.failed).toBe('1')
    expect(note.hidden).toBe(false)
  })

  it('does not throw when the page has no note, and the island is still marked', () => {
    vi.stubGlobal('document', { querySelector: () => null })
    const el = { dataset: {} as Record<string, string> }
    markIslandFailed(el as unknown as HTMLElement)
    expect(el.dataset.failed).toBe('1')
  })

  it('keeps the note hidden when asked not to reveal it (panel islands show the table instead)', () => {
    const { el, note } = fakeDom()
    markIslandFailed(el as unknown as HTMLElement, { reveal: false })
    expect(el.dataset.failed).toBe('1')
    expect(note.hidden).toBe(true)
  })
})
