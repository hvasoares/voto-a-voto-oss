import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations } from './helpers'

/*
 * Cara a cara (#30) over the fixture dataset at 390x844: the entry link of the city card, the address that reproduces the card at each level,
 * the level switch, the cases with a message, the share flow and modo duelo. navigator.share is stubbed: a real system sheet cannot be driven here.
 */
const route = (q = '') => `${base}cara-a-cara/${q}`
const CITIES = '?nivel=cidade&a=rj/cidade-exemplo&b=sp/cidade-exemplo-paulista'
const STATES = '?nivel=estado&a=rj&b=sp'
const REGIONS = '?nivel=regiao&a=sudeste&b=centro-oeste'

async function open(page: Page, q = '', share: 'files' | 'none' = 'none') {
  await page.addInitScript((m) => {
    const w = window as unknown as { __shares: unknown[] }
    w.__shares = []
    if (m === 'none') return void Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
    Object.defineProperty(navigator, 'share', { configurable: true, value: (d: ShareData) => (w.__shares.push({ files: (d.files ?? []).map((f) => f.name), text: d.text }), Promise.resolve()) })
  }, share)
  await page.goto(route(q))
  await page.waitForFunction(() => document.querySelector('[data-duel]'))
}
const root = (page: Page) => page.locator('[data-duel]')
const ready = (page: Page) => expect(root(page)).toHaveAttribute('data-ready', 'yes')
const cell = (page: Page, key: string, side: 'a' | 'b') => page.locator(`[data-duel] > [data-rows] [data-measure="${key}"] [data-side="${side}"]`)

test.describe('Cara a cara: the entry point', () => {
  test('the city card has "Comparar com outra cidade", which opens the head-to-head with that city prefilled as A', async ({ page }) => {
    await page.goto(`${base}rj/cidade-exemplo/`)
    await page.getByRole('link', { name: /Comparar com outra cidade/ }).click()
    await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(route('?nivel=cidade&a=rj/cidade-exemplo'))
    await expect(page.getByRole('heading', { level: 1, name: 'Cara a cara' })).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Cidade A' })).toHaveValue('Cidade Exemplo · RJ')
    await expect(page.getByRole('combobox', { name: 'Cidade B' })).toHaveValue('')
  })
})

test.describe('Cara a cara: the address reproduces the card', () => {
  for (const [level, q, measures] of [
    ['cidade', CITIES, ['COMPARECIMENTO', 'MARGEM EM VOTOS', 'VIRADA DESDE 2022', 'NÃO VOTARAM']],
    ['estado', STATES, ['COMPARECIMENTO', 'DIFERENÇA ENTRE OS DOIS CANDIDATOS', 'VIRADA ENTRE O 1º E O 2º TURNO', 'NÃO VOTARAM']],
    ['regiao', REGIONS, ['COMPARECIMENTO', 'NÃO COMPARECERAM', 'DIFERENÇA ENTRE OS DOIS CANDIDATOS', 'PESO NOS VOTOS VÁLIDOS DO PAÍS']],
  ] as const) {
    test(`${level}: the four measures of the level; reloading gives the same card`, async ({ page }) => {
      await open(page, q)
      await ready(page)
      const labels = await page.locator('[data-duel] > [data-rows] .duel-label').allTextContents()
      expect(labels.map((l) => l.toUpperCase())).toEqual(measures)
      const before = await page.locator('[data-duel] > [data-rows]').innerText()
      await page.reload()
      await ready(page)
      expect(await page.locator('[data-duel] > [data-rows]').innerText()).toBe(before)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    })
  }

  test('the marks are a bar and words, one per measure at most, on the higher value', async ({ page }) => {
    await open(page, STATES)
    await ready(page)
    for (const m of await page.locator('[data-duel] > [data-rows] [data-measure]').all()) {
      const marks = m.locator('[data-higher]')
      expect(await marks.count()).toBeLessThanOrEqual(1)
      if (await marks.count()) {
        await expect(marks).toContainText('maior valor nesta medida')
        expect(await marks.evaluate((e) => getComputedStyle(e, '::after').height)).toBe('3px')
      }
    }
  })

  test('the gap between the two candidates has no sign and no side', async ({ page }) => {
    await open(page, STATES)
    await ready(page)
    for (const side of ['a', 'b'] as const) await expect(cell(page, 'diferenca', side)).toHaveText(/^\d+,\d pp/)
  })
})

