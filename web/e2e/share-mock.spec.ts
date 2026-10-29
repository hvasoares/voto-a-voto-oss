import { expect, type Page } from '@playwright/test'
import { base, maybeThrottleCpu } from './helpers'
import { notInstalled, test } from './share-mock'

/*
 * One test per mode of the share-sheet mock (#134), through the real share button of the demo route /compartilhar/
 * (fixture data, 390x844). The product's words below are the visible ones of ShareActions, never the mock's.
 */
const path = `${base}compartilhar/`
// #122 flake-hunt repeats: E2E_CPU_RATE slows the CPU of every page in this file.
test.beforeEach(async ({ page }) => maybeThrottleCpu(page))

const SIG = '137,80,78,71,13,10,26,10'
const shareButton = (page: Page) => page.getByRole('button', { name: 'Compartilhar' })

test.describe('share mock: the modes', () => {
  test('shares: one call carries the PNG, and the button hands it over inside the tap', async ({ page, share: mock }) => {
    await mock.install('shares')
    await page.goto(path)
    await mock.ready()
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    await shareButton(page).click()
    const calls = await mock.waitForCalls(1)
    expect(calls).toHaveLength(1)
    expect(calls[0]!.png?.signature).toBe(SIG)
    expect(calls[0]!.active).toBe(true)
    await expect(page.locator('[data-status]')).toHaveText('')
  })

  test('shares-text: files are refused by canShare and the text goes alone', async ({ page, share: mock }) => {
    await mock.install('shares-text')
    await page.goto(path)
    await mock.ready()
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    expect(await page.evaluate(() => navigator.canShare({ files: [new File(['x'], 'x.png', { type: 'image/png' })] }))).toBe(false)
    expect(await page.evaluate(() => navigator.canShare({ text: 'x' }))).toBe(true)
    await shareButton(page).click()
    const [call] = await mock.waitForCalls(1)
    expect(call!.files).toEqual([])
    expect(call!.text).toContain('Cidade Exemplo')
  })

  test('fails: one call is recorded and the product says the image was downloaded instead', async ({ page, share: mock }) => {
    await mock.install('fails')
    await page.goto(path)
    await mock.ready()
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    const download = page.waitForEvent('download')
    await shareButton(page).click()
    await download
    expect(await mock.waitForCalls(1)).toHaveLength(1)
    await expect(page.locator('[data-status]')).toContainText('A imagem foi baixada')
  })

  test('cancelled: one call is recorded and no error text appears', async ({ page, share: mock }) => {
    await mock.install('cancelled')
    await page.goto(path)
    await mock.ready()
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    await shareButton(page).click()
    expect(await mock.waitForCalls(1)).toHaveLength(1)
    await expect(page.locator('[data-status]')).toHaveText('')
    await expect(page.getByText('Não foi possível')).toHaveCount(0)
  })

  test('absent: nothing is recorded and the fallback actions (download, copy link) are offered', async ({ page, share: mock }) => {
    await mock.install('absent')
    await page.goto(path)
    await mock.ready()
    await expect(shareButton(page)).toBeHidden()
    await expect(page.getByRole('button', { name: 'Baixar imagem' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Copiar link' })).toBeVisible()
    expect(await mock.calls()).toEqual([])
  })
})

test.describe('share mock: persistence and readiness', () => {
  test('the recorded calls survive a navigation away and back; reset() empties them', async ({ page, share: mock }) => {
    await mock.install('shares')
    await page.goto(path)
    await mock.ready()
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    await shareButton(page).click()
    await mock.waitForCalls(1)
    await page.goto(base)
    await page.goto(path)
    await mock.ready()
    expect(await mock.calls()).toHaveLength(1)
    await page.reload()
    await mock.ready()
    expect(await mock.calls()).toHaveLength(1)
    await mock.reset()
    expect(await mock.calls()).toEqual([])
  })

  test('asking for the calls on a page the mock was not installed in fails by name, not by timeout', async ({ page, share: mock }) => {
    await page.goto(path)
    await mock.install('shares') // too late for this document: the init script only runs on the next one
    await expect(mock.calls()).rejects.toThrow(notInstalled('shares'))
    await expect(mock.calls()).rejects.toThrow('share mock not installed (mode shares)')
    await expect(mock.ready()).rejects.toThrow('share mock not installed (mode shares)')
  })
})
