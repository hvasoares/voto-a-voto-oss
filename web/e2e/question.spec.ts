import { expect, test, type Page } from '@playwright/test'
import { base, collectRequests, violations, waitReady } from './helpers'
import { PHONE, noJs } from './presets'

/*
 * Question before the answer (#44, the Sketch frame "2b Pergunta antes da resposta"), 390x844, fixture Cidade Exemplo:
 * the arc of the fixture city is "mudou de lado em 2022", so the question asks about 2022 and the right guess is "Sim".
 * The answer is in the page text; the guess is optional, kept in this browser only and never sent anywhere.
 */
const city = `${base}rj/cidade-exemplo/`
const KEY = 'voto-a-voto:guess'
/** The island of the guess is ready when its own attribute says so (never a timer). */
const ready = async (page: Page) => {
  await waitReady(page)
  await expect(page.locator('[data-question][data-guess-ready="true"]')).toHaveCount(1)
}

test.describe('city page: question before the answer', () => {
  test('the question and its answer are in the first screen, with no guess and with no scripts', async ({ browser }) => {
    const context = await browser.newContext({ ...noJs(), viewport: PHONE, locale: 'pt-BR' })
    const page = await context.newPage()
    await page.goto(`${city}?turno=1`)
    const q = page.locator('.city-q__q')
    await expect(q).toHaveText('Cidade Exemplo mudou de lado em 2022?')
    await expect(page.locator('.city-q__yn')).toHaveText('Sim.')
    await expect(page.locator('.city-arc__pill:visible')).toHaveText('Mudou de lado em 2022')
    for (const el of [q, page.locator('.city-arc__pill:visible')]) {
      const box = (await el.boundingBox())!
      expect(box.y + box.height).toBeLessThanOrEqual(844)
    }
    // no guess buttons without scripts: the answer needs none
    await expect(page.locator('.city-q__btn')).toHaveCount(0)
    await context.close()
  })

  test('with scripts the answer is where it was and the two buttons come before it', async ({ page }) => {
    await page.goto(`${city}?turno=1`)
    await ready(page)
    await expect(page.locator('.city-q__btn')).toHaveText(['Sim', 'Não'])
    await expect(page.locator('[data-question] > div:not(.city-arc) > .city-arc__note')).toHaveText('Palpite opcional · fica só no seu navegador')
    const order = await page.evaluate(() => [...document.querySelectorAll('.city-q__q, .city-q__btn, .city-arc')].map((e) => e.getBoundingClientRect().top))
    expect(order).toEqual([...order].sort((a, b) => a - b))
    const answer = (await page.locator('.city-arc').boundingBox())!
    expect(answer.y + answer.height).toBeLessThanOrEqual(844)
  })

  test('a right guess and a wrong one say what they matched, with no praise and no shame; the guess stays in this browser', async ({ page }) => {
    await page.goto(`${city}?turno=1`)
    await ready(page)
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await expect(page.locator('[data-question] .city-margin')).toHaveText('Palpite: Sim. Resposta: Sim. O palpite estava certo.')
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('{"rj/cidade-exemplo":"yes"}')
    await page.getByRole('button', { name: 'Não', exact: true }).click()
    await expect(page.locator('[data-question] .city-margin')).toHaveText('Palpite: Não. Resposta: Sim. O palpite estava errado.')
    await expect(page.getByRole('button', { name: 'Não', exact: true })).toHaveAttribute('aria-pressed', 'true')
    // the answer did not move or change
    await expect(page.locator('.city-arc__pill:visible')).toHaveText('Mudou de lado em 2022')
    // a reload remembers it; tapping the same button again takes it back
    await page.reload()
    await ready(page)
    await expect(page.getByRole('button', { name: 'Não', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'Não', exact: true }).click()
    await expect(page.locator('[data-question] .city-margin')).toBeHidden()
    expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('{}')
  })

  test('guessing sends nothing: no request after the first tap, and every request is a GET of the site itself', async ({ page, baseURL }) => {
    const seen = collectRequests(page)
    await page.goto(`${city}?turno=1`)
    await ready(page)
    await page.waitForLoadState('networkidle')
    const before = seen.length
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await expect(page.locator('[data-question] .city-margin')).toBeVisible()
    await page.getByRole('button', { name: 'Não', exact: true }).click()
    await page.waitForLoadState('networkidle')
    expect(seen.slice(before)).toEqual([])
    expect(violations(seen, [new URL(baseURL!).origin])).toEqual([])
    expect(seen.filter((r) => /\/data\//.test(r.url))).toEqual([])
  })

  test('with storage blocked the guess still works until the page closes, and nothing throws', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('blocked')
        },
      })
    })
    await page.goto(`${city}?turno=1`)
    await ready(page)
    await page.getByRole('button', { name: 'Sim', exact: true }).click()
    await expect(page.locator('[data-question] .city-margin')).toContainText('O palpite estava certo.')
    expect(errors).toEqual([])
  })

  test('a city with a missing cycle asks whether the results exist, and an overseas post asks in its own words', async ({ page }) => {
    await page.goto(`${base}mt/boa-esperanca-do-norte/`)
    await waitReady(page)
    await expect(page.locator('[data-question]')).toHaveAttribute('data-question', 'missing')
    await expect(page.locator('.city-q__q')).toHaveText('Há resultado do 2º turno de 2018 e 2022 em Boa Esperança do Norte?')
    await expect(page.locator('.city-q__yn')).toHaveText('Não.')
    await page.goto(`${base}zz/exterior-exemplo/`)
    await waitReady(page)
    await expect(page.locator('.city-q__q')).toHaveText(/^O voto no exterior em .+\?$/)
  })
})
