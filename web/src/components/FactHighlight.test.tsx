// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FactHighlight from './FactHighlight'
import { pageDataFile } from '@/shared/page-data'

// The words come from the build in the browser (`virtual:fact-words`): here a subset of three test keys, one sentence each in both registers.
vi.mock('virtual:fact-words', () => ({
  default: {
    standard: { 't.a': 'Em RJ, 2022, Lula: 44,8%.', 't.b': 'Em RJ, 2022, Bolsonaro: 55,2%.', 't.v': 'Em RJ, 2022, a parcela de Lula foi 44,8%, +12,7 pontos.' },
    plain: { 't.a': 'x', 't.b': 'x', 't.v': 'Em RJ, 2022, Lula teve 44,8%, +12,7 pontos.' },
  },
}))

const record = (anchor: string, key: string, title: string, shown: string) => ({
  id: `rj/x/2022-1/${anchor}`,
  anchor,
  title,
  shown,
  say: { k: key },
  inputs: [{ label: 'Votos de Lula', field: 'votes.csv · votos', value: '36.400' }, { label: 'Votos válidos', value: '70.000' }],
  calculation: { formula: 'votos da linha ÷ votos válidos × 100', worked: ['36.400 ÷ 70.000 × 100 = 52%'] },
})
const FILE = pageDataFile('fato', 'estado/rj/tres-ciclos', {
  facts: [record('2022-a', 't.a', '2022 · Lula', '44,8%'), record('2022-b', 't.b', '2022 · Bolsonaro', '55,2%'), record('2022-variacao', 't.v', '2022 · Lula', '+12,7 pp')],
})
const SENTENCE = 'Em RJ, 2022, a parcela de Lula foi 44,8%, +12,7 pontos.'

beforeEach(() => {
  document.body.innerHTML = '<div data-seg="2022-a"></div><div data-seg="2022-b"></div>'
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(FILE))))
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.register
})
const seg = (k: string) => document.querySelector<HTMLElement>(`[data-seg="${k}"]`)!

describe('the sentence highlight', () => {
  it('draws nothing until the records are read, and nothing when they cannot be', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const { container } = render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" />)
    await new Promise((r) => setTimeout(r, 20))
    expect(container.innerHTML).toBe('')
  })

  it('data-ready (#122): yes once the page of the calculation answered, failed with its reason and console line when it cannot be read', async () => {
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" />)
    await screen.findAllByRole('button')
    const done = document.querySelector('[data-fact-highlight]')!
    expect(done.getAttribute('data-ready')).toBe('yes')
    expect(done.getAttribute('data-error')).toBeNull()

    cleanup()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const { container } = render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" />)
    await new Promise((r) => setTimeout(r, 20))
    // The failed island draws nothing (as before #122); the contract's trace is the console line and the gate.
    expect(container.innerHTML).toBe('')
    expect(spy).toHaveBeenCalledWith('fact-highlight: fact page')
    spy.mockRestore()
  })

  it('lists the sentence of each cycle (its change line) as a button and a table with the figures of the page', async () => {
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" />)
    expect(await screen.findAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: SENTENCE }).getAttribute('aria-pressed')).toBe('false')
    expect(document.querySelector('[data-cell="2022-a"]')!.textContent).toContain('44,8%')
    expect(document.querySelector('[data-cell="2022-variacao"]')!.textContent).toContain('+12,7 pp')
  })

  it('a click lights the bar segment and the table cell and writes the calculation beside them', async () => {
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" />)
    await userEvent.click(await screen.findByRole('button', { name: SENTENCE }))
    expect(seg('2022-a').style.outline).toContain('solid')
    expect(seg('2022-b').style.outline).toBe('')
    expect(document.querySelector<HTMLElement>('[data-cell="2022-a"]')!.style.fontWeight).toBe('700')
    const calc = document.querySelector('[data-fact-calc]')!
    expect(calc.textContent).toContain('Destacado: 2022 · Lula')
    expect(calc.textContent).toContain('votos da linha ÷ votos válidos × 100')
    expect(calc.textContent).toContain('36.400 ÷ 70.000 × 100 = 52%')
    expect(calc.getAttribute('role')).toBe('status')
  })

  it('the change lights the left bar segment of its cycle', async () => {
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" />)
    await userEvent.click(await screen.findByRole('button', { name: SENTENCE }))
    expect(seg('2022-a').style.outline).toContain('solid')
  })

  it('works by keyboard alone: Tab to a sentence, Enter lights it, Escape puts everything back', async () => {
    const user = userEvent.setup()
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" />)
    await screen.findAllByRole('button')
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: SENTENCE }))
    await user.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: SENTENCE }).getAttribute('aria-pressed')).toBe('true')
    expect(document.querySelector('[data-fact-calc]')!.textContent).toContain('36.400 ÷ 70.000')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(seg('2022-a').style.outline).toBe(''))
    expect(document.querySelector('[data-fact-calc]')!.innerHTML).toBe('')
  })

  it('choosing the same sentence again clears it, and the island has no calculation link of its own (the page has the one entry, #155)', async () => {
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" />)
    const button = await screen.findByRole('button', { name: SENTENCE })
    await userEvent.click(button)
    expect(screen.queryByRole('link')).toBeNull()
    await userEvent.click(button)
    expect(seg('2022-a').style.outline).toBe('')
  })

  it('says the plain sentence when that is the register chosen', async () => {
    document.documentElement.dataset.register = 'plain'
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" />)
    expect(await screen.findByRole('button', { name: 'Em RJ, 2022, Lula teve 44,8%, +12,7 pontos.' })).toBeTruthy()
  })
})
