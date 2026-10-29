// @vitest-environment jsdom
/**
 * data-ready of the overlay builder (#122): no on the server and before the address is read, yes after;
 * the option taps the page script kept from before hydration replay on top of the address and only then
 * does the island report yes.
 */
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import OverlayBuilder from './OverlayBuilder'

// cmdk (the picker) and the builder's own frame measuring need this.
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver

afterEach(() => {
  history.replaceState(null, '', '/overlay/')
  document.querySelector('astro-island')?.remove()
})

const builder = () => document.querySelector('[data-builder]')!

describe('the overlay builder island', () => {
  it('data-ready: no on the server, yes as soon as the island reads the address', async () => {
    expect(renderToStaticMarkup(<OverlayBuilder base="/b/" origin="https://o.exemplo.br" />)).toContain('data-ready="no"')
    render(<OverlayBuilder base="/b/" origin="https://o.exemplo.br" />)
    await vi_wait(builder())
    expect(builder().getAttribute('data-ready')).toBe('yes')
    expect(builder().getAttribute('data-error')).toBeNull()
  })

  it('the kept option taps replay in their order before yes: size and fund are the tapped ones', async () => {
    const host = document.createElement('astro-island')
    host.setAttribute('data-pending-options', 'Tamanho:600x200|Fundo:escuro')
    document.body.appendChild(host)
    render(<OverlayBuilder base="/b/" origin="https://o.exemplo.br" />, { container: host })
    const root = host.querySelector('[data-builder]')!
    expect(root.getAttribute('data-ready')).toBe('yes')
    expect(root.querySelector('[data-option="Tamanho:600x200"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(root.querySelector('[data-option="Tamanho:1920x1080"]')!.getAttribute('aria-pressed')).toBe('false')
    expect(root.querySelector('[data-option="Fundo:escuro"]')!.getAttribute('aria-pressed')).toBe('true')
    expect(host.getAttribute('data-pending-options')).toBeNull()
  })
})

const vi_wait = async (el: Element) => {
  for (let i = 0; i < 50; i++) {
    if (el.getAttribute('data-ready') === 'yes') return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('data-ready never reached yes')
}
