import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import { base } from './helpers'

/* Gate 2 of #30/#39: /cara-a-cara/ in its fixture states at 390x844 (phone), 1440x900 (desktop frames) and 1920x1080 (modo duelo). Output: web/.captures/cara-a-cara/ (not committed). */
const CITIES = '?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista'
const STATES = '?nivel=estado&a=rj&b=sp'
const REGIONS = '?nivel=regiao&a=sudeste&b=centro-oeste'
const REPLY = '?nivel=cidade&a=rj/cidade-exemplo&resposta=1'
const SHOTS = [
  ['phone-cidade', CITIES, { width: 390, height: 844 }],
  ['phone-estado', STATES, { width: 390, height: 844 }],
  ['phone-regiao', REGIONS, { width: 390, height: 844 }],
  ['phone-resposta', REPLY, { width: 390, height: 844 }],
  ['desktop-cidade', CITIES, { width: 1440, height: 900 }],
  ['desktop-estado', STATES, { width: 1440, height: 900 }],
  ['desktop-regiao', REGIONS, { width: 1440, height: 900 }],
  ['desktop-resposta', REPLY, { width: 1440, height: 900 }],
  ['duelo-cidade', `${CITIES}&modo=duelo`, { width: 1920, height: 1080 }],
  ['duelo-estado', `${STATES}&modo=duelo`, { width: 1920, height: 1080 }],
] as const
for (const [name, q, size] of SHOTS)
  test(`capture cara-a-cara / ${name}`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.addInitScript(() => {
      localStorage.setItem('voto-a-voto:notice', 'acknowledged')
      Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true })
    })
    await page.goto(`${base}cara-a-cara/${q}`)
    await page.waitForSelector(name.endsWith('resposta') ? '[data-duel][data-places="1"]' : '[data-duel][data-ready="yes"]')
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(300)
    const dir = resolve('.captures', 'cara-a-cara')
    mkdirSync(dir, { recursive: true })
    const file = resolve(dir, `${name}.png`)
    await page.screenshot({ path: file, animations: 'disabled', fullPage: size.width === 1440 })
    writeFileSync(resolve(dir, `${name}.json`), JSON.stringify({ route: `cara-a-cara/${q}`, viewport: size, capture: file }, null, 2) + '\n')
  })
