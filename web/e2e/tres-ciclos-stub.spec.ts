import { expect, test } from '@playwright/test'
import { base } from './helpers'
import { useNoJs } from './presets'

/*
 * The city three-cycles page as a stub that reads the city shard (private#216). The panels, the switch and the replay are pinned by city-cycles.spec.ts and
 * replay.spec.ts; here the new parts: the stub reads the one shard the city card links (no file of its own) and says when it arrived (`data-ready`), a
 * missing file shows the failed state with a retry, the stub keeps its address, title and noindex, and a visitor without scripts keeps the stub's sentence and the link back.
 */
const path = `${base}rj/cidade-exemplo/tres-ciclos/`
const SHARD = /\/data\/v[0-9a-f]+\/city\/rj\/cidade-exemplo\.json$/
const OWN_FILE = /\/data\/v[0-9a-f]+\/tres-ciclos\//

test.describe('three-cycles stub: the city route', () => {
  test('loads the city shard once, writes no file of its own, says ready and draws both rounds', async ({ page }) => {
    const files: string[] = []
    page.on('request', (r) => (SHARD.test(new URL(r.url()).pathname) || OWN_FILE.test(new URL(r.url()).pathname)) && files.push(new URL(r.url()).pathname))
    await page.goto(path)
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-ready', 'yes')
    expect(files).toHaveLength(1)
    expect(files[0]).toMatch(SHARD)
    await expect(page.locator('.cycles__round')).toHaveCount(2)
    await expect(page.locator('.cycle')).toHaveCount(6)
    await expect(page.locator('[data-stub-area] [data-stub-loading]')).toHaveText('os três ciclos da cidade pronto.')
    await expect(page.locator('h1')).toHaveText('Três ciclos')
  })

  test('keeps its address and title, and asks not to be indexed', async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveTitle('Três ciclos · Cidade Exemplo · Voto a Voto')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/rj\/cidade-exemplo\/tres-ciclos\/$/)
  })

  test('a missing shard shows the failed state with a retry, and the retry draws the panels', async ({ page }) => {
    await page.route(SHARD, (route) => route.fulfill({ status: 404, body: 'no' }))
    await page.goto(path)
    const area = page.locator('[data-stub-area]')
    await expect(area).toHaveAttribute('data-ready', 'no')
    await expect(area).toHaveAttribute('data-failed', /.*/)
    await expect(page.locator('[data-stub-back]')).toBeVisible()
    await page.unroute(SHARD)
    await area.getByRole('button').click()
    await expect(area).toHaveAttribute('data-ready', 'yes')
    await expect(page.locator('.cycle')).toHaveCount(6)
  })

  test('the shard of another city is refused', async ({ page }) => {
    await page.route(SHARD, async (route) => {
      const other = await page.request.get(new URL(route.request().url()).pathname.replace('rj/cidade-exemplo', 'mt/boa-esperanca-do-norte'))
      await route.fulfill({ status: 200, body: await other.text() })
    })
    await page.goto(path)
    await expect(page.locator('[data-stub-area]')).toHaveAttribute('data-error', /wrong address/)
  })

  test.describe('without JavaScript', () => {
    useNoJs()
    test('says the page needs scripts and keeps the link back to the city card', async ({ page }) => {
      await page.goto(path)
      await expect(page.locator('[data-stub-needs-scripts]')).toContainText('JavaScript')
      await expect(page.locator('[data-stub-back]')).toHaveText('Cartão da cidade')
      await expect(page.locator('[data-stub-back]')).toHaveAttribute('href', `${base}rj/cidade-exemplo/`)
    })
  })
})
