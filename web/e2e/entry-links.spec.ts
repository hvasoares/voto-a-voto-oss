import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { base, expectNoHorizontalScroll, resizeTo, WIDTHS } from './helpers'

/*
 * Four small entry points (follow-up): "Abrir cartão" on the generator, "Baixar adesivo" on the Meu Brasil card, "Comparar com outro estado"
 * on the state page and "Comparar regiões" on Brasil e regiões. Each is one plain anchor (or the Meu Brasil button next to "Ver como história");
 * the specs pin the address (base-aware), the keyboard, the widths, axe, and that the destination opens in the expected state.
 */
const PLACES = '?mora=rj/cidade-exemplo&vota=sp/cidade-exemplo-paulista'

async function focusByKeyboard(page: Page, link: ReturnType<Page['locator']>) {
  for (let i = 0; i < 120; i++) {
    await page.keyboard.press('Tab')
    if (await link.evaluate((el) => el === document.activeElement)) break
  }
  await expect(link).toBeFocused()
  const ring = await link.evaluate((el) => {
    const s = getComputedStyle(el)
    return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'
  })
  expect(ring, 'a visible focus ring').toBe(true)
}

/** `scope`: the area around the link, when the rest of the page carries older axe findings that are not this follow-up's (listed in the checkpoint). */
async function checkPage(page: Page, link: ReturnType<Page['locator']>, scope?: string) {
  await focusByKeyboard(page, link)
  for (const w of WIDTHS) {
    await resizeTo(page, w)
    await expectNoHorizontalScroll(page)
  }
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).disableRules(['target-size'])
  const { violations } = await (scope ? builder.include(scope) : builder).analyze()
  expect(violations.map((v) => `${v.id} ${v.nodes.map((n) => n.target.join(' ')).join(',')}`)).toEqual([])
}

test.describe('Já tem um cartão? Abrir cartão ›', () => {
  const link = (page: Page) => page.getByRole('link', { name: 'Abrir cartão ›' })

  test('is under the generated cards, points at /abrir-cartao/, works by keyboard at every width, axe clean', async ({ page }) => {
    await page.goto(`${base}gerador/?cidade=rj/cidade-exemplo`)
    await page.waitForFunction(() => document.querySelector('[data-card-generator]')?.getAttribute('data-hydrated') === 'yes')
    await expect(page.locator('main')).toContainText('Já tem um cartão?')
    await expect(link(page)).toHaveAttribute('href', `${base}abrir-cartao/`)
    const [gen, a] = await Promise.all([page.locator('[data-card-generator]').boundingBox(), link(page).boundingBox()])
    expect(a!.y).toBeGreaterThanOrEqual(gen!.y + gen!.height - 1)
    await checkPage(page, link(page))
  })

  test('it opens the page where a dropped card file reopens its view', async ({ page }) => {
    await page.goto(`${base}gerador/`)
    await link(page).click()
    await expect(page).toHaveURL(`${base}abrir-cartao/`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false })
    test('is a plain anchor', async ({ page }) => {
      await page.goto(`${base}gerador/`)
      await expect(link(page)).toHaveAttribute('href', `${base}abrir-cartao/`)
    })
  })
})

