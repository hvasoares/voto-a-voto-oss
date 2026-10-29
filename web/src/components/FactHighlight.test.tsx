// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import FactHighlight from './FactHighlight'

const section = (anchor: string, title: string, shown: string, sentence: string, plain: string) =>
  `<section class="fact" id="${anchor}"><h2 class="fact__title">${title}</h2><p class="fact__sentence" data-register="standard">${sentence}</p><p class="fact__sentence" data-register="plain">${plain}</p>
   <dl class="fact__inputs"><div><dt>Votos de Lula<small>votes.csv · votos</small></dt><dd>36.400</dd></div><div><dt>Votos válidos</dt><dd>70.000</dd></div></dl>
   <p class="fact__formula">votos da linha ÷ votos válidos × 100</p><ol class="fact__worked"><li>36.400 ÷ 70.000 × 100 = 52%</li></ol><p class="fact__shown">No cartão: ${shown}</p></section>`
const PAGE = `<main>${section('2022-a', '2022 · Lula', '44,8%', 'Em RJ, 2022, Lula: 44,8%.', 'x')}${section('2022-b', '2022 · Bolsonaro', '55,2%', 'Em RJ, 2022, Bolsonaro: 55,2%.', 'x')}${section('2022-variacao', '2022 · Lula', '+12,7 pp', 'Em RJ, 2022, a parcela de Lula foi 44,8%, +12,7 pontos.', 'Em RJ, 2022, Lula teve 44,8%, +12,7 pontos.')}</main>`
const SENTENCE = 'Em RJ, 2022, a parcela de Lula foi 44,8%, +12,7 pontos.'

beforeEach(() => {
  document.body.innerHTML = '<div data-seg="2022-a"></div><div data-seg="2022-b"></div>'
  vi.stubGlobal('fetch', vi.fn(async () => new Response(PAGE)))
})
afterEach(() => {
  vi.unstubAllGlobals()
  delete document.documentElement.dataset.register
})
const seg = (k: string) => document.querySelector<HTMLElement>(`[data-seg="${k}"]`)!

describe('the sentence highlight', () => {
  it('draws nothing until the records are read, and nothing when they cannot be', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const { container } = render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" calcLabel="De onde vem este número?" />)
    await new Promise((r) => setTimeout(r, 20))
    expect(container.innerHTML).toBe('')
  })

  it('data-ready (#122): yes once the page of the calculation answered, failed with its reason and console line when it cannot be read', async () => {
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" calcLabel="De onde vem este número?" />)
    await screen.findAllByRole('button')
    const done = document.querySelector('[data-fact-highlight]')!
    expect(done.getAttribute('data-ready')).toBe('yes')
    expect(done.getAttribute('data-error')).toBeNull()

    cleanup()
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })))
    const { container } = render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" calcLabel="De onde vem este número?" />)
    await new Promise((r) => setTimeout(r, 20))
    // The failed island draws nothing (as before #122); the contract's trace is the console line and the gate.
    expect(container.innerHTML).toBe('')
    expect(spy).toHaveBeenCalledWith('fact-highlight: fact page')
    spy.mockRestore()
  })

  it('lists the sentence of each cycle (its change line) as a button and a table with the figures of the page', async () => {
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" calcLabel="De onde vem este número?" />)
    expect(await screen.findAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: SENTENCE }).getAttribute('aria-pressed')).toBe('false')
    expect(document.querySelector('[data-cell="2022-a"]')!.textContent).toContain('44,8%')
    expect(document.querySelector('[data-cell="2022-variacao"]')!.textContent).toContain('+12,7 pp')
  })

  it('a click lights the bar segment and the table cell and writes the calculation beside them', async () => {
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" calcLabel="De onde vem este número?" />)
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
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" calcLabel="De onde vem este número?" />)
    await userEvent.click(await screen.findByRole('button', { name: SENTENCE }))
    expect(seg('2022-a').style.outline).toContain('solid')
  })

  it('works by keyboard alone: Tab to a sentence, Enter lights it, Escape puts everything back', async () => {
    const user = userEvent.setup()
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" calcLabel="De onde vem este número?" />)
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

  it('choosing the same sentence again clears it, and the calculation links to its record on the page of the calculation', async () => {
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" calcLabel="De onde vem este número?" />)
    const button = await screen.findByRole('button', { name: SENTENCE })
    await userEvent.click(button)
    expect(screen.getByRole('link', { name: 'De onde vem este número? ›' }).getAttribute('href')).toBe('/fato/estado/rj/tres-ciclos/#2022-a')
    await userEvent.click(button)
    expect(seg('2022-a').style.outline).toBe('')
  })

  it('says the plain sentence when that is the register chosen', async () => {
    document.documentElement.dataset.register = 'plain'
    render(<FactHighlight href="/fato/estado/rj/tres-ciclos/" calcLabel="De onde vem este número?" />)
    expect(await screen.findByRole('button', { name: 'Em RJ, 2022, Lula teve 44,8%, +12,7 pontos.' })).toBeTruthy()
  })
})
