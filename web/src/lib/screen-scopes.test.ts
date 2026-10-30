import { describe, expect, it } from 'vitest'
import { qrScreenConfig, shareScreenConfig, type ScreenScope } from './screen-scopes'

/*
 * The scopes of the QR screens and share sheets (#137) as data: one config per scope, built over the committed fixture dataset. These tests read the
 * data, not the markup (the markup is compared page by page by the identity tool); the interesting facts are what differs per scope and that
 * an unknown scope cannot be written.
 */
const DEMO: ScreenScope = { scope: 'demo' }
const BRASIL: ScreenScope = { scope: 'brasil' }

describe('qrScreenConfig', () => {
  it('the demo points home and at the demo sheet, and is the only noindex scope', async () => {
    const demo = await qrScreenConfig(DEMO)
    const brasil = await qrScreenConfig(BRASIL)
    expect(demo).toMatchObject({ cityName: 'Cidade Exemplo', closeHref: '/', backHref: '/compartilhar/', noindex: true })
    expect(brasil).toMatchObject({ cityName: 'Brasil', closeHref: '/brasil/', backHref: '/brasil/compartilhar/', noindex: false })
  })

  it('the QR draws the canonical link of the scope', async () => {
    expect((await qrScreenConfig(DEMO)).url).toMatch(/\/rj\/cidade-exemplo\/$/)
    expect((await qrScreenConfig(BRASIL)).url).toMatch(/\/brasil\/$/)
    expect((await qrScreenConfig(DEMO)).qr).toMatch(/^<svg\b/)
  })
})

describe('shareScreenConfig', () => {
  it('the demo is a noindex sheet in the flow over a stand-in, with the pre-rendered picture and ShareActions', async () => {
    const demo = await shareScreenConfig(DEMO)
    expect(demo).toMatchObject({ noindex: true, wrapper: { tag: 'main' }, dim: false, qrHref: '/qr/', backdrop: { ticket: '50 to replace' } })
    expect(demo.body.svg).toMatch(/^<svg\b/)
    expect(demo.generatorHref).toBe('/gerador/?cidade=rj/cidade-exemplo')
  })

  it('Brasil is a fixed sheet with ShareActions, the page description, no generator link', async () => {
    const brasil = await shareScreenConfig(BRASIL)
    expect(brasil).toMatchObject({ noindex: false, dim: true, qrHref: '/brasil/qr/', sheet: { view: 'brasil' }, footer: { aboutClass: expect.stringContaining('min-h') } })
    expect(brasil.body.svg).toMatch(/^<svg\b/)
    expect(brasil.description).toBeTruthy()
    expect(brasil.generatorHref).toBeUndefined()
  })

  it('a third scope is a type error: an unknown scope name does not compile', () => {
    // @ts-expect-error 'estado' is not a scope: add its builder to QR_SCOPES and SHARE_SCOPES first
    const unknown: ScreenScope = { scope: 'estado' }
    expect(unknown.scope).toBe('estado')
  })
})
