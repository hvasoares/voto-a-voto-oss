// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@/analytics'
import { loadCityShard } from '@/lib/shard-files'
import { saveBlob, svgToPng } from '@/lib/share-raster'
import CardGenerator from './CardGenerator'

vi.mock('@/lib/share-raster', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/share-raster')>()
  return { ...mod, svgToPng: vi.fn(async (_svg: string, name: string) => new File(['png-bytes'], name, { type: 'image/png' })), saveBlob: vi.fn() }
})

globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView = () => {}

const events: [string, unknown][] = []
const shard = (await loadCityShard('rj', 'cidade-exemplo'))!

beforeEach(() => {
  setAnalytics({ pageView() {}, event: (n, p) => void events.push([n, p]) } satisfies Analytics)
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (String(url).includes('/city/rj/cidade-exemplo.json') ? new Response(JSON.stringify(shard)) : new Response('', { status: 404 }))))
})
afterEach(() => {
  cleanup()
  setAnalytics(noopAnalytics)
  events.length = 0
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  history.replaceState(null, '', '/')
})

const open = async (search = '?cidade=rj/cidade-exemplo') => {
  history.replaceState(null, '', `/gerador/${search}`)
  const user = userEvent.setup()
  const { container } = render(<CardGenerator base="/" origin="https://votoavoto.exemplo.br" fixture={true} edition="2026-10-26" />)
  return { user, root: container.querySelector<HTMLElement>('[data-card-generator]')! }
}
const title = (root: HTMLElement) => root.querySelector('[data-preview-picture] svg title')?.textContent

describe('the card generator', () => {
  it('opens with the city of the address: its own shard is fetched, the picture is drawn with the generated words and the opening is counted', async () => {
    const { root } = await open()
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(title(root)).toMatch(/^\d+(,\d)?% do eleitorado de Cidade Exemplo não votou no \dº turno de 2026\.$/)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(events[0]).toEqual(['card_generator_opened', { has_city: true }])
    expect(root.querySelector('[data-preview-picture] svg')!.getAttribute('viewBox')).toBe('0 0 1080 1080')
  })

  it('without a city it asks for one and offers nothing to download', async () => {
    const { root } = await open('')
    expect(screen.getByText('Escolha uma cidade para ver o cartão.')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Baixar imagem quadrada' }) as HTMLButtonElement).disabled).toBe(true)
    expect(events[0]).toEqual(['card_generator_opened', { has_city: false }])
    expect(fetch).not.toHaveBeenCalled()
    expect(root.getAttribute('data-ready')).toBe('no')
  })

  it('a measure changes the number and the line; the address follows the choice', async () => {
    const { user, root } = await open()
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    await user.click(screen.getByRole('radio', { name: 'Margem em votos' }))
    expect(title(root)).toMatch(/^[\d.]+ votos separaram os dois candidatos mais votados em Cidade Exemplo/)
    expect(location.search).toBe('?cidade=rj/cidade-exemplo&medida=margem')
    await user.click(screen.getByRole('radio', { name: 'Comparecimento' }))
    expect(title(root)).toMatch(/compareceu no/)
  })

  it('each size is its own picture and its own download button; choosing one is counted', async () => {
    const { user, root } = await open()
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    for (const [label, box, button] of [['Story', '0 0 1080 1920', 'Baixar imagem Story'], ['Prévia de link', '0 0 1200 630', 'Baixar imagem de prévia'], ['Quadrado', '0 0 1080 1080', 'Baixar imagem quadrada']] as const) {
      await user.click(screen.getByRole('radio', { name: label }))
      expect(root.querySelector('[data-preview-picture] svg')!.getAttribute('viewBox')).toBe(box)
      expect(screen.getByRole('button', { name: button })).toBeTruthy()
    }
    expect(events.filter(([n]) => n === 'card_size_chosen').map(([, p]) => p)).toEqual([{ size: 'story' }, { size: 'preview' }, { size: 'square' }])
  })

  it('downloads the PNG at the size of the picture, counts it, and points at the alt text', async () => {
    const { user, root } = await open('?cidade=rj/cidade-exemplo&tamanho=story')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    await vi.waitFor(() => expect(svgToPng).toHaveBeenCalled())
    expect(vi.mocked(svgToPng).mock.calls.at(-1)![2]).toEqual({ width: 1080, height: 1920 })
    await user.click(screen.getByRole('button', { name: 'Baixar imagem Story' }))
    await vi.waitFor(() => expect(saveBlob).toHaveBeenCalled())
    const saved = vi.mocked(saveBlob).mock.calls[0]![1]
    expect(saved).toMatch(/^voto-a-voto-rj-cidade-exemplo-nao-votou-2026-turno-\d-story\.png$/)
    expect(events.at(-1)).toEqual(['card_image_downloaded', { size: 'story', measure: 'nonVoters' }])
    expect(root.querySelector('[data-status]')!.textContent).toContain('texto alternativo')
  })

  it('shares the picture and the link where files can be shared, and downloads where nothing can', async () => {
    const shared: ShareData[] = []
    vi.stubGlobal('navigator', { canShare: (d: ShareData) => !!d.files, share: async (d: ShareData) => void shared.push(d) })
    const { user, root } = await open()
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    await vi.waitFor(() => expect(svgToPng).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    await user.click(screen.getByRole('button', { name: 'Compartilhar' }))
    await vi.waitFor(() => expect(shared).toHaveLength(1))
    expect(shared[0]!.files![0]!.type).toBe('image/png')
    expect(shared[0]!.text).toContain('https://votoavoto.exemplo.br/rj/cidade-exemplo/')
    expect(events.at(-1)).toEqual(['share_completed', { method: 'files' }])
    cleanup()

    vi.stubGlobal('navigator', {})
    const again = await open()
    await vi.waitFor(() => expect(again.root.getAttribute('data-ready')).toBe('yes'))
    await again.user.click(screen.getByRole('button', { name: /Compartilhar/ }))
    await vi.waitFor(() => expect(saveBlob).toHaveBeenCalled())
  })

  it('copies the alt text, and shows it when the clipboard refuses', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { root } = await open()
    // (userEvent.setup() installs its own clipboard stub over navigator; a plain click keeps ours)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    fireEvent.click(screen.getByRole('button', { name: 'Copiar texto alternativo' }))
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith(title(root)))
    await vi.waitFor(() => expect(root.querySelector('[data-status]')!.textContent).toBe('Texto alternativo copiado.'))
    writeText.mockRejectedValueOnce(new Error('denied'))
    fireEvent.click(screen.getByRole('button', { name: 'Copiar texto alternativo' }))
    await vi.waitFor(() => expect(root.querySelector('[data-status]')!.textContent).toContain(title(root)!))
  })

  it('a city whose shard cannot be fetched says so and offers nothing to download', async () => {
    const { root } = await open('?cidade=rj/nao-existe')
    await vi.waitFor(() => expect(screen.getByText('Não foi possível carregar os dados desta cidade agora.')).toBeTruthy())
    expect(root.getAttribute('data-ready')).toBe('no')
  })

  it('a measure the city does not have says so instead of drawing a made-up number', async () => {
    const lonely = structuredClone(shard)
    for (const ano of Object.keys(lonely.cycles)) for (const t of Object.keys(lonely.cycles[ano]!)) lonely.cycles[ano]![t]!.votes = { '91': 100 }
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(lonely))))
    const { user, root } = await open('?cidade=rj/cidade-exemplo&medida=margem')
    await vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
    expect(title(root)).toMatch(/^Esta medida não se aplica a Cidade Exemplo/)
    void user
  })
})
