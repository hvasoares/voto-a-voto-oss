// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@/analytics'
import { loadDuelData } from '@/lib/duel-data'
import type { DuelData } from '@/lib/duel-model'
import { loadCityShard } from '@/lib/shard-files'
import Duel from './Duel'

vi.mock('@/lib/share-raster', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/share-raster')>()
  return { ...mod, svgToPng: vi.fn(async (_s: string, name: string) => new File(['png'], name, { type: 'image/png' })), saveBlob: vi.fn() }
})
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView = () => {}

const events: [string, unknown][] = []
const codes = ['rj/cidade-exemplo', 'sp/cidade-exemplo-paulista', 'mt/boa-esperanca-do-norte'] as const
const shards = Object.fromEntries(await Promise.all(codes.map(async (c) => [c, (await loadCityShard(...(c.split('/') as [string, string])))!])))
let data: DuelData
beforeAll(async () => {
  data = await loadDuelData()
})
beforeEach(() => {
  setAnalytics({ pageView() {}, event: (n, p) => void events.push([n, p]) } satisfies Analytics)
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('search.json')) return new Response(JSON.stringify([['Cidade Exemplo', 'cidade-exemplo', 'rj'], ['Cidade Exemplo Paulista', 'cidade-exemplo-paulista', 'sp'], ['Boa Esperança do Norte', 'boa-esperanca-do-norte', 'mt']]))
    const hit = Object.entries(shards).find(([k]) => String(url).includes(`/city/${k}.json`))
    return hit ? new Response(JSON.stringify(hit[1])) : new Response('', { status: 404 })
  }))
})
afterEach(() => {
  cleanup()
  setAnalytics(noopAnalytics)
  events.length = 0
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/')
})

const open = (q: string) => {
  history.replaceState(null, '', `/cara-a-cara/${q}`)
  const { container } = render(<Duel base="/" origin="https://votoavoto.exemplo.br" fixture={true} editionDate="27/10/2026" data={data} />)
  return container.querySelector<HTMLElement>('[data-duel]')!
}
const duelEvents = () => events.filter(([n]) => n.startsWith('duel_'))
const ready = (root: HTMLElement) => vi.waitFor(() => expect(root.getAttribute('data-ready')).toBe('yes'))
const rowText = (root: HTMLElement, key: string, side: 'a' | 'b') => root.querySelector(`[data-rows] [data-measure="${key}"] [data-side="${side}"]`)!.textContent

describe('Cara a cara: the address reproduces the card, level by level', () => {
  it('cities: reads the two places, shows the four measures of the city and marks the higher value of each', async () => {
    const root = open('?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista')
    await ready(root)
    expect([...root.querySelectorAll('[data-rows] [data-measure]')].map((m) => m.getAttribute('data-measure'))).toEqual(['comparecimento', 'margem', 'virada', 'naoVotaram'])
    for (const m of root.querySelectorAll('[data-rows] [data-measure]')) expect(m.querySelectorAll('[data-higher]').length).toBeLessThanOrEqual(1)
    // the mark says what it means to a screen reader, and it is not colour alone (the underline is a border, the words are there)
    const marked = root.querySelector('[data-rows] [data-higher]')!
    expect(marked.textContent).toContain('maior valor nesta medida')
    expect(location.search).toBe('?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista')
  })
  it.each([
    ['estado', '?nivel=estado&a=rj&b=sp', ['comparecimento', 'diferenca', 'viradaTurnos', 'naoVotaram']],
    ['regiao', '?nivel=regiao&a=sudeste&b=centro-oeste', ['comparecimento', 'naoCompareceram', 'diferenca', 'peso']],
  ])('%s: the measures of the level, from the data that came with the page', async (_level, q, measures) => {
    const root = open(q)
    await ready(root)
    expect([...root.querySelectorAll('[data-rows] [data-measure]')].map((m) => m.getAttribute('data-measure'))).toEqual(measures)
    expect(fetch).not.toHaveBeenCalled()
    expect(location.search).toBe(q)
  })
  it('the unsigned gap between the two candidates prints no sign and no side', async () => {
    const root = open('?nivel=estado&a=rj&b=sp')
    await ready(root)
    for (const side of ['a', 'b'] as const) expect(rowText(root, 'diferenca', side)).toMatch(/^\d+,\d pp/)
  })
})

