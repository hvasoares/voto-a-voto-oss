import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { activateSearch, base, expectNoHorizontalScroll, resizeTo, waitReady } from './helpers'

/*
 * #101: the "Comparar" chooser, a section of Home (#comparar) that leads to routes that already exist. Options that need a city ask for it
 * through the Home search with a destination (closed list, `para`), or go straight to the remembered city. Fixture: Boa Esperança do Norte
 * (mt) is the only city that matches "boa esperanca".
 */
const CITY = 'mt/boa-esperanca-do-norte'
const NEEDS_CITY = [
  ['Minha cidade em 2018, 2022 e 2026', 'tres-ciclos', `${CITY}/tres-ciclos/`, 'os três ciclos da cidade'],
  ['Duas cidades lado a lado', 'cara-a-cara', `cara-a-cara/?nivel=cidade&a=${CITY}`, 'o Cara a cara, com essa cidade'],
] as const
const STRAIGHT = [
  ['Dois estados ou duas regiões', 'cara-a-cara/?nivel=estado'],
  ['Meus lugares ao longo do tempo', 'meu-brasil/'],
  ['O mesmo estado nos três ciclos', 'tres-ciclos/mt/'],
] as const

async function ready(page: Page, path = base) {
  await page.goto(path)
  await waitReady(page)
  const notice = page.locator('[data-consent-continue]')
  if (await notice.isVisible()) await notice.click()
}
const chooser = (page: Page) => page.locator('#comparar')
const option = (page: Page, label: string) => chooser(page).getByRole('link', { name: new RegExp(label) })

async function pick(page: Page) {
  const box = await activateSearch(page)
  await expect(page.locator('[data-city-search="main"]')).toHaveAttribute('data-ready', 'search')
  await box.fill('boa esperanca')
  const hit = page.locator('a[data-position]')
  await expect(hit).toHaveCount(1)
  return hit
}

test.describe('the Comparar chooser', () => {
  test('the entry sits after Compartilhar and lists the five comparisons in the visitor\'s words', async ({ page }) => {
    await page.goto(base)
    const order = await page.locator('[data-tasks] > ul > li[data-task]').evaluateAll((els) => els.map((e) => e.getAttribute('data-task')))
    expect(order.slice(0, 3)).toEqual(['ver-cidade', 'compartilhar', 'comparar'])
    await expect(chooser(page).locator('> strong')).toHaveText('Comparar')
    await expect(chooser(page).getByText('O que você quer comparar?')).toBeVisible()
    const titles = await chooser(page).locator('ul strong').allTextContents()
    expect(titles).toEqual(['Minha cidade em 2018, 2022 e 2026', 'Duas cidades lado a lado', 'Dois estados ou duas regiões', 'Meus lugares ao longo do tempo', 'O mesmo estado nos três ciclos'])
    const text = (await chooser(page).innerText()).toLowerCase()
    for (const word of ['vencedor', 'ranking', 'quem ganhou', 'por que', 'venceu', 'à frente']) expect(text).not.toContain(word)
  })

  test('#comparar is an address on Home', async ({ page }) => {
    await page.goto(`${base}#comparar`)
    await expect(chooser(page)).toBeInViewport()
  })

  for (const [label, path] of STRAIGHT) {
    test(`${label}: opens ${path}`, async ({ page }) => {
      await ready(page)
      await option(page, label).click()
      await expect(page).toHaveURL(`${base}${path}`)
    })
  }

  test('"Dois estados ou duas regiões" opens the Cara a cara at the state level, with the level switch', async ({ page }) => {
    await ready(page)
    await option(page, 'Dois estados').click()
    await expect(page.locator('[data-duel]')).toHaveAttribute('data-level', 'estado')
    await expect(page.locator('.duel-levels [aria-pressed="true"]')).toHaveText(/estado/i)
  })

  test('Meu Brasil is reachable only through the chooser', async ({ page }) => {
    await page.goto(base)
    const links = await page.locator('main a[href$="meu-brasil/"]').evaluateAll((els) => els.map((e) => !!e.closest('#comparar')))
    expect(links).toEqual([true])
  })

  test('every comparison route stays reachable from Home by click', async ({ page }) => {
    for (const [label, path] of STRAIGHT) {
      await ready(page)
      await option(page, label).click()
      await expect(page).toHaveURL(`${base}${path}`)
    }
    for (const [label, para, target] of NEEDS_CITY) {
      await ready(page)
      await page.evaluate(() => localStorage.removeItem('voto-a-voto:place')) // the earlier pick remembered a city
      await page.reload()
      await waitReady(page)
      await option(page, label).click()
      await expect(page).toHaveURL(`${base}?para=${para}#busca`)
      await waitReady(page)
      await (await pick(page)).click()
      await expect(page).toHaveURL(`${base}${target}`)
    }
  })
})

