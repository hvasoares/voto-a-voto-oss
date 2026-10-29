// @vitest-environment jsdom
/**
 * data-ready of the share sheet (#122): no on the server (the browser storage has not answered), yes once
 * the guess question has been read — from then on the picture on screen is the final one. A query view can
 * still re-fetch the shard afterwards and falls back to the pre-rendered content; the gate has no part in it.
 */
import { render } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildCityResult } from '@/shared/city-model'
import { shareContent } from '@/lib/share-model'
import ShareSheet from './ShareSheet'

vi.mock('@/lib/share-raster', () => ({
  svgToPng: vi.fn(async (_s: string, name: string) => new File(['png'], name, { type: 'image/png' })),
  saveBlob: vi.fn(),
}))

const props = {
  uf: 'rj',
  slug: 'cidade-exemplo',
  view: { ano: 2026, turno: 2 as const },
  initial: null,
  origin: 'https://o.exemplo.br',
  base: '/',
  fixture: true,
  edition: '26/10/2026',
  question: { kind: 'same' as const, arc: { kind: 'same' as const }, overseas: false, answer: false },
  cityName: 'Cidade Exemplo',
}

afterEach(() => {
  vi.unstubAllGlobals()
  history.replaceState(null, '', '/rj/cidade-exemplo/compartilhar/')
  localStorage.clear()
})

describe('the share sheet island', () => {
  it('data-ready: no on the server and before storage answers, yes once the guess question is read', async () => {
    expect(renderToStaticMarkup(<ShareSheet {...props} />)).toContain('data-ready="no"')
    history.replaceState(null, '', '/rj/cidade-exemplo/compartilhar/')
    render(<ShareSheet {...props} />)
    const node = () => document.querySelector('[data-share-picture], [data-nodata]')!
    await vi.waitFor(() => expect(node().getAttribute('data-ready')).toBe('yes'))
    expect(node().getAttribute('data-error')).toBeNull()
    // no guess kept here: the nodata card of the pre-rendered view stays.
    expect(node().getAttribute('data-nodata')).not.toBeNull()
  })

  it('with a guess kept, both cards are drawn, each with its own actions, and the city card keeps its normal picture', async () => {
    localStorage.setItem('voto-a-voto:guess', '{"rj/cidade-exemplo":"yes"}')
    const result = buildCityResult({
      turnout: { ano: 2026, turno: 2, uf: 'rj', cdMunicipio: '1', aptos: 1000, comparecimento: 900, abstencoes: 100, brancos: 0, nulos: 0, anuladosApuSep: 0, validos: 900 },
      votes: [1, 2].map((n, i) => ({ ano: 2026, turno: 2 as const, uf: 'rj', cdMunicipio: '1', candidatoNumero: n, votos: 500 - i * 100 })),
      candidates: [1, 2].map((n) => ({ ano: 2026, turno: 2 as const, candidatoNumero: n, nomeUrna: `C${n}`, partido: 'P' })),
    })
    const initial = shareContent(result, { uf: 'rj', slug: 'cidade-exemplo', nome: 'Cidade Exemplo' }, { origin: props.origin, base: props.base, fixture: true })
    render(<ShareSheet {...props} initial={initial} />)
    await vi.waitFor(() => expect(document.querySelectorAll('[data-card-block]')).toHaveLength(2))
    expect([...document.querySelectorAll('[data-share-picture]')].map((n) => n.getAttribute('data-card'))).toEqual(['guess', 'city'])
    expect(document.querySelectorAll('[data-share-actions]')).toHaveLength(2)
    expect(document.querySelector('[data-card-block="guess"] [data-act="share"]')!.textContent).toBe('Compartilhar o palpite')
    expect(document.querySelector('[data-card-block="city"] [data-act="share"]')!.textContent).toBe('Compartilhar')
  })
})
