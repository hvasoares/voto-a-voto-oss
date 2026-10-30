// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { pageDataFile, stableJson } from '@/shared/page-data'
import { loadPageData } from './page-data-loader'

const FILE = pageDataFile('qr', 'zz/exemplo', { name: 'Cidade Exemplo' })
const ok = (body: string, status = 200) => new Response(body, { status })
let area: HTMLElement
let draw: Mock<(data: { name: string }, host: HTMLElement) => void>

beforeEach(() => {
  document.body.innerHTML = `<input id="q"><div data-stub-area role="status" aria-live="polite" data-arrived="Pronto." data-failed-text="Falhou." data-retry-text="Tentar de novo"><p data-stub-loading>Carregando…</p></div>`
  area = document.querySelector('[data-stub-area]')!
  draw = vi.fn((data, host) => void (host.textContent = data.name))
})
const load = (fetcher: () => Promise<Response>) => loadPageData({ area, url: '/d.json', family: 'qr', path: 'zz/exemplo', draw, fetcher: fetcher as typeof fetch })

describe('the page data loader', () => {
  it('draws the payload and says ready, announcing the arrival in the polite status area', async () => {
    await load(async () => ok(stableJson(FILE)))
    expect(draw).toHaveBeenCalledWith({ name: 'Cidade Exemplo' }, expect.any(HTMLElement))
    expect(area.dataset.ready).toBe('yes')
    expect(area.querySelector('[data-stub-content]')!.textContent).toBe('Cidade Exemplo')
    expect(area.querySelector('[data-stub-loading]')!.textContent).toBe('Pronto.')
    expect(area.getAttribute('aria-live')).toBe('polite')
  })

  it('leaves the focus where the visitor put it, on arrival and on failure', async () => {
    const input = document.querySelector<HTMLInputElement>('#q')!
    input.focus()
    await load(async () => ok(stableJson(FILE)))
    expect(document.activeElement).toBe(input)
    await load(async () => ok('', 404))
    expect(document.activeElement).toBe(input)
  })

  it.each([
    ['a missing file', () => ok('', 404), 'http 404'],
    ['no network', () => Promise.reject(new Error('offline')), 'http none'],
    ['bad JSON', () => ok('{nope'), 'bad json'],
    ['a bad checksum', () => ok(stableJson({ ...FILE, sum: '00000000' })), 'bad checksum'],
    ['a file of another page', () => ok(stableJson({ ...FILE, path: 'zz/outra', sum: FILE.sum })), 'wrong address zz/outra'],
  ])('gives the failed state on %s', async (_name, respond, reason) => {
    await load(async () => respond())
    expect(draw).not.toHaveBeenCalled()
    expect(area.dataset.ready).toBe('no')
    expect(area.dataset.failed).toBe('1')
    expect(area.dataset.error).toBe(reason)
    expect(area.querySelector('[data-stub-loading]')!.textContent).toContain('Falhou.')
    expect(area.querySelector('button')!.textContent).toBe('Tentar de novo')
  })

  it('retry loads again and clears the failed state', async () => {
    const responses = [ok('', 500), ok(stableJson(FILE))]
    const fetcher = vi.fn(async () => responses.shift()!)
    await load(fetcher)
    area.querySelector('button')!.click()
    await vi.waitFor(() => expect(area.dataset.ready).toBe('yes'))
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(area.dataset.failed).toBeUndefined()
    expect(area.dataset.error).toBeUndefined()
    expect(area.querySelector('button')).toBeNull()
    expect(draw).toHaveBeenCalledTimes(1)
  })
})