test.describe('options that need a city ask for it through the search', () => {
  for (const [label, para, target, goes] of NEEDS_CITY) {
    test(`${label}: note, click and Enter land on the right page with the city filled in`, async ({ page }) => {
      await ready(page)
      await option(page, label).click()
      await waitReady(page)
      const hit = await pick(page)
      await expect(page.locator('[data-city-search="main"]')).toHaveAttribute('data-destination', para)
      await expect(page.locator('[data-destination-note]')).toHaveText(`Ao escolher a cidade, você vai direto para ${goes}.`)
      await expect(hit).toHaveAttribute('href', `${base}${target}`)
      await hit.click()
      await expect(page).toHaveURL(`${base}${target}`)
      await page.goBack()
      await page.reload()
      await waitReady(page)
      await pick(page)
      await page.keyboard.press('Enter')
      await expect(page).toHaveURL(`${base}${target}`)
    })

    test(`${label}: typing before the island has loaded keeps the destination`, async ({ page }) => {
      let release!: () => void
      const gate = new Promise<void>((resolve) => (release = resolve))
      await page.route(/CitySearch.*\.js/, async (route) => {
        await gate
        await route.continue()
      })
      await page.goto(`${base}?para=${para}#busca`)
      await waitReady(page)
      await page.getByRole('combobox', { name: 'Busque sua cidade' }).pressSequentially('boa esperanca', { delay: 0 })
      release()
      await expect(page.locator('[data-city-search="main"]')).toHaveAttribute('data-ready', 'search')
      const hit = page.locator('a[data-position]')
      await expect(hit).toHaveCount(1)
      await expect(hit).toHaveAttribute('href', `${base}${target}`)
    })
  }

  test('the Cara a cara opens with the chosen city as A', async ({ page }) => {
    await page.goto(`${base}?para=cara-a-cara#busca`)
    await (await pick(page)).click()
    await expect(page.getByRole('combobox', { name: 'Cidade A' })).toHaveValue('Boa Esperança do Norte · MT')
    await expect(page.getByRole('combobox', { name: 'Cidade B' })).toHaveValue('')
  })

  test('the three-cycle page opens for that city', async ({ page }) => {
    await page.goto(`${base}?para=tres-ciclos#busca`)
    await (await pick(page)).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Três ciclos' })).toBeVisible()
    await expect(page.locator('body')).toContainText('Boa Esperança do Norte')
  })

  for (const value of ['tres_ciclos', 'Tres-Ciclos', 'tres-ciclos/', 'cara-a-cara/?nivel=estado', 'cara_a_cara', 'https://example.org/', '//example.org', 'constructor']) {
    test(`a near-miss destination (${JSON.stringify(value)}) is ignored: the pick opens the card`, async ({ page }) => {
      await page.goto(`${base}?para=${encodeURIComponent(value)}`)
      const hit = await pick(page)
      await expect(page.locator('[data-destination-note]')).toHaveCount(0)
      await expect(hit).toHaveAttribute('href', `${base}${CITY}/`)
    })
  }
})

test.describe('the remembered city', () => {
  test('the needs-a-city options go straight to it, and forgetting restores the search links', async ({ page }) => {
    await page.goto(base)
    await waitReady(page)
    // Pick once through the search so the page itself saves the place.
    await page.goto(`${base}?para=compartilhar#busca`)
    await (await pick(page)).click()
    await expect(page).toHaveURL(new RegExp(`${CITY}/compartilhar/$`))
    await page.goto(base)
    await waitReady(page)
    await expect(option(page, 'Minha cidade em 2018')).toHaveAttribute('href', `${base}${CITY}/tres-ciclos/`)
    await expect(option(page, 'Duas cidades')).toHaveAttribute('href', `${base}cara-a-cara/?nivel=cidade&a=${CITY}`)
    await page.locator('[data-place-forget]').click()
    await expect(option(page, 'Minha cidade em 2018')).toHaveAttribute('href', `${base}?para=tres-ciclos#busca`)
    await expect(option(page, 'Duas cidades')).toHaveAttribute('href', `${base}?para=cara-a-cara#busca`)
  })
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('every option is a plain link; the ones that need a city lead to the search with its instruction', async ({ page }) => {
    await page.goto(base)
    await expect(chooser(page).getByRole('link')).toHaveCount(5)
    for (const [label, para] of NEEDS_CITY) await expect(option(page, label)).toHaveAttribute('href', `${base}?para=${para}#busca`)
    for (const [label, sub] of [['Minha cidade em 2018', 'Escolha a cidade'], ['Duas cidades', 'Escolha a primeira cidade']] as const) await expect(option(page, label)).toContainText(sub)
    for (const [label, path] of STRAIGHT) await expect(option(page, label)).toHaveAttribute('href', `${base}${path}`)
    await option(page, 'Meus lugares').click()
    await expect(page).toHaveURL(`${base}meu-brasil/`)
  })
})

test.describe('layout', () => {
  test('keyboard: the options follow the entry in reading order with a focus ring', async ({ page }) => {
    await ready(page)
    const links = chooser(page).getByRole('link')
    await links.first().focus()
    for (let i = 1; i < 5; i++) {
      await page.keyboard.press('Tab')
      await expect(links.nth(i)).toBeFocused()
    }
    expect(await links.nth(4).evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe('none')
  })

  test('every option is at least 44 px high', async ({ page }) => {
    await page.goto(base)
    for (const h of await chooser(page).locator('a').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44)
  })

  for (const width of [390, 768, 1440]) {
    test(`does not scroll sideways at ${width}`, async ({ page }) => {
      await resizeTo(page, width)
      await page.goto(base)
      await expectNoHorizontalScroll(page)
    })
  }

  test('axe finds no violations', async ({ page }) => {
    await page.goto(base)
    const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).disableRules(['target-size']).analyze()
    expect(violations.map((v) => v.id)).toEqual([])
  })
})