describe('Cara a cara: choosing', () => {
  it('picking the second city updates the address, draws the card and counts the pair with the level only', async () => {
    const root = open('?nivel=cidade&a=rj/cidade-exemplo')
    await vi.waitFor(() => expect(root.getAttribute('data-places')).toBe('1'))
    expect(root.getAttribute('data-ready')).toBe('no')
    const user = userEvent.setup()
    await user.type(screen.getByRole('combobox', { name: 'Cidade B' }), 'exemplo paulista')
    await user.click(await screen.findByText('Cidade Exemplo Paulista', { selector: '[data-place-option] span' }))
    await ready(root)
    expect(location.search).toBe('?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista')
    expect(duelEvents()).toEqual([['duel_pair_chosen', { level: 'cidade' }]])
  })
  it('picking two states with the lists counts one pair at the state level', async () => {
    const root = open('?nivel=estado')
    const user = userEvent.setup()
    await user.selectOptions(screen.getByRole('combobox', { name: 'Estado A' }), 'rj')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Estado B' }), 'sp')
    await ready(root)
    expect(location.search).toBe('?nivel=estado&a=rj&b=sp')
    expect(duelEvents()).toEqual([['duel_pair_chosen', { level: 'estado' }]])
  })
  it('switching the level resets the pair, empties the address and says so', async () => {
    const root = open('?nivel=estado&a=rj&b=sp')
    await ready(root)
    fireEvent.click(within(root).getByRole('button', { name: 'Região' }))
    await vi.waitFor(() => expect(root.getAttribute('data-level')).toBe('regiao'))
    expect(root.getAttribute('data-places')).toBe('0')
    expect(location.search).toBe('?nivel=regiao')
    expect(screen.getByText('Ao trocar o nível, os dois lugares foram esvaziados.')).toBeTruthy()
  })
  it('switching with nothing chosen says nothing about a reset', async () => {
    const root = open('?nivel=estado')
    fireEvent.click(within(root).getByRole('button', { name: 'Região' }))
    await vi.waitFor(() => expect(root.getAttribute('data-level')).toBe('regiao'))
    expect(screen.queryByText(/foram esvaziados/)).toBeNull()
  })
})

describe('Cara a cara: the cases that need a clear message', () => {
  it('the same place twice: no card, and the message names the place', async () => {
    const root = open('?nivel=estado&a=rj&b=rj')
    await vi.waitFor(() => expect(screen.getByText(/Escolha dois lugares diferentes: Rio de Janeiro · RJ está nos dois campos\./)).toBeTruthy())
    expect(root.getAttribute('data-ready')).toBe('no')
    expect(root.querySelector('[data-rows]')).toBeNull()
  })
  it('the same city twice too', async () => {
    const root = open('?nivel=cidade&a=rj/cidade-exemplo&b=rj/cidade-exemplo')
    await vi.waitFor(() => expect(screen.getByText(/Escolha dois lugares diferentes/)).toBeTruthy())
    expect(root.getAttribute('data-ready')).toBe('no')
  })
  it('a place with no 2nd round of the cycle: no card, and the message names the place and the cycle', async () => {
    const shard = structuredClone(shards['sp/cidade-exemplo-paulista']!)
    delete shard.cycles['2026']!['2']
    shards['sp/cidade-exemplo-paulista'] = shard
    const root = open('?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista')
    await vi.waitFor(() => expect(screen.getByText('Cidade Exemplo Paulista · SP não tem dados do 2º turno de 2026.')).toBeTruthy())
    expect(root.getAttribute('data-ready')).toBe('no')
    shards['sp/cidade-exemplo-paulista'] = (await loadCityShard('sp', 'cidade-exemplo-paulista'))!
  })
  it('a city without the earlier round keeps the card and says its swing has no value', async () => {
    const root = open('?nivel=cidade&a=rj/cidade-exemplo&b=mt/boa-esperanca-do-norte')
    await ready(root)
    expect(rowText(root, 'virada', 'b')).toContain('—')
    expect(screen.getByText('Boa Esperança do Norte · MT não tem o 2º turno de 2022: a virada fica sem valor.')).toBeTruthy()
    expect(root.querySelector('[data-measure="virada"] [data-higher]')).toBeNull()
  })
  it('an overseas post is never a state or a region: the field stays empty, with a message', async () => {
    const root = open('?nivel=estado&a=zz&b=sp')
    await vi.waitFor(() => expect(screen.getByText(/Os postos do exterior não são um estado nem uma região/)).toBeTruthy())
    expect(root.getAttribute('data-places')).toBe('1')
    expect((screen.getByRole('combobox', { name: 'Estado A' }) as HTMLSelectElement).value).toBe('')
    expect([...(screen.getByRole('combobox', { name: 'Estado A' }) as HTMLSelectElement).options].map((o) => o.value)).not.toContain('zz')
    open('?nivel=regiao&a=exterior')
    expect([...(screen.getAllByRole('combobox', { name: 'Região A' })[0] as HTMLSelectElement).options].map((o) => o.value)).not.toContain('exterior')
  })
  it('a state the data does not have empties the field and says so', async () => {
    const root = open('?nivel=estado&a=xx&b=sp')
    await vi.waitFor(() => expect(root.getAttribute('data-places')).toBe('1'))
    expect(location.search).toBe('?nivel=estado&b=sp')
  })
  it('a city whose data cannot be read says so', async () => {
    open('?nivel=cidade&a=rj/cidade-exemplo&b=rj/nao-existe')
    await vi.waitFor(() => expect(screen.getByText(/Os dados de um dos lugares não carregaram agora/)).toBeTruthy())
  })
})

