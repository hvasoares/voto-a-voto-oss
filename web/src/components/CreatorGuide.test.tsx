// @vitest-environment jsdom
/**
 * data-ready of the creator guide (#122): no on the server; yes once the address is read — with no city
 * named, the picker is the answer. A city whose shard fails keeps its inline message (a new pick recovers)
 * instead of the terminal failed.
 */
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CreatorGuide from './CreatorGuide'

// cmdk (the picker) and the sheet's own layout code need these.
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView = () => {}

afterEach(() => {
  cleanup()
  history.replaceState(null, '', '/fale-sem-errar/')
})

describe('the creator guide island', () => {
  it('data-ready: no on the server, yes once the address is read (no city: the picker is the answer)', async () => {
    expect(renderToStaticMarkup(<CreatorGuide base="/" origin="https://o.exemplo.br" edition="26/10/2026" />)).toContain('data-ready="no"')
    render(<CreatorGuide base="/" origin="https://o.exemplo.br" edition="26/10/2026" />)
    const root = document.querySelector('[data-guide]')!
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(root.getAttribute('data-error')).toBeNull()
  })
})
