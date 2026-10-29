import { describe, expect, it } from 'vitest'
import { qrScreenConfig, shareScreenConfig, type ScreenScope } from './screen-scopes'

/*
 * The scopes of the QR screens and share sheets (#137) as data: one config per scope, built over the committed fixture dataset. These tests read the
 * data, not the markup (the markup is compared page by page by the identity tool); the interesting facts are what differs per scope and that
 * an unknown scope cannot be written.
 */
const DEMO: ScreenScope = { scope: 'demo' }
const CITY: ScreenScope = { scope: 'city', uf: 'rj', slug: 'cidade-exemplo', nome: 'CIDADE EXEMPLO' }
const BRASIL: ScreenScope = { scope: 'brasil' }

describe('qrScreenConfig', () => {
  it('the demo points home and at the demo sheet, and is the only noindex scope', async () => {
    const demo = await qrScreenConfig(DEMO)
    const city = await qrScreenConfig(CITY)
    const brasil = await qrScreenConfig(BRASIL)
    expect(demo).toMatchObject({ cityName: 'Cidade Exemplo', closeHref: '/', backHref: '/compartilhar/', noindex: true })
    expect(city).toMatchObject({ cityName: 'Cidade Exemplo', closeHref: '/rj/cidade-exemplo/', backHref: '/rj/cidade-exemplo/compartilhar/', noindex: false })
    expect(brasil).toMatchObject({ cityName: 'Brasil', closeHref: '/brasil/', backHref: '/brasil/compartilhar/', noindex: false })
  })

  it('the QR draws the canonical link of the scope', async () => {
    expect((await qrScreenConfig(CITY)).url).toMatch(/\/rj\/cidade-exemplo\/$/)
    expect((await qrScreenConfig(DEMO)).url).toBe((await qrScreenConfig(CITY)).url)
    expect((await qrScreenConfig(BRASIL)).url).toMatch(/\/brasil\/$/)
    expect((await qrScreenConfig(CITY)).qr).toMatch(/^<svg\b/)
  })
})

describe('shareScreenConfig', () => {
  it('the demo is a noindex sheet in the flow over a stand-in, with the pre-rendered picture and ShareActions', async () => {
    const demo = await shareScreenConfig(DEMO)
    expect(demo).toMatchObject({ noindex: true, wrapper: { tag: 'main' }, dim: false, qrHref: '/qr/', backdrop: { ticket: '50 to replace' } })
    expect(demo.body.kind).toBe('actions')
    expect(demo.generatorHref).toBe('/gerador/?cidade=rj/cidade-exemplo')
    expect(demo.texts).toBeUndefined()
  })

  it('the city is a fixed sheet over the city card with the ShareSheet island, the generator link and the ready-made texts', async () => {
    const city = await shareScreenConfig(CITY)
    expect(city).toMatchObject({ noindex: false, wrapper: { tag: 'div' }, dim: true, qrHref: '/rj/cidade-exemplo/qr/', close: { href: '/rj/cidade-exemplo/', cross: true } })
    expect(city.body.kind).toBe('sheet')
    expect(city.generatorHref).toBe('/gerador/?cidade=rj/cidade-exemplo')
    expect(city.texts?.stateHref).toBe('/textos/rj.txt')
  })

  it('Brasil is a fixed sheet with ShareActions, the page description, no generator link and no texts', async () => {
    const brasil = await shareScreenConfig(BRASIL)
    expect(brasil).toMatchObject({ noindex: false, dim: true, qrHref: '/brasil/qr/', sheet: { view: 'brasil' }, footer: { aboutClass: expect.stringContaining('min-h') } })
    expect(brasil.body.kind).toBe('actions')
    expect(brasil.description).toBeTruthy()
    expect(brasil.generatorHref).toBeUndefined()
    expect(brasil.texts).toBeUndefined()
  })

  it('a fourth scope is a type error: an unknown scope name does not compile', () => {
    // @ts-expect-error 'estado' is not a scope: add its builder to QR_SCOPES and SHARE_SCOPES first
    const unknown: ScreenScope = { scope: 'estado' }
    expect(unknown.scope).toBe('estado')
  })
})