describe('Cara a cara: modo duelo', () => {
  it('is the same card without the chrome: the same numbers, the seal on screen, Esc leaves', async () => {
    const root = open('?nivel=estado&a=rj&b=sp&modo=duelo')
    const mode = await vi.waitFor(() => {
      const el = root.querySelector<HTMLElement>('[data-duel-mode]')
      expect(el).toBeTruthy()
      return el!
    })
    for (const key of ['comparecimento', 'diferenca', 'viradaTurnos', 'naoVotaram'])
      for (const side of ['a', 'b'] as const) expect(mode.querySelector(`[data-measure="${key}"][data-side="${side}"] [data-value]`)!.textContent).toBe(rowText(root, key, side))
    expect(mode.querySelector('[data-seal]')!.textContent).toMatch(/^EXEMPLO · dados fictícios, fonte real: TSE · edição 27\/10\/2026 · votoavoto\.exemplo\.br\/cara-a-cara\/\?nivel=estado&a=rj&b=sp$/)
    fireEvent.keyDown(window, { key: 'Escape' })
    await vi.waitFor(() => expect(root.querySelector('[data-duel-mode]')).toBeNull())
    expect(location.search).toBe('?nivel=estado&a=rj&b=sp')
  })
  it('opens from the card, keeps the level in the address and counts it with the level', async () => {
    const root = open('?nivel=regiao&a=sudeste&b=centro-oeste')
    await ready(root)
    fireEvent.click(within(root).getAllByRole('button', { name: /Modo duelo/ })[0]!)
    await vi.waitFor(() => expect(root.querySelector('[data-duel-mode]')).toBeTruthy())
    expect(location.search).toBe('?nivel=regiao&a=sudeste&b=centro-oeste&modo=duelo')
    expect(duelEvents()).toEqual([['duel_mode_opened', { level: 'regiao' }]])
  })
  it('works at the city level, with the two cities as the names', async () => {
    const root = open('?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista&modo=duelo')
    const mode = await vi.waitFor(() => {
      const el = root.querySelector<HTMLElement>('[data-duel-mode]')
      expect(el).toBeTruthy()
      return el!
    })
    expect(mode.querySelector('[data-duel-place="a"]')!.textContent).toContain('Cidade Exemplo · RJ')
    expect(mode.querySelector('[data-duel-place="b"]')!.textContent).toContain('Cidade Exemplo Paulista · SP')
  })
  it('the mode parameter alone, with no card, shows no mode', async () => {
    const root = open('?nivel=estado&a=rj&modo=duelo')
    await vi.waitFor(() => expect(root.getAttribute('data-places')).toBe('1'))
    expect(root.querySelector('[data-duel-mode]')).toBeNull()
  })
})

