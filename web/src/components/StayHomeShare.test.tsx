// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { noopAnalytics, setAnalytics, type Analytics } from '@/analytics'
import StayHomeShare from './StayHomeShare'

vi.mock('@/lib/share-raster', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/share-raster')>()
  return { ...mod, svgToPng: vi.fn(async (_svg: string, name: string) => new File(['png'], name, { type: 'image/png' })), saveBlob: vi.fn() }
})

const events: [string, unknown][] = []
afterEach(() => {
  cleanup()
  setAnalytics(noopAnalytics)
  events.length = 0
  vi.unstubAllGlobals()
})

describe('StayHomeShare', () => {
  const props = { ano: 2022, turno: 2, text: 'Parcela dos eleitores. https://x.test/mapa/ficaram-em-casa/2022-2/', svg: '<svg xmlns="http://www.w3.org/2000/svg"/>', filename: 'voto-a-voto-ficaram-em-casa-2022-2.png', link: 'https://x.test/mapa/ficaram-em-casa/2022-2/', label: 'Compartilhar o mapa' }

  it('counts a completed share and sends the picture with the sentence and the link', async () => {
    const calls: ShareData[] = []
    setAnalytics({ pageView() {}, event: (n, p) => void events.push([n, p]) } satisfies Analytics)
    vi.stubGlobal('navigator', { canShare: () => true, share: (d: ShareData) => (calls.push(d), Promise.resolve()) })
    render(<StayHomeShare {...props} />)
    const actions = document.querySelector('[data-share-actions]')!
    await vi.waitFor(() => expect(actions.getAttribute('data-png')).toBe('ready'))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Compartilhar o mapa' }))
    await vi.waitFor(() => expect(events).toContainEqual(['stayhome_shared', { ciclo: 2022, turno: 2 }]))
    expect(calls[0]!.files![0]!.name).toBe('voto-a-voto-ficaram-em-casa-2022-2.png')
    expect(calls[0]!.text).toContain('https://x.test/mapa/ficaram-em-casa/2022-2/')
  })
})