test.describe('Cara a cara: choosing and switching', () => {
  test('picking a city fetches only its own shard; the address follows', async ({ page }) => {
    const seen = collectRequests(page)
    await open(page, '?nivel=cidade&a=rj/cidade-exemplo')
    await page.getByRole('combobox', { name: 'Cidade B' }).fill('exemplo paulista')
    await page.locator('[data-place-option]', { hasText: 'Cidade Exemplo Paulista' }).click()
    await ready(page)
    expect(new URL(page.url()).search).toBe(CITIES)
    const data = seen.map((r) => new URL(r.url).pathname).filter((p) => /\/city\//.test(p))
    expect(data).toEqual([expect.stringMatching(/\/city\/rj\/cidade-exemplo\.json$/), expect.stringMatching(/\/city\/sp\/cidade-exemplo-paulista\.json$/)])
    expect(violations(seen, [new URL(page.url()).origin])).toEqual([])
  })

  test('two states from the lists fetch no data at all (they came with the page)', async ({ page }) => {
    await open(page, '?nivel=estado')
    const seen = collectRequests(page)
    await page.getByRole('combobox', { name: 'Estado A' }).selectOption('rj')
    await page.getByRole('combobox', { name: 'Estado B' }).selectOption('sp')
    await ready(page)
    expect(new URL(page.url()).search).toBe(STATES)
    expect(seen.filter((r) => /\/data\//.test(r.url))).toEqual([])
  })

  test('switching the level resets the pair and says so', async ({ page }) => {
    await open(page, STATES)
    await ready(page)
    await page.getByRole('button', { name: 'Região' }).click()
    await expect(page.getByText('Ao trocar o nível, os dois lugares foram esvaziados.')).toBeVisible()
    expect(new URL(page.url()).search).toBe('?nivel=regiao')
    await expect(root(page)).toHaveAttribute('data-places', '0')
  })

  test('the same place twice, an overseas post as a state, and a malformed address say what is wrong, never an error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await open(page, '?nivel=estado&a=rj&b=rj')
    await expect(page.getByText(/Escolha dois lugares diferentes/)).toBeVisible()
    await open(page, '?nivel=estado&a=zz&b=sp')
    await expect(page.getByText(/Os postos do exterior não são um estado nem uma região/)).toBeVisible()
    await open(page, '?nivel=regiao&a=../../x&b=%E0%A4%A')
    await expect(page.getByText('Escolha os dois lugares para ver o cara a cara.')).toBeVisible()
    expect(errors).toEqual([])
  })

  test('a city without the earlier round keeps the card and says its swing has no value', async ({ page }) => {
    await open(page, '?nivel=cidade&a=rj/cidade-exemplo&b=mt/boa-esperanca-do-norte')
    await ready(page)
    await expect(cell(page, 'virada', 'b')).toContainText('—')
    await expect(page.getByText(/não tem o 2º turno de 2022: a virada fica sem valor/)).toBeVisible()
  })
})

test.describe('Cara a cara: sharing', () => {
  test('shares the picture and the link with the level and the places in it', async ({ page }) => {
    await open(page, REGIONS, 'files')
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    await page.getByRole('button', { name: 'Compartilhar o cara a cara' }).click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { __shares: unknown[] }).__shares.length)).toBe(1)
    const [s] = await page.evaluate(() => (window as unknown as { __shares: { files: string[]; text: string }[] }).__shares)
    expect(s!.files).toEqual(['voto-a-voto-cara-a-cara-regiao.png'])
    expect(s!.text).toContain(`https://votoavoto.exemplo.br${base}cara-a-cara/${REGIONS}`)
  })
})

