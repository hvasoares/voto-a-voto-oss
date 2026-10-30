import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { useNoJs } from './presets'

/*
 * The calculation page as a stub plus a data file (private#214). The records and their figures are pinned by fatos.spec.ts, fatos-paginas.spec.ts and
 * fatos-relatorios.spec.ts; here the new parts: the stub says when its data arrived (`data-ready`), the fragment `#<medida>` resolves only after the records
 * are drawn (the record is lit by `:target` and scrolled into view), a missing file shows the failed state with a retry, the seal is the file's, the stub
 * stays noindex, and a visitor without scripts keeps the stub's sentence and the way back.
 */
const path = `${base}fato/rj/cidade-exemplo/2026-2/`
const DATA = /\/data\/v[0-9a-f]+\/fato\/rj\/cidade-exemplo\/2026-2\.json$/

test.describe('calculation stub: the page of a city', () => {
  test('loads its data file once, says ready and draws every record of the file', async ({ page }) => {
    const files: string[] = []
    page.on('request', (r) => DATA.test(new URL(r.url()).pathname) && files.push(r.url()))
    await page.goto(path)
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-ready', 'yes')
    expect(files).toHaveLength(1)
    await expect(page.locator('.fact')).toHaveCount(9)
    await expect(page.locator('[data-stub-area] [data-stub-loading]')).toHaveText('o cálculo dos números pronto.')
  })

  test('the fragment lights the record it names after the data arrives, and scrolls to it', async ({ page }) => {
    await page.goto(`${path}#margem`)
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('#margem:target')).toHaveCount(1)
    await expect(page.locator('#margem')).toBeInViewport()
    await expect(page.locator('#margem')).toHaveCSS('border-top-color', 'rgb(20, 80, 92)')
    // the blank page and this one: lighting the record added no history entry
    expect(await page.evaluate(() => history.length)).toBe(2)
  })

  test('an address with no fragment, or one that names no record, lights nothing and draws everything', async ({ page }) => {
    await page.goto(`${path}#nao-existe`)
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator(':target')).toHaveCount(0)
    await expect(page.locator('.fact')).toHaveCount(9)
  })

  test('draws the seal of the file, in the page, with the build\'s own lines', async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-ready', 'yes')
    const lines = await page.locator('[data-seal] li').allInnerTexts()
    expect(lines).toHaveLength(2)
    const file = await (await page.request.get((await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).find((n) => /\/fato\/.*\.json$/.test(n)))) ?? '')).json()
    expect(lines).toEqual(file.data.seal)
  })

  test('keeps its address and title, and asks not to be indexed', async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveTitle('Cálculo dos números · Cidade Exemplo · Voto a Voto')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/fato\/rj\/cidade-exemplo\/2026-2\/$/)
  })

  test('a missing data file shows the failed state with a retry, and the retry draws the records', async ({ page }) => {
    await page.route(DATA, (route) => route.fulfill({ status: 404, body: 'no' }))
    await page.goto(path)
    const area = page.locator('[data-stub-area]')
    await expect(area).toHaveAttribute('data-ready', 'no')
    await expect(area).toHaveAttribute('data-failed', /.*/)
    await expect(page.locator('[data-stub-back]')).toBeVisible()
    expect(await page.locator('.fact').count()).toBe(0)
    await page.unroute(DATA)
    await area.getByRole('button').click()
    await expect(area).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('.fact')).toHaveCount(9)
  })

  test('the way back steps back in history when the visitor came from the card, and is a plain link when opened directly', async ({ page }) => {
    await page.goto(`${base}rj/cidade-exemplo/?ciclo=2026&turno=2`)
    await page.locator('a.calc').click()
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-ready', 'yes')
    const length = await page.evaluate(() => history.length)
    await page.getByRole('link', { name: '‹ Cartão da cidade' }).click()
    await expect(page).toHaveURL(`${base}rj/cidade-exemplo/?ciclo=2026&turno=2`)
    expect(await page.evaluate(() => history.length)).toBe(length)
  })

  test.describe('without JavaScript', () => {
    useNoJs()
    test('says the page needs scripts, keeps the link back to the card, and carries no copy of the records', async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('[data-stub-needs-scripts]')).toContainText('JavaScript')
      await expect(page.locator('[data-stub-back]')).toHaveAttribute('href', `${base}rj/cidade-exemplo/?ciclo=2026&turno=2`)
      await expect(page.locator('.fact')).toHaveCount(0)
      await expect(page.locator('[data-seal]')).toHaveCount(0)
    })
  })
})
