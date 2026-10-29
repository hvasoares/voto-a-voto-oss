// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@/analytics'
import ShareActions from './ShareActions'
import { saveBlob } from '@/lib/share-raster'

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1070"><rect width="1080" height="1070"/></svg>'
const TEXT = 'Resultado de Cidade Exemplo/RJ, 2026, 1º turno: Candidato A 52% · Candidato B 48% dos votos válidos; 30% do eleitorado não votou. https://votoavoto.exemplo.br/rj/cidade-exemplo/'
const LINK = 'https://votoavoto.exemplo.br/rj/cidade-exemplo/'
const FILENAME = 'voto-a-voto-rj-cidade-exemplo-2026-turno-1.png'

vi.mock('@/lib/share-raster', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/share-raster')>()
  return { ...mod, svgToPng: vi.fn(async (svg: string, name: string) => new File(['png-bytes'], name, { type: 'image/png' })), saveBlob: vi.fn() }
})

const events: [string, unknown][] = []

afterEach(() => {
  cleanup()
  setAnalytics(noopAnalytics)
  events.length = 0
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

function setup(nav?: Record<string, unknown>, withUser?: true): ReturnType<typeof userEvent.setup>
function setup(nav: Record<string, unknown> | undefined, withUser: false): undefined
function setup(nav: Record<string, unknown> = {}, withUser = true) {
  const recorder: Analytics = { pageView() {}, event: (n, p) => void events.push([n, p]) }
  setAnalytics(recorder)
  vi.stubGlobal('navigator', { ...nav })
  render(<ShareActions text={TEXT} svg={SVG} filename={FILENAME} link={LINK} />)
  return withUser ? userEvent.setup() : undefined
}

describe('the ShareActions island (ticket #7)', () => {
  it('the pre-rendered (server) HTML has the buttons hidden: without JavaScript they are not offered', () => {
    const html = renderToStaticMarkup(<ShareActions text={TEXT} svg={SVG} filename={FILENAME} link={LINK} />)
    expect(html).toMatch(/hidden[^>]*data-act="share"|data-act="share"[^>]*hidden/)
    expect(html).toMatch(/Compartilhar/)
    expect(html).toMatch(/data-text-body/)
  })

  it('data-ready (#122): no in the pre-rendered HTML, yes as soon as the island runs (a tap never waits)', () => {
    expect(renderToStaticMarkup(<ShareActions text={TEXT} svg={SVG} filename={FILENAME} link={LINK} />)).toContain('data-ready="no"')
    setup()
    expect(document.querySelector('[data-share-actions]')!.getAttribute('data-ready')).toBe('yes')
  })

  it('shows the buttons after hydration, prepares the PNG and emits share_opened', async () => {
    const user = setup({ canShare: () => true, share: async () => {} })
    const share = screen.getByRole('button', { name: 'Compartilhar' })
    expect(share.getAttribute('hidden')).toBeNull()
    const actions = screen.getByText('Compartilhar').closest('[data-share-actions]')!
    await vi.waitFor(() => expect(actions.getAttribute('data-png')).toBe('ready'))
    expect(screen.getByRole('button', { name: 'Baixar imagem' }).getAttribute('hidden')).toBeNull()
    expect(screen.getByRole('button', { name: 'Copiar texto' }).getAttribute('hidden')).toBeNull()
    expect(events).toEqual([['share_opened', { has_picture: true }]])
    expect(document.querySelector('[data-text-body]')?.textContent).toContain('https://votoavoto.exemplo.br/rj/cidade-exemplo/')
    void user
  })

  it('share: one PNG with the right name and the message text, then share_completed', async () => {
    const calls: ShareData[] = []
    const user = setup({
      canShare: (d: ShareData) => !!d.files,
      share: (d: ShareData) => {
        calls.push(d)
        return Promise.resolve()
      },
    })
    await vi.waitFor(() => expect(screen.getByText('Compartilhar').closest('[data-share-actions]')!.getAttribute('data-png')).toBe('ready'))
    await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
    expect(calls).toHaveLength(1)
    expect(calls[0]!.files![0]).toMatchObject({ name: FILENAME, type: 'image/png' })
    expect(calls[0]!.text).toBe(TEXT)
    expect(events.filter(([n]) => n !== 'share_opened')).toEqual([['share_completed', { method: 'files' }]])
    expect(saveBlob).not.toHaveBeenCalled()
  })

  it('a cancelled sheet is silent: status message cleared, no download', async () => {
    const user = setup({ canShare: () => true, share: () => Promise.reject(new DOMException('cancelled', 'AbortError')) })
    await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
    expect(events.map(([n]) => n)).toEqual(['share_opened', 'share_cancelled'])
    await vi.waitFor(() => expect(document.querySelector('[data-status]')?.textContent).toBe(''))
    expect(saveBlob).not.toHaveBeenCalled()
  })

  it('a failed share falls back to the download and says so', async () => {
    const user = setup({ canShare: () => true, share: () => Promise.reject(new Error('no')) })
    await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
    await vi.waitFor(() => expect(screen.getByText(/A imagem foi baixada/)).toBeTruthy())
    expect(saveBlob).toHaveBeenCalledTimes(1)
    expect(saveBlob).toHaveBeenCalledWith(expect.any(File), FILENAME)
    expect(events.filter(([n]) => n !== 'share_opened')).toEqual([['image_downloaded', { how: 'share_fallback' }]])
  })

  describe('without the Web Share API (most desktop browsers, #52)', () => {
    it('hides the native share button and offers Copiar link, Baixar imagem and the explanation instead', async () => {
      setup({ clipboard: { writeText: () => Promise.resolve() } as unknown as Clipboard }, false)
      await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Copiar link' })).toBeTruthy())
      expect(screen.queryByRole('button', { name: 'Compartilhar' })).toBeNull()
      expect(screen.getByRole('button', { name: 'Baixar imagem' })).toBeTruthy()
      expect(document.querySelector('[data-no-share]')?.textContent).toContain('Este navegador não oferece o compartilhamento do sistema')
    })

    it('"Copiar link" copies the city address (not the message) and says so', async () => {
      const written: string[] = []
      setup({ clipboard: { writeText: (t: string) => (written.push(t), Promise.resolve()) } as unknown as Clipboard }, false)
      fireEvent.click(await screen.findByRole('button', { name: 'Copiar link' }))
      await vi.waitFor(() => expect(screen.getByText('Link copiado.')).toBeTruthy())
      expect(written).toEqual([LINK])
    })

    it('"Baixar imagem" still downloads the PNG, and the message text stays for narrow screens', async () => {
      const user = setup({ clipboard: { writeText: () => Promise.resolve() } as unknown as Clipboard })
      await user.click(await screen.findByRole('button', { name: 'Baixar imagem' }))
      await vi.waitFor(() => expect(screen.getByText(/Imagem baixada/)).toBeTruthy())
      expect(saveBlob).toHaveBeenCalledWith(expect.any(File), FILENAME)
      expect(events).toEqual([['share_opened', { has_picture: true }], ['image_downloaded', { how: 'download_button' }]])
      expect(document.querySelector('[data-share-text]')?.className).toContain('lg:hidden')
    })

    it('a failed copy says so', async () => {
      setup({ clipboard: { writeText: () => Promise.reject(new Error('no')) } as unknown as Clipboard }, false)
      fireEvent.click(await screen.findByRole('button', { name: 'Copiar link' }))
      await vi.waitFor(() => expect(screen.getByText(/Não foi possível copiar/)).toBeTruthy())
    })
  })

  it('with the Web Share API the native button shows and Copiar link does not', async () => {
    setup({ canShare: () => true, share: async () => {}, clipboard: { writeText: () => Promise.resolve() } as unknown as Clipboard }, false)
    expect(screen.getByRole('button', { name: 'Compartilhar' }).getAttribute('hidden')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Copiar link' })).toBeNull()
    expect(document.querySelector('[data-no-share]')).toBeNull()
  })

  it('"Baixar imagem" downloads the PNG, says so and emits image_downloaded', async () => {
    const user = setup({ canShare: () => true, share: async () => {} })
    await user.click(screen.getByRole('button', { name: 'Baixar imagem' }))
    await vi.waitFor(() => expect(screen.getByText(/Imagem baixada/)).toBeTruthy())
    expect(saveBlob).toHaveBeenCalledWith(expect.any(File), FILENAME)
    expect(events).toEqual([['share_opened', { has_picture: true }], ['image_downloaded', { how: 'download_button' }]])
  })

  it('"Copiar texto" copies the message and says it', async () => {
    const written: string[] = []
    setup({ clipboard: { writeText: (t: string) => (written.push(t), Promise.resolve()) } as unknown as Clipboard }, false)
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Copiar texto' }).getAttribute('hidden')).toBeNull())
    const copyBtns = document.querySelectorAll('[data-act="copy"]')
    console.log('copy buttons in DOM:', copyBtns.length, 'written before click:', written.length)
    fireEvent.click(screen.getByRole('button', { name: 'Copiar texto' }))
    await vi.waitFor(() => expect(screen.getByText('Texto copiado.')).toBeTruthy())
    console.log('after click: written =', JSON.stringify(written), 'len', written.length)
    expect(written[0]).toBe(TEXT)
    expect(events.filter(([n]) => n !== 'share_opened')).toEqual([])
  })

  it('when the copy fails it says so and does not fall back to anything', async () => {
    setup({ clipboard: {} as unknown as Clipboard }, false)
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Copiar texto' }).getAttribute('hidden')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: 'Copiar texto' }))
    await vi.waitFor(() => expect(screen.getByText(/Não foi possível copiar/)).toBeTruthy())
  })
})