test.describe('Baixar adesivo', () => {
  const button = (page: Page) => page.locator('[data-sticker-link]')
  const root = (page: Page) => page.locator('[data-meu-brasil]')

  test('is offered only once a place is drawn, next to "Ver como história", and carries the places on show', async ({ page }) => {
    await page.goto(`${base}meu-brasil/`)
    await page.waitForFunction(() => document.querySelector('[data-meu-brasil]'))
    await expect(root(page)).toHaveAttribute('data-drawn', '0')
    await expect(button(page)).toHaveCount(0)
    await page.goto(`${base}meu-brasil/${PLACES}`)
    await expect(root(page)).toHaveAttribute('data-drawn', '2')
    await expect(button(page)).toHaveText('Baixar adesivo')
    await expect(button(page)).toHaveAttribute('href', `${base}meu-brasil/adesivo/${PLACES}`)
    await expect(page.locator('[data-story-link]')).toHaveCount(1)
    const [story, sticker] = await Promise.all([page.locator('[data-story-link]').boundingBox(), button(page).boundingBox()])
    expect(sticker!.x).toBe(story!.x)
    expect(sticker!.width).toBe(story!.width)
  })

  test('follows the places on show when one is removed; with none drawn the button goes away', async ({ page }) => {
    await page.goto(`${base}meu-brasil/${PLACES}`)
    await expect(root(page)).toHaveAttribute('data-drawn', '2')
    await page.getByRole('button', { name: 'Remover onde vota' }).click()
    await expect(root(page)).toHaveAttribute('data-drawn', '1')
    await expect(button(page)).toHaveAttribute('href', `${base}meu-brasil/adesivo/?mora=rj/cidade-exemplo`)
    await page.getByRole('button', { name: 'Remover onde mora' }).click()
    await expect(root(page)).toHaveAttribute('data-drawn', '0')
    await expect(button(page)).toHaveCount(0)
  })

  test('opens the sticker page showing the sticker of the places in the address', async ({ page }) => {
    await page.goto(`${base}meu-brasil/${PLACES}`)
    await expect(root(page)).toHaveAttribute('data-drawn', '2')
    await button(page).click()
    await expect(page).toHaveURL(`${base}meu-brasil/adesivo/${PLACES}`)
    await expect(page.locator('[data-sticker-page]')).toHaveAttribute('data-places', '2')
    await expect(page.locator('[data-share-actions]')).toHaveAttribute('data-png', 'ready')
    await expect(page.getByRole('button', { name: 'Baixar adesivo (PNG)' })).toBeVisible()
  })

  test('keyboard focus ring, no sideways scroll at 390/768/1440, axe clean', async ({ page }) => {
    await page.goto(`${base}meu-brasil/${PLACES}`)
    await expect(root(page)).toHaveAttribute('data-drawn', '2')
    await checkPage(page, button(page))
  })
})

test.describe('Comparar com outro estado', () => {
  const link = (page: Page) => page.getByRole('link', { name: 'Comparar com outro estado ›' })

  test('is in the links of the state page and opens Cara a cara at the state level with the state as A', async ({ page }) => {
    await page.goto(`${base}rj/`)
    await expect(link(page)).toHaveAttribute('href', `${base}cara-a-cara/?nivel=estado&a=rj`)
    await expect(page.locator('.state-links')).toContainText('Comparar com outro estado')
    await checkPage(page, link(page), '.state-links')
    await link(page).click()
    await expect(page.locator('[data-duel]')).toBeVisible()
    await expect.poll(() => new URL(page.url()).search).toBe('?nivel=estado&a=rj')
    await expect(page.getByRole('combobox', { name: 'Estado A' })).toHaveValue('rj')
    await expect(page.getByRole('combobox', { name: 'Estado B' })).toHaveValue('')
    await expect(page.locator('[data-duel]')).toHaveAttribute('data-places', '1')
  })
})

test.describe('Comparar regiões', () => {
  const link = (page: Page) => page.getByRole('link', { name: 'Comparar regiões ›' })

  test('is in the links of Brasil e regiões and opens Cara a cara at the region level', async ({ page }) => {
    await page.goto(`${base}brasil/`)
    await expect(link(page)).toHaveAttribute('href', `${base}cara-a-cara/?nivel=regiao`)
    await checkPage(page, link(page), 'nav[aria-label="Próximo"]')
    await link(page).click()
    await expect(page.locator('[data-duel]')).toBeVisible()
    expect(new URL(page.url()).search).toBe('?nivel=regiao')
    await expect(page.locator('[data-duel]')).toHaveAttribute('data-places', '0')
    await expect(page.getByRole('button', { name: 'Região' })).toBeVisible()
  })
})

test.describe('code and data licences', () => {
  test('the data page states the MIT code and the CC BY 4.0 dataset with TSE attribution, side by side', async ({ page }) => {
    await page.goto(`${base}sobre-os-dados/`)
    const section = page.locator('#main section[aria-labelledby="licencas"]')
    await expect(section.getByRole('heading', { level: 2, name: 'Licenças do código e dos dados' })).toBeVisible()
    await expect(section).toContainText('Código: licença MIT')
    await expect(section).toContainText('Dados abertos: Creative Commons Atribuição 4.0 (CC BY 4.0)')
    await expect(section).toContainText('atribua a fonte (TSE) e o projeto')
    await expect(section.getByRole('link', { name: 'Creative Commons Atribuição 4.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/deed.pt-br')
    for (const w of WIDTHS) {
      await resizeTo(page, w)
      await expectNoHorizontalScroll(page)
    }
    const { violations } = await new AxeBuilder({ page }).include('section[aria-labelledby="licencas"]').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).disableRules(['target-size']).analyze()
    expect(violations.map((v) => v.id)).toEqual([])
  })
})