test.describe('Cara a cara: modo duelo at 1920x1080', () => {
  test.use({ viewport: { width: 1920, height: 1080 }, isMobile: false, hasTouch: false })

  for (const [level, q] of [['cidade', CITIES], ['estado', STATES], ['regiao', REGIONS]] as const) {
    test(`${level}: opens from the card, same numbers, seal on screen, large type, Esc leaves; only the site's own files are requested`, async ({ page }) => {
      await open(page, q)
      await ready(page)
      const onPage = await page.locator('[data-duel] > [data-rows] [data-value]').allTextContents()
      const seen = collectRequests(page)
      await page.getByRole('button', { name: /Modo duelo/ }).first().click()
      const mode = page.locator('[data-duel-mode]')
      await expect(mode).toBeVisible()
      expect(new URL(page.url()).search).toContain('&modo=duelo')
      expect(await mode.locator('[data-value]').allTextContents()).toEqual(onPage.map((t) => t))
      // the seal is on screen, whole, inside the viewport
      const seal = mode.locator('[data-seal]')
      await expect(seal).toContainText('edição')
      const box = (await seal.boundingBox())!
      expect(box.y + box.height).toBeLessThanOrEqual(1080)
      expect(box.x).toBeGreaterThanOrEqual(0)
      // large type: the numbers are at least 80 px, the labels at least 18 px
      expect(await mode.locator('.duel-mode__number').first().evaluate((e) => Number.parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(80)
      expect(await mode.locator('.duel-mode__label').first().evaluate((e) => Number.parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(18)
      // nothing scrolls: the whole card fits the screen
      expect(await mode.evaluate((e) => e.scrollHeight <= e.clientHeight)).toBe(true)
      await page.keyboard.press('Escape')
      await expect(mode).toBeHidden()
      expect(new URL(page.url()).search).not.toContain('modo')
      expect(violations(seen, [new URL(page.url()).origin])).toEqual([])
      expect(seen.filter((r) => !/\.(css|js|woff2?)(\?|$)/.test(r.url))).toEqual([])
    })
  }

  test('the address with the mode opens straight into it', async ({ page }) => {
    await open(page, `${STATES}&modo=duelo`)
    await expect(page.locator('[data-duel-mode]')).toBeVisible()
    await expect(page.locator('[data-duel-mode] [data-seal]')).toContainText('votoavoto.exemplo.br')
  })
})

test('without JavaScript it says what it needs', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false })
  const page = await ctx.newPage()
  await page.goto(route(CITIES))
  await expect(page.locator('[data-nojs]')).toContainText('precisa de JavaScript')
  await ctx.close()
})

test.describe('E a sua cidade? (#39)', () => {
  test('from a shared head-to-head the button opens it with the sender\'s city in A and the search of B in focus; the reply shares back', async ({ page }) => {
    await open(page, CITIES, 'files')
    await ready(page)
    await page.getByRole('link', { name: 'E a sua cidade?' }).click()
    await expect.poll(() => new URL(page.url()).search).toBe('?nivel=cidade&a=rj/cidade-exemplo&resposta=1')
    await expect(page.getByText('Cidade Exemplo já está preenchida. Escolha a sua.')).toBeVisible()
    await expect(page.getByRole('combobox', { name: 'Cidade A' })).toHaveValue('Cidade Exemplo · RJ')
    await expect(page.getByRole('combobox', { name: 'Cidade B' })).toBeFocused()
    for (const key of ['comparecimento', 'margem', 'virada', 'naoVotaram']) await expect(cell(page, key, 'b')).toContainText('—')
    await page.keyboard.type('exemplo paulista')
    await page.locator('[data-place-option]', { hasText: 'Cidade Exemplo Paulista' }).click()
    await ready(page)
    expect(new URL(page.url()).search).toBe(CITIES)
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    await page.getByRole('button', { name: 'Compartilhar o cara a cara' }).click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { __shares: unknown[] }).__shares.length)).toBe(1)
    const [s] = await page.evaluate(() => (window as unknown as { __shares: { text: string }[] }).__shares)
    expect(s!.text).toContain(`${base}cara-a-cara/${CITIES}`)
  })

  test('Meu Brasil has the button too, with its first place as the sender\'s city', async ({ page }) => {
    await page.goto(`${base}meu-brasil/?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista`)
    await page.getByRole('link', { name: 'E a sua cidade?' }).click()
    await expect.poll(() => new URL(page.url()).search).toBe('?nivel=cidade&a=rj/cidade-exemplo&resposta=1')
    await expect(page.getByRole('combobox', { name: 'Cidade B' })).toBeFocused()
  })

  test('the button is not on the state or region cards, nor on an empty Meu Brasil', async ({ page }) => {
    await open(page, STATES)
    await ready(page)
    await expect(page.getByRole('link', { name: 'E a sua cidade?' })).toHaveCount(0)
    await page.goto(`${base}meu-brasil/`)
    await expect(page.getByRole('link', { name: 'E a sua cidade?' })).toHaveCount(0)
  })
})