describe('Cara a cara: sharing', () => {
  it('shares the picture and the link with the level and the places, and counts it with the level', async () => {
    const root = open('?nivel=estado&a=rj&b=sp')
    await ready(root)
    const share = vi.fn(async () => undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    cleanup()
    const again = open('?nivel=estado&a=rj&b=sp')
    await ready(again)
    await vi.waitFor(() => expect(again.querySelector('[data-share-actions]')!.getAttribute('data-png')).toBe('ready'))
    fireEvent.click(screen.getByRole('button', { name: 'Compartilhar o cara a cara' }))
    await vi.waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    const sent = (share.mock.calls[0] as unknown as [ShareData])[0]
    expect(sent.text).toContain('https://votoavoto.exemplo.br/cara-a-cara/?nivel=estado&a=rj&b=sp')
    expect(sent.files?.[0]?.name).toBe('voto-a-voto-cara-a-cara-estado.png')
    await vi.waitFor(() => expect(duelEvents()).toContainEqual(['duel_shared', { level: 'estado' }]))
    Reflect.deleteProperty(navigator, 'share')
    Reflect.deleteProperty(navigator, 'canShare')
  })
})

describe('E a sua cidade? (#39): the reply', () => {
  it('opens with the sender\'s city in A, the search of B in focus, and counts the start once', async () => {
    const root = open('?nivel=cidade&a=rj/cidade-exemplo&resposta=1')
    await vi.waitFor(() => expect(duelEvents()).toEqual([['duel_reply_started', undefined]]))
    expect(screen.getByText('Cidade Exemplo já está preenchida. Escolha a sua.')).toBeTruthy()
    expect((screen.getByRole('combobox', { name: 'Cidade A' }) as HTMLInputElement).value).toBe('Cidade Exemplo · RJ')
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Cidade B' }))
    expect(screen.getByRole('button', { name: 'E a sua cidade?' })).toBeTruthy()
    expect(screen.getByText(/Abre o cara a cara com Cidade Exemplo já preenchida/)).toBeTruthy()
    // the sender's figures are there, the second column is "—"
    expect(rowText(root, 'comparecimento', 'b')).toContain('—')
    expect(rowText(root, 'comparecimento', 'a')).toMatch(/^\d+%/)
  })
  it('choosing the second city completes it: the card is there, the address is the plain card (no reply flag), and the share can go back', async () => {
    const root = open('?nivel=cidade&a=rj/cidade-exemplo&resposta=1')
    await vi.waitFor(() => expect(duelEvents()).toHaveLength(1))
    const user = userEvent.setup()
    await user.type(screen.getByRole('combobox', { name: 'Cidade B' }), 'exemplo paulista')
    await user.click(await screen.findByText('Cidade Exemplo Paulista', { selector: '[data-place-option] span' }))
    await ready(root)
    expect(location.search).toBe('?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista')
    expect(duelEvents()).toEqual([['duel_reply_started', undefined], ['duel_pair_chosen', { level: 'cidade' }], ['duel_reply_completed', undefined]])
    expect(root.querySelector('[data-share-actions]')).toBeTruthy()
    expect(screen.getByText('Pronto: agora você pode compartilhar o cartão de volta.')).toBeTruthy()
  })
  it('a plain card has no reply started; its "E a sua cidade?" link points at the reply address with the first city', async () => {
    const root = open('?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista')
    await ready(root)
    expect(duelEvents()).toEqual([])
    expect(root.querySelector('[data-duel-reply]')!.getAttribute('href')).toBe('/cara-a-cara/?nivel=cidade&a=rj/cidade-exemplo&resposta=1')
  })
  it('the reply button is only for cities: a state card has none', async () => {
    const root = open('?nivel=estado&a=rj&b=sp')
    await ready(root)
    expect(root.querySelector('[data-duel-reply]')).toBeNull()
  })
})
