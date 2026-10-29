// @vitest-environment jsdom
/**
 * data-ready of the card drop (#122): the island needs no data of its own — no on the server, yes as soon
 * as it runs. A file it cannot reopen is the dropper's outcome (data-outcome), never the island's failed.
 */
import { cleanup, render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CardDrop from './CardDrop'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/abrir-cartao/')
})

const open = () => {
  render(<CardDrop base="/" origin="https://o.exemplo.br" fixture={true} edition="2026-10-26" />)
  return document.querySelector('[data-card-drop]')!
}

describe('the card drop island', () => {
  it('data-ready: no on the server, yes as soon as the island runs; a dropped non-card is an outcome, not a failure', async () => {
    expect(renderToStaticMarkup(<CardDrop base="/" origin="https://o.exemplo.br" fixture={true} edition="2026-10-26" />)).toContain('data-ready="no"')
    const root = open()
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    // A file that is no card still leaves the gate at yes: the outcome is the visitor's answer.
    const input = document.querySelector('input[type="file"]')!
    Object.defineProperty(input, 'files', { value: [new File(['not a card'], 'x.png', { type: 'image/png' })], configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await vi.waitFor(() => expect(root.querySelector('[data-outcome]')!.getAttribute('data-outcome')).not.toBe('none'))
    expect(root.getAttribute('data-ready')).toBe('yes')
  })
})
