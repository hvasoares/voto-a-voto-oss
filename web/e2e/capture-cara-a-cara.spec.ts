import { test } from '@playwright/test'
import { capture } from './capture'
import { base } from './helpers'
import { PHONE, DESKTOP, DUEL, acknowledgeNotice } from './presets'

/* Gate 2 of #30/#39: /cara-a-cara/ in its fixture states at 390x844 (phone), 1440x900 (desktop frames) and 1920x1080 (modo duelo). Output: web/.captures/cara-a-cara/ (not committed). */
const CITIES = '?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista'
const STATES = '?nivel=estado&a=rj&b=sp'
const REGIONS = '?nivel=regiao&a=sudeste&b=centro-oeste'
const REPLY = '?nivel=cidade&a=rj/cidade-exemplo&resposta=1'
const SHOTS = [
  ['phone-cidade', CITIES, PHONE],
  ['phone-estado', STATES, PHONE],
  ['phone-regiao', REGIONS, PHONE],
  ['phone-resposta', REPLY, PHONE],
  ['desktop-cidade', CITIES, DESKTOP],
  ['desktop-estado', STATES, DESKTOP],
  ['desktop-regiao', REGIONS, DESKTOP],
  ['desktop-resposta', REPLY, DESKTOP],
  ['duelo-cidade', `${CITIES}&modo=duelo`, DUEL],
  ['duelo-estado', `${STATES}&modo=duelo`, DUEL],
] as const
for (const [name, q, size] of SHOTS)
  test(`capture cara-a-cara / ${name}`, async ({ page }) => {
    await page.setViewportSize(size)
    await acknowledgeNotice(page)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true })
    })
    await page.goto(`${base}cara-a-cara/${q}`)
    await page.waitForSelector(name.endsWith('resposta') ? '[data-duel][data-places="1"]' : '[data-duel][data-ready="yes"]')
    await page.waitForTimeout(300)
    await capture(page, {
      dir: 'cara-a-cara',
      name,
      route: `cara-a-cara/${q}`,
      viewport: size,
      fullPage: size.width === 1440,
      omit: ['fullPage'],
    })
  })